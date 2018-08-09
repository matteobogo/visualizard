//require('dotenvenc')(process.env.DOTENVENC_KEY);
require('dotenv').config();

const config = {

    APP: {
        mode:   process.env.APP     || 'development',
        port:   process.env.PORT    || '3000',
    },
    DATABASE: {
        db_host:        process.env.DB_HOST       || 'localhost',
        db_port:        process.env.DB_PORT       || '8086',
        db_name:        process.env.DB_NAME       || 'google_cluster',
        db_user:        process.env.DB_USER       || 'user',
        db_password:    process.env.DB_PASSWORD   || 'password',
    },
    TIMESERIES: {
        period:         process.env.PERIOD        || 300,
    },
};

module.exports = config;