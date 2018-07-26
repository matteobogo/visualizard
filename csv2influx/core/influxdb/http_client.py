from influxdb import InfluxDBClient
import logging


class ClientInflux:

    def __init__(self,
                 host='localhost',
                 port=8086,
                 user='user',
                 password='password',
                 dbname='test'):

        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.dbname = dbname

        self.client = None

        self.logger = logging.getLogger(__class__.__name__)
        self.logger.info(__class__.__name__ + "logger started")

    def init_connection(self):
        """
        Establishes a connection with InfluxDB server.

        :return:
        """

        try:

            self.client = InfluxDBClient(
                self.host,
                self.port,
                self.user,
                self.password,
                self.dbname)

            self.logger.info("Connection to InfluxDB " + self.user + "@" + self.host + ":" + str(self.port) + " successful")

        except ConnectionError:
            self.logger.info("InfluxDB " + self.user + "@" + self.host + ":" + str(self.port) + " unreachable")
            raise

        except ValueError:
            self.logger.info("Unexpected Error: ")
            raise

    def write_data(self, json):
        """
        Write a set of points to the InfluxDB server using the HTTP API exposed.

        :param json: the set of points to be written
        :return:
        """

        try:

            self.client.write_points(json)

        except ValueError:
            self.logger.exception('Unexpected Error: ')
            raise

    def close(self):

        self.client.close()