#!/usr/bin/env python

from os import path
from docopt import docopt
import urllib.parse
import logging
import logging.config

from core.parser.csv_parser import CSVParser

"""
Data is stored separately for each machine in the cluster. One time series per machine is built.
Every time series has a fixed number of sampling intervals of 300 seconds, starting from a Google "genesis" time 
(i.e. 01/02/2011 00:00:00) and covering a month of cluster usage. Each sampling interval contains a mean of the 
resources consumption, the number of tasks and the number of unique jobs running on the machine during the sampling
interval. Data is then aggregated and sent to InfluxDB HTTP API in a JSON format.

Notes:
- BATCH_SIZE: InfluxDB can ingest a batch of points for every http request. The size of the batch can be configured,
but it can not exceed 10k due to InfluxDB limitations. Big sizes can lead to unexpected crashes.

Additional information: 
https://community.influxdata.com/t/what-is-the-highest-performance-method-of-getting-data-in-out-of-influxdb/464/5

- SKIP-FIRST: Useful if we restart the computation and we don't have the previous chunk of unprocessed data.
We need to restart from the previous file that precedes the one where the computation has stopped, because we don't 
have the last chunk of the previous of the previous, we must skip the first interval (assuming it has been already 
computed), otherwise we have inconsistent data for the first interval.

--processing--> ... [file i-1] --split-on-bottom--> [temp_chunk] <--merge-on-top-- [file i] ... --processing-->

temp_chunk contains the last interval of file i-1 and the first interval of file i
"""

__author__ = 'Matteo Bogo'
__license__ = 'GPL'
__version__ = '2.0.0'
__maintainer__ = 'Matteo Bogo'
__email__ = 'matteo.bogo@gmail.com'
__status__ = 'testing'

__doc__ = """CSV2Influx v.2.0.0

Usage:
    CSV2Influx <source_path> [--influxdb-url=<http://hostname:port>] [--auth=<USER:PASSWORD>] [--dbname=<dbname>] 
    [--cpu=<N_CPU>] [--batch-size=<SIZE>] [--skip-first] [--replace-strategy=<REPLACE_REMOVE|REPLACE_ONLY|NOTHING>]

Options:
    -h --help                       Show this screen
    --version                       Show version
    --influxdb-url=INFLUXDB_URL     The URL of InfluxDB Server          [default: http://localhost:8086]
    --auth=USER:PASSWORD            Authentication                      [default: user:password]
    --dbname=DB_NAME                The database name                   [default: test]
    --cpu=N_CPU                     Set the number of CPU used          [default: 4]
    --batch-size=SIZE               The size of a batch of points       [default: 10000]
    --skip-first                    Skip the first interval
    --replace-strategy=STRATEGY     Replace strategy of missing values  [default: REPLACE_REMOVE]
"""

max_batch_size = 10000
min_batch_size = 1


class CSV2Influx:

    def __init__(self,
                 path_csv,
                 batch_size,
                 host,
                 port,
                 user,
                 password,
                 dbname,
                 n_cpu,
                 skip_first,
                 replace_strategy):

        self.csv_parser = CSVParser(
            path_csv,
            batch_size,
            host,
            port,
            user,
            password,
            dbname,
            n_cpu=n_cpu,
            skip_first=skip_first,
            replace_strategy=replace_strategy)

        self.logger = logging.getLogger(__class__.__name__)
        self.logger.info(__class__.__name__ + "logger started")

    def run(self):

        try:

            self.csv_parser.start()
            self.csv_parser.join()

        except ConnectionError:
            raise
        except ValueError:
            raise


if __name__ == '__main__':

    args = docopt(__doc__, version='v.2.0.0')

    print(args)

    path_log_file = path.dirname(path.abspath(__file__)) + '/logs/logging.conf'
    logging.config.fileConfig(path_log_file)
    logger = logging.getLogger()
    logger.info("Log Initialized @" + path_log_file)

    url = urllib.parse.urlparse(args['--influxdb-url']).netloc.split(":")
    auth = args['--auth'].split(":")

    # batch size options
    batch_size = int(args['--batch-size'])

    if batch_size < min_batch_size or batch_size > max_batch_size:
        logger.error('Batch size must be between ' + str(min_batch_size) + ' and ' + str(max_batch_size))
        exit(1)

    csv2influx = CSV2Influx(
        args['<source_path>'],
        batch_size,
        url[0],
        url[1],
        auth[0],
        auth[1],
        args['--dbname'],
        args['--cpu'],
        args['--skip-first'],
        args['--replace-strategy'].upper())

    csv2influx.run()
