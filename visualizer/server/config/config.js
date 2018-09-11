//require('dotenvenc')(process.env.DOTENVENC_KEY);
require('dotenv').config();

const config = {

    APP: {
        mode:   process.env.APP     || 'development',
        port:   process.env.PORT    || '3000',
    },
    INFLUX: {
        db_host:        process.env.INFLUX_DB_HOST       || 'localhost',
        db_port:        process.env.INFLUX_DB_PORT       || '8086',
        db_name:        process.env.INFLUX_DB_NAME       || 'google_cluster',
        db_user:        process.env.INFLUX_DB_USER       || 'user',
        db_password:    process.env.INFLUX_DB_PASSWORD   || 'password',
    },
    MONGO: {
        db_host:        process.env.MONGO_DB_HOST        || 'localhost',
        db_port:        process.env.MONGO_DB_PORT        || '27017',
        db_name:        process.env.MONGO_DB_NAME        || 'visualizard',
        db_user:        process.env.MONGO_DB_USER        || 'user',
        db_password:    process.env.MONGO_DB_PASSWORD    || 'password',
    },
    REDIS: {
        db_host:        process.env.REDIS_DB_HOST        || 'localhost',
        db_port:        process.env.REDIS_DB_PORT        || '6379'
    },
    TIMESERIES: {
        period:         process.env.TS_PERIOD            || 300,
    },
    HEATMAPS: {
        MIN_Z_SCORE:    process.env.HEATMAP_MIN_Z_SCORE  || -3,
        MAX_Z_SCORE:    process.env.HEATMAP_MAX_Z_SCORE  || 3,
        TILE_SIZE:      process.env.HEATMAP_TILE_SIZE    || 256,
        TILE_ZOOMS:     process.env.HEATMAP_TILE_ZOOMS   || '2' //2x
    }
};

module.exports = config;