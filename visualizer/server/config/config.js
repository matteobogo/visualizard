//require('dotenvenc')(process.env.DOTENVENC_KEY);
require('dotenv').config();

const config = {

    APP: {
        mode:   process.env.APP     || 'development',
        port:   process.env.PORT    || '3000',
    },
    INFLUX: {
        db_host:        process.env.DB_HOST       || 'localhost',
        db_port:        process.env.DB_PORT       || '8086',
        db_name:        process.env.DB_NAME       || 'google_cluster',
        db_user:        process.env.DB_USER       || 'user',
        db_password:    process.env.DB_PASSWORD   || 'password',
    },
    // MONGO: {
    //     db_host:        process.env.MONGO.DB_HOST        || 'localhost',
    //     db_port:        process.env.MONGO.DB_PORT        || '27017',
    //     db_name:        process.env.MONGO.DB_NAME        || 'google_cluster',
    //     db_user:        process.env.MONGO.DB_USER        || 'user',
    //     db_password:    process.env.MONGO.DB_PASSWORD    || 'password',
    // },
    TIMESERIES: {
        period:         process.env.PERIOD        || 300,
    },
};

module.exports = config;