import threading
import multiprocessing as mp
import pandas as pd
import os
import logging
import time

from functools import reduce
import shutil

from core.influxdb.sender import process_data
from core.influxdb.sender import timer

"""
Google Cluster Data - Resource Usage Measurements in 1 month (02/2011)

Metrics:

1. start time​ of the measurement period
2. end time​ of the measurement period
3. job ID
4. task index
5. machine ID
6. mean CPU usage rate
7. canonical memory usage
8. assigned memory usage
9. unmapped page cache memory usage
10.total page cache memory usage
11.maximum memory usage
12.mean disk I/O time
13.mean local disk space used
14.maximum CPU usage
15.maximum disk IO time
16.cycles per instruction (CPI) 
17.memory accesses per instruction (MAI)
18.sample portion                                                       (REMOVED)
19.aggregation type (1 if maximums from subcontainers were summed)      (REMOVED)
20.sampled CPU usage: mean CPU usage during a random 1s sample in the   (REMOVED)
measurement period ​ (only in v2.1 and later)

- Timestamps are in microseconds (i.e. 1 second =  1x10^6 microsecond)
- Max measurement length interval is 300 seconds (i.e. 300x10^6 microseconds)
- Timestamps start from 600 seconds and end at 2506200000000 seconds (i.e. after ~29 days)
"""

_PATH_TEMP_DATA = 'temp/'

class CSVParser(threading.Thread):

    def __init__(self,
                 path_csv,
                 batch_size,
                 host,
                 port,
                 user,
                 password,
                 dbname,
                 n_cpu=4,
                 skip_first=False,
                 replace_strategy='REPLACE_REMOVE'):

        super(CSVParser, self).__init__()

        self.path_csv = path_csv
        self.batch_size = batch_size
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.dbname = dbname

        self.n_cpu = int(n_cpu)

        self.skip_first = skip_first
        self.replace_stategy = replace_strategy

        self.current_start_time = 600000000
        self.current_end_time = 900000000
        self.interval_width = 300000000

        self.pool = None
        self.queue = None

        self.logger = logging.getLogger(__class__.__name__)
        self.logger.info(__class__.__name__ + "logger started")

    def load_csv(self, file):
        """
        Load a CSV in a Pandas dataframe.
        :param file: the file .csv
        :return: the dataframe loaded from .csv
        """

        try:

            if 'csv' not in file.split("."):
                raise ValueError('only .csv files are allowed')

            self.logger.info('Start parsing file: ' + file)
            return pd.read_csv(
                self.path_csv + '/' + file,
                usecols=[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
                names=[
                    "start_time",
                    "end_time",
                    "job_id",
                    "task_index",
                    "machine_id",
                    "mean_cpu_usage_rate",
                    "canonical_memory_usage",
                    "assigned_memory_usage",
                    "unmapped_page_cache_memory_usage",
                    "total_page_cache_memory_usage",
                    "maximum_memory_usage",
                    "mean_disk_io_time",
                    "mean_local_disk_space_used",
                    "maximum_cpu_usage",
                    "maximum_disk_io_time",
                    "cycle_per_instruction",
                    "memory_accesses_per_instruction"
                ])

        except ValueError:
            raise

    def remove_replace_missing(self, df):
        """
        Remove measurements with missing values, after replacing NaN of Disk IO, Cycles, and Memory accesses.
        :param df: the dataframe to be cleaned
        :return: the dataframe free of missing values
        """

        self.logger.info('Replace Strategy: [' + self.replace_stategy + ']')

        if self.replace_stategy == 'REPLACE_REMOVE':

            # replacing NaN of Disk I/O attributes
            self.logger.info('Replacing NaN of [Mean Disk I/O time] and [Maximum Disk I/O time]')
            df['mean_disk_io_time'].fillna(0, inplace=True)
            df['maximum_disk_io_time'].fillna(0, inplace=True)
            self.logger.info('Replacing NaN of [cycle_per_instruction] and [memory_accesses_per_instruction]')
            df['cycle_per_instruction'].fillna(0, inplace=True)
            df['memory_accesses_per_instruction'].fillna(0, inplace=True)

            # remove rows with missing values
            self.logger.info('Removing missing values')
            df.dropna(inplace=True)
            df.reset_index(drop=True, inplace=True)

        elif self.replace_stategy == 'REPLACE_ONLY':

            self.logger.info('Replacing NaN values with 0 - no lines are removed')
            df.fillna(0, inplace=True)

        elif self.replace_stategy == 'NOTHING':

            self.logger.info('Missing values not replaced')

        else:
            raise ValueError('Replace strategy unrecognized: [' + self.replace_stategy + ']')

        return df

    def aggregation(self, df, start_time, end_time):
        """
        Aggregate measurements of same machine.
        :param df: the dataframe to be aggregated
        :param start_time: the start time of the fixed interval
        :param end_time: the end time of the fixed interval
        :return: the dataframe aggregated
        """

        try:

            if df is not None:

                # compute the mean of resources usage of same tasks
                df_mean_tasks = df.groupby(['machine_id', 'job_id', 'task_index']).mean().reset_index()

                # compute the number of unique tasks running
                df_unique_tasks = df_mean_tasks.groupby(['machine_id']).size().reset_index(name='n_tasks')

                # compute the number of unique jobs running
                df_unique_jobs = df_mean_tasks.groupby(['machine_id'])['job_id'].nunique().reset_index(name='n_jobs')

                # compute the aggregation, summing all resources consumption
                df_resources = df_mean_tasks.groupby('machine_id').mean().reset_index()

                # replace start/end interval
                df_resources['start_time'] = df_resources['start_time'].apply(lambda x: start_time)
                df_resources['end_time'] = df_resources['end_time'].apply(lambda x: end_time)

                # drop unnecessary attributes
                df_resources.drop(['task_index', 'job_id'], axis=1, inplace=True)

                # aggregation
                dfs = [df_unique_tasks, df_unique_jobs, df_resources]
                df = reduce(lambda left, right: pd.merge(left, right, on=['machine_id']), dfs)

            return df

        except ValueError:
            self.logger.exception('Unexpected Error: ')
            raise

    @staticmethod
    def filecounter(path):
        """
        Counts the number of files in the current folder.
        :param path: the path of the folder
        :return: the number of files in the folder
        """

        return len([f for f in os.listdir(path) if os.path.isfile(f)])

    def load_tmp_not_processed_data(self):
        """
        Load a dataframe from the file of the last chunk of unprocessed data from the temporary folder.
        :return: a tuple that contains the dataframe loaded and the name of the file
        """

        try:

            result = None, None

            if os.path.exists(_PATH_TEMP_DATA):

                found_file = None
                for file in os.listdir(_PATH_TEMP_DATA):
                    if 'last_chunk_' in file:
                        found_file = file
                        break

                if found_file is not None:

                    result = pd.read_csv(_PATH_TEMP_DATA + found_file), found_file

            return result

        except Exception:
            self.logger.exception('Unexpected Error: ')
            raise

    def save_not_processed_data(self, df, file):
        """
        Stores the last chunk of unprocessed data in a specified CSV file.
        :param df: the dataframe to be stored as CSV file
        :param file: the file name
        :return:
        """

        try:

            if not os.path.exists(_PATH_TEMP_DATA):
                os.makedirs(_PATH_TEMP_DATA)

            not_processed_file = _PATH_TEMP_DATA + file
            df.to_csv(not_processed_file, encoding='utf-8', index=False)
            self.logger.info('Saved ' + not_processed_file)

        except Exception:
            self.logger.exception('Unexpected Error:')
            raise

    def remove_tmp_data(self, file):
        """
        Removes the file of the last chunk of unprocessed data in the temporary folder.
        :param file: the file to be removed
        :return:
        """

        try:

            if os.path.exists(_PATH_TEMP_DATA):
                tmp_path = _PATH_TEMP_DATA + file
                os.remove(tmp_path)
                self.logger.info('Removed ' + tmp_path)

        except Exception:
            self.logger.exception('Unexpected Error: ')
            raise

    def close_application(self):
        """
        Closes the application.
        :return:
        """

        try:

            if self.queue is not None and self.pool is not None:

                # stop processes
                for cpu in range(self.n_cpu):
                    self.queue.put(None)

                self.pool.close()
                self.pool.join()
                exit(1)

        except Exception:
            self.logger.exception('Unexpected Error: ')
            raise

    def run(self):

        self.queue = mp.JoinableQueue(maxsize=0)
        self.pool = mp.Pool(self.n_cpu,
                       process_data,
                       (self.queue,
                        self.batch_size,
                        self.host,
                        self.port,
                        self.user,
                        self.password,
                        self.dbname))

        try:

            n_files = self.filecounter(self.path_csv)
            self.logger.info('Start parsing' + str(n_files) + ' .csv in ' + self.path_csv)

            total_lines_loaded = 0
            aggregated_lines = 0
            n_rows_not_processed = 0

            df_not_processed = None

            time.sleep(1)

            # check temp folder
            if os.path.exists(_PATH_TEMP_DATA):
                onlyfiles = [f for f in os.listdir(_PATH_TEMP_DATA) if os.path.isfile(os.path.join(_PATH_TEMP_DATA, f))]
                if len(onlyfiles) > 0:

                    print('\n### TEMPORARY DATA FOUND ###\n')
                    [print(f + '\n') for f in onlyfiles]

                    answer = ''
                    while answer != 'YES' and answer != 'NO':

                        answer = input(
                            'WARNING!\n' +
                            'Found some temporary files in /temp folder, if these files do not match the current ' +
                            'computation is better to delete the entire folder.\n'
                            'Otherwise just say yes to continue, no to exit. [yes|no]: ')

                        answer = answer.upper()

                    if answer == 'NO':
                        self.logger.info('Application closed by user')
                        self.close_application()

            #
            compute_time_start = time.time()
            for current_file in sorted(os.listdir(self.path_csv)):

                # load new .csv file
                df = self.load_csv(current_file)
                df = self.remove_replace_missing(df)
                n_rows = df.shape[0]

                # load temp data of previous .csv file
                df_not_processed, file_not_processed = self.load_tmp_not_processed_data()

                if df_not_processed is not None:

                    self.logger.info('Found previous unprocessed chunk of data: ' + file_not_processed)
                    self.logger.info('Merging last chunk of previous file with current file')

                    n_rows_not_processed = df_not_processed.shape[0]
                    df = pd.concat([df_not_processed, df], axis=0, ignore_index=True, sort=False)

                    n_rows += n_rows_not_processed

                # check empty dataframes
                if df is None or df.shape[0] == 0:
                    self.logger.info('No points to process')
                    continue

                # start aggregation
                self.logger.info('Analysing {0} + {1} (previous) points'.format(n_rows, n_rows_not_processed))
                total_lines_loaded += n_rows

                # divide data in chunks of fixed interval
                max_start_time = df['start_time'].max()
                df_chunks = []
                while max_start_time > (self.current_end_time - 1000000):

                    df_sliced = df[(df.start_time >= self.current_start_time) &
                                    (df.start_time < self.current_end_time)]

                    # calibrating time
                    if df_sliced.shape[0] > 0:

                        # skip first interval
                        # Useful if we restart the computation and we don't have the previous chunk of unprocessed data.
                        # We need to restart from the previous file that precedes the one where the computation
                        # has stopped, because we don't have the last chunk of the previous of the previous, we
                        # must skip the first interval (assuming it has been already computed), otherwise we have
                        # inconsistent data for the first interval.
                        if self.skip_first:

                            self.logger.info('Skipping interval [{0} - {1}]'.format(
                                self.current_start_time,
                                self.current_end_time))

                            self.current_start_time += self.interval_width
                            self.current_end_time += self.interval_width
                            self.skip_first = False

                            continue

                        # aggregate
                        df_sliced = self.aggregation(df_sliced, self.current_start_time, self.current_end_time)
                        aggregated_lines += df_sliced.shape[0]
                        df_chunks.append(df_sliced)

                    self.current_start_time += self.interval_width
                    self.current_end_time += self.interval_width

                # send data
                [self.queue.put(x) for x in df_chunks]
                self.logger.info('Waiting while points are sent through the network')
                self.queue.join()

                time.sleep(1)

                # save the last chunk of unprocessed data (will be merged in the next file)
                # In the last chunk there are some measurements that share interval with the measurements contained
                # in the next file. Otherwise, we aggregate 2 chunks that share the same interval, rather than one.
                df_not_processed = df[(df.start_time >= self.current_start_time)]

                # remove previous chunk of tmp data
                if file_not_processed is not None:
                    self.remove_tmp_data(file_not_processed)

                time.sleep(1)

                # save a chunk of the current unprocessed data
                file_not_processed = 'last_chunk_' + current_file
                self.save_not_processed_data(df_not_processed, file_not_processed)

                self.logger.info('Remaining {0} points (will be processed next iteration)'
                                 .format(df_not_processed.shape[0]))

                time.sleep(1)

            # computation end
            answer = ''
            while answer != 'YES' and answer != 'NO':
                answer = input('Computation end, are there other files to be computed? [yes|no]: ')
                answer = answer.upper()

            if answer == 'NO':

                # compute the last chunk
                df_not_processed, file_not_processed = self.load_tmp_not_processed_data()
                if df_not_processed is not None:

                    self.logger.info('Processing ' + file_not_processed)
                    df_not_processed = self.aggregation(df_not_processed, self.current_start_time, self.current_end_time)
                    aggregated_lines += df_not_processed.shape[0]

                    self.queue.put(df_not_processed)
                    self.queue.join()

                self.logger.info('Delete temporary files')
                shutil.rmtree(_PATH_TEMP_DATA)

            self.logger.info('Loading data ended in ' + timer(time.time(), compute_time_start) + ' \n'
                '#analyzed points: {0} \n #aggregated points: {1}'
                .format(
                    total_lines_loaded,
                    aggregated_lines))

        except ValueError:
            self.logger.exception('Unexpected Error: ')
            raise
        else:
            self.logger.info("Parsing ended")
        finally:
            self.close_application()
