#!/usr/bin/env python

import pandas as pd
import os
import time
from docopt import docopt
import logging
import logging.config
import gc

__author__ = 'Matteo Bogo'
__license__ = 'GPL'
__version__ = '0.0.1'
__maintainer__ = 'Matteo Bogo'
__email__ = 'matteo.bogo@gmail.com'
__status__ = 'testing'

__doc__ = """analyzer v.0.0.1

Usage:
    analyzer <source_path> [--dimensions] [--time-intervals] [--machines] [--jobs]

Options:
    -h --help                       Show this screen.
    --version                       Show version.
    --dimensions                    Show dimensions.
    --time-intervals                Analyze time intervals.
    --machines                      Analyze machines.
    --jobs                          Analyze jobs.
"""

"""
Google Cluster Data - Resource Usage Measurements in 1 month (02/2011)

Metrics:

1. start time​ of the measurement period (REMOVED)
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
18.sample portion (REMOVED)
19.aggregation type (1 if maximums from subcontainers were summed) (REMOVED)
20.sampled CPU usage: mean CPU usage during a random 1s sample in the (REMOVED)
measurement period ​ (only in v2.1 and later)

- Timestamps are in microseconds (i.e. 1 second =  1x10^6 microsecond)
- Max measurement length interval is 300 seconds (i.e. 300x10^6 microseconds)
- Timestamps start from 600 seconds and end at 2506200000000 seconds (i.e. after ~29 days)
"""


class Analyzer:

    def __init__(self, source):

        self.source = source
        self.current_df = None

        self.logger = logging.getLogger(__class__.__name__)
        self.logger.info(__class__.__name__ + "logger started")

    def set_current_csv(self, filename):
        self.current_df = pd.read_csv(
            self.source+'/'+filename,
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
                "memory_accesses_per_instruction",
                "sample_portion",
                "aggregation_type",
                "sampled_cpu_usage"
            ])

    def dimensions(self):

        return self.current_df.shape

    def unique_time_intervals(self):

        return self.current_df['end_time'].value_counts().to_dict()

    def unique_machine_ids(self):

        return self.current_df['machine_id'].value_counts().to_dict()

    def unique_jobs(self):

        return self.current_df['job_id'].value_counts().to_dict()


if __name__ == '__main__':

    args = docopt(__doc__, version='v.0.0.1')

    #
    print(args)

    # logging
    path_log_file = os.path.dirname(os.path.abspath(__file__)) + '/logs/logging.conf'
    logging.config.fileConfig(path_log_file)
    logger = logging.getLogger()
    logger.info("Log Initialized @" + path_log_file)

    # if no options, do all tasks
    no_options = True
    for k,v in args.items():
        if v is True:
            no_options = False

    source_path = args['<source_path>']
    if os.path.exists(source_path):

        analyzer = Analyzer(source_path)
        report = {'number of rows: ': 'Not Analyzed',
                  'number of intervals: ': 'Not Analyzed',
                  'number of machines: ': 'Not Analyzed',
                  'number of jobs: ': 'Not Analyzed'}

        total_rows = 0
        total_intervals_dict = dict()
        total_machines_dict = dict()
        total_jobs_dict = dict()
        for file in sorted(os.listdir(source_path)):

            try:

                # check .csv
                if 'csv' not in file.split("."):
                    raise ValueError('only .csv files are allowed')

                # set current file for analysis
                logger.info('Analyzing '+file)
                analyzer.set_current_csv(file)

                # dimensions
                if args['--dimensions'] or no_options:
                    total_rows += analyzer.dimensions()[0]

                    report['number of rows: '] = total_rows

                # analyze unique time intervals
                if args['--time-intervals'] or no_options:
                    intervals = analyzer.unique_time_intervals()
                    for interval in intervals:
                        total_intervals_dict[interval] = total_intervals_dict.get(interval, 0) + 1

                    report['number of intervals: '] = len(total_intervals_dict)

                if args['--machines'] or no_options:
                    machines = analyzer.unique_machine_ids()
                    for machine in machines:
                        total_machines_dict[machine] = total_machines_dict.get(machine, 0) + 1

                    report['number of machines: '] = len(total_machines_dict)

                if args['--jobs'] or no_options:
                    jobs = analyzer.unique_jobs()
                    for job in jobs:
                        total_jobs_dict[job] = total_jobs_dict.get(job, 0) + 1

                    report['number of jobs: '] = len(total_jobs_dict)

                analyzer.current_df = None
                gc.collect()

                time.sleep(1)

            except ValueError:
                logger.exception('Unexpected Error: ')
                raise

        logger.info('Analysis Report -----------------------------------')
        for k,v in report.items():
            logger.info(k+str(report[k]))
        logger.info('---------------------------------------------------')

























