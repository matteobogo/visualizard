const config = require('../config/config');

const redisClient = require('redis').createClient;
const redis = redisClient(config.REDIS.db_port, config.REDIS.db_host);

module.exports = redis;