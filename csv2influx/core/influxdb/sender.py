import time
import numpy as np
from datetime import datetime
from datetime import timedelta
import logging

from core.influxdb.http_client import ClientInflux

"""
e.g. of json body accepted by InfluxDB

json_body = [
{
    "measurement": "cpu_load_short",
    "tags": {
        "host": "server01",
        "region": "us-west"
    },
    "time": "2009-11-10T23:00:00Z",
    "fields": {
        "value": 0.64
    }
}
"""

logger = logging.getLogger("csv2influx")

# google genesis time
genesis_time = datetime(
    year=2011,
    month=2,
    day=1,
    hour=0,
    minute=0,
    second=0,
    microsecond=0)


def timer(start, end):
    """
    Utility function for showing an interval of time.

    :param start: the start time of the interval
    :param end: the end time of the interval
    :return: a string contains the time elapsed from start to end in hh:mm:ss
    """
    hours, rem = divmod(end - start, 3600)
    minutes, seconds = divmod(rem, 60)
    return "{:0>2}:{:0>2}:{:05.2f}".format(int(hours), int(minutes), seconds)


def process_data(
        queue,
        batch_size=10000,
        host='localhost',
        port=8086,
        user='user',
        password='password',
        dbname='test'):
    """
    Establishes a connection to the database server, processes data received from the queue and builds a JSON that
    will be sent to the HTTP API exposed by the database, according to the InfluxDB guidelines.

    :param queue: the queue from where data is taken
    :param batch_size: the size of the batch, i.e. the number of points sent per HTTP Request
    :param host: the hostname of the InfluxDB server
    :param port: the port where InfluxDB is exposed
    :param user: the username used for authentication
    :param password: the password used for authentication
    :param dbname: the name of the database
    :return:
    """

    def build_json(df, client):
        """
        Builds a JSON conforming the InfluxDB guidelines and sends it to the HTTP API exposed by the database.

        :param df: the dataframe from where the data is estracted
        :param client: the client used for sending data to InfluxDB
        :return:
        """

        try:

            measurements = []
            i = 0
            for index, row in df.iterrows():

                # compute timestamp
                timestamp = (genesis_time + timedelta(microseconds=row['end_time'])).strftime(
                    '%Y-%m-%dT%H:%M:%S.%fZ')

                # resources
                mean_cpu_usage_rate = np.around(row['mean_cpu_usage_rate'], decimals=6)
                canonical_memory_usage = np.around(row['canonical_memory_usage'], decimals=6)
                assigned_memory_usage = np.around(row['assigned_memory_usage'], decimals=6)
                unmapped_page_cache_memory_usage = np.around(row['unmapped_page_cache_memory_usage'], decimals=6)
                total_page_cache_memory_usage = np.around(row['total_page_cache_memory_usage'], decimals=6)
                maximum_memory_usage = np.around(row['maximum_memory_usage'], decimals=6)
                mean_disk_io_time = np.around(row['mean_disk_io_time'], decimals=6)
                mean_local_disk_space_used = np.around(row['mean_local_disk_space_used'], decimals=6)
                maximum_cpu_usage = np.around(row['maximum_cpu_usage'], decimals=6)
                maximum_disk_io_time = np.around(row['maximum_disk_io_time'], decimals=6)
                cycle_per_instruction = np.around(row['cycle_per_instruction'], decimals=6)
                memory_accesses_per_instruction = np.around(row['memory_accesses_per_instruction'], decimals=6)

                machine_id = int(row['machine_id'])

                # build JSON
                body = {
                    'measurement': 'resource_usage_' + str(machine_id),
                    'time': timestamp,
                    'fields': {
                        'n_jobs': int(row['n_jobs']),
                        'n_tasks': int(row['n_tasks']),
                        'mean_cpu_usage_rate': mean_cpu_usage_rate,
                        'canonical_memory_usage': canonical_memory_usage,
                        'assigned_memory_usage': assigned_memory_usage,
                        'unmapped_page_cache_memory_usage': unmapped_page_cache_memory_usage,
                        'total_page_cache_memory_usage': total_page_cache_memory_usage,
                        'maximum_memory_usage': maximum_memory_usage,
                        'mean_disk_io_time': mean_disk_io_time,
                        'mean_local_disk_space_used': mean_local_disk_space_used,
                        'maximum_cpu_usage': maximum_cpu_usage,
                        'maximum_disk_io_time': maximum_disk_io_time,
                        'cycle_per_instruction': cycle_per_instruction,
                        'memory_accesses_per_instruction': memory_accesses_per_instruction,
                    },
                    'tags': {}
                }

                measurements.append(body)
                i += 1

                # batch
                if i % batch_size == 0:
                    client.write_data(measurements)
                    measurements = []

            if not measurements:
                client.write_data(measurements)

        except ValueError:
            raise

    # start
    client = None
    try:

        client = ClientInflux(
            host,
            port,
            user,
            password,
            dbname)

        client.init_connection()

        total_points_sent = 0
        start = time.time()
        while True:

            item = queue.get()

            if item is not None:  # invalid item arrives when a shutdown is in progress

                size = len(item)
                stage_time = time.time()

                # build json
                build_json(item, client)
                logger.info('Client sent ' + str(size) + ' points in ' + timer(stage_time, time.time()))

                queue.task_done()
                total_points_sent = + len(item)

            else:
                logger.info('Client closed - sent ' + str(total_points_sent) + ' points in ' + timer(start, time.time()))
                break

    except Exception:
        logger.info('Unexpected Error')
        raise
    finally:
        client.close()