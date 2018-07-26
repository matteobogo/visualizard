//require('dotenvenc')(process.env.DOTENVENC_KEY);
require('dotenv').config();

CONFIG = {}

CONFIG.app              = process.env.APP           || 'development';
CONFIG.port             = process.env.PORT          || '3000';

CONFIG.db_host          = process.env.DB_HOST       || 'localhost';
CONFIG.db_port          = process.env.DB_PORT       || '8086';
CONFIG.db_name          = process.env.DB_NAME       || 'google_cluster';
CONFIG.db_user          = process.env.DB_USER       || 'user';
CONFIG.db_password      = process.env.DB_PASSWORD   || 'password';