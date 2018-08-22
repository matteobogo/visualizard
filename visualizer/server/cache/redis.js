const config = require('../config/config');

const Redis = require('ioredis');
const redis = new Redis(config.REDIS.db_port, config.REDIS.db_host);

module.exports = redis;