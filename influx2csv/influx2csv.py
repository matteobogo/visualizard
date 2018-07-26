#!/usr/bin/env python

from influxdb import InfluxDBClient
from docopt import docopt
import urllib.parse
import os
import shutil
import json
import csv
import logging
import logging.config

"""
Points in a interval of time [start_ts, end_ts] of all the time series over an X database with a Y policy hosted
at http://user:password@hostname:port are queried through the InfluxDB HTTP API and stored in separated .CSV files.
"""

__author__ = 'Matteo Bogo'
__license__ = 'GPL'
__version__ = '0.0.1'
__maintainer__ = 'Matteo Bogo'
__email__ = 'matteo.bogo@gmail.com'
__status__ = 'testing'

__doc__ = """Influx2CSV v.0.0.1

Usage:
    Influx2CSV [--influxdb-url=<http://hostname:port>] [--auth=<USER:PASSWORD>] [--dbname=<dbname>] 
    [--policy=<POLICY>] [--start-timestamp=<START_TS>] [--end-timestamp=<END_TS>]

Options:
    -h --help
    --version
    --influxdb-url=INFLUXDB_URL     The URL of InfluxDB Server          [default: http://localhost:8086]
    --auth=USER:PASSWORD            Authentication                      [default: user:password]
    --dbname=DB_NAME                The database name                   [default: google_cluster]
    --policy=POLICY                 The database policy used            [default: autogen]
    --start-timestamp=START_TS      The start timestamp (UTC)           [default: 2011-02-01T00:15:00Z]
    --end-timestamp=END_TS          The end timestamp (UTC)             [default: 2011-03-01T10:55:00.000Z]
"""

_PATH_TEMP_DATA = 'data/'


class Influx2CSV:

    def __init__(self,
                 host,
                 port,
                 user,
                 password,
                 dbname,
                 policy,
                 start_timestamp,
                 end_timestamp):

        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.dbname = dbname
        self.policy = policy
        self.start_timestamp = start_timestamp
        self.end_timestamp = end_timestamp

        self.client = None

        self.logger = logging.getLogger(__class__.__name__)
        self.logger.info(__class__.__name__ + "logger started")

    def init_connection(self):

        try:

            self.client = InfluxDBClient(
                self.host,
                self.port,
                self.user,
                self.password,
                self.dbname)

            self.logger.info(
                "Connection to InfluxDB " + self.user +
                "@" + self.host + ":" + str(self.port) + " successful")

        except ConnectionError:
            self.logger.info("InfluxDB " + self.user + "@" + self.host + ":" + str(self.port) + " unreachable")
            raise

        except ValueError:
            self.logger.info("Unexpected Error: ")
            raise

    def init_temporary(self):

        try:

            if os.path.exists(_PATH_TEMP_DATA):
                self.logger.info('removing previous temporary data')
                shutil.rmtree(_PATH_TEMP_DATA)

            os.makedirs(_PATH_TEMP_DATA)
            self.logger.info('temporary data created')

        except ValueError:
            self.logger.info("failed to create temporary data")
            raise

    def run(self):

        try:

            self.logger.info('Connecting to InfluxDB..')
            self.init_connection()
            self.init_temporary()

            self.logger.info('Obtaining measurements..')
            measurements = self.client.get_list_measurements()

            if len(measurements) == 0:
                raise ValueError('No measurements on database')

            self.logger.info('Start processing points..')
            for measurement in measurements:

                # get measurement name
                parsed_measurement = json.loads(json.dumps(measurement))
                measurement_name = parsed_measurement['name']

                # get points
                query = 'SELECT * FROM ' + self.dbname + '.' + self.policy + '.' + measurement_name + ' WHERE time >= ' + \
                        "'" + self.start_timestamp + "'" + ' AND time <= ' + "'" + self.end_timestamp + "'"
                result = self.client.query(query)
                points = result.get_points()

                # write to .csv
                with open(_PATH_TEMP_DATA + measurement_name + '.csv', 'w') as output_csv:
                    writer = csv.writer(output_csv)
                    header = False
                    for point in points:
                        if header is False:
                            writer.writerow(point.keys())
                            header = True

                        writer.writerow(point.values())

            self.logger.info('Building CSVs completed, you can find files in ' + _PATH_TEMP_DATA)

        except ConnectionError:
            raise
        except ValueError:
            raise
        finally:
            self.client.close()
            exit(0)


if __name__ == '__main__':

    args = docopt(__doc__, version='v.0.0.1')

    path_log_file = os.path.dirname(os.path.abspath(__file__)) + '/logs/logging.conf'
    logging.config.fileConfig(path_log_file)
    logger = logging.getLogger()
    logger.info("Log Initialized @" + path_log_file)

    url = urllib.parse.urlparse(args['--influxdb-url']).netloc.split(":")
    auth = args['--auth'].split(":")

    influx2csv = Influx2CSV(
        url[0],
        url[1],
        auth[0],
        auth[1],
        args['--dbname'],
        args['--policy'],
        args['--start-timestamp'],
        args['--end-timestamp']
    )

    influx2csv.run()
