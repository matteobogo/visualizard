const config = require("../config/config");
const InfluxClient = require("influx");

const influx = new InfluxClient.InfluxDB(
    'http://'+CONFIG.db_user+':'+CONFIG.db_password+'@'+CONFIG.db_host+':'+CONFIG.db_port+'/'+CONFIG.db_name);

/**
 * Ping the timeseries server.
 * @param timeout
 * @returns {Promise<IPingStats[]>}
 */
const ping = function(timeout) {
    return influx.ping(timeout);
};

/**
 *
 * @returns {Promise<IResults<any>>}
 */
const getDatabases = () => {
    return influx.query(
        `
        show databases
        `
    )
};

/**
 * Get all the retention policies.
 * @param dbname
 * @returns {Promise<IResults<any>>}
 */
const getRetentionPolicies = (dbname) => {
    return influx.query(
        `
        show retention policies on ${dbname}
        `
    );
};

/**
 * Get all the time series names.
 * @param dbname
 * @returns {Promise<IResults<any>>}
 */
const getMeasurements = (dbname) => {
    return influx.query(
        `
        show measurements on ${dbname}
        `
    );
};

const getFirstMeasurement = (dbname) => {
    return influx.query(
        `
        show measurements on ${dbname} limit 1
        `
    )
};

/**
 * Get the first measurement time of a field of a specific time serie.
 * @param {string} dbname - the database name.
 * @param {string} name - the name of the time serie.
 * @param {string} policy - the name of the policy.
 * @param {string} field -the name of the field.
 */
const getStartInterval = (dbname, name, policy, field) => {
    return influx.query(
        `
        select first(${field}) from ${dbname}.${policy}.${name}
        `
    );
};

/**
 * Get the last measurement time of a field of a specific time serie.
 * @param {string} dbname - the database name.
 * @param {string} name - the name of the time serie.
 * @param {string} policy - the name of the policy.
 * @param {string} field -the name of the field.
 */
const getEndInterval = (dbname, name, policy, field) => {
    return influx.query(
        `
        select last(${field}) from ${dbname}.${policy}.${name}
        `
    );
};

/**
 * Get all the points of a specific time serie.
 * @param {string} name - the name of the time serie.
 * @param {string} policy - the name of the policy.
 */
const getDataByPolicyByName = (name, policy) => {
    return influx.query(
        `
        select * from ${CONFIG.db_name}.${policy}.${name}
        `
    );
};

/**
 * Get all the points of a specific time serie in a time interval [start, end].
 * @param {string} policy - the name of the policy.
 * @param {string} name - the name of the time serie.
 * @param {Date} time_start - the start time of the interval, in UTC.
 * @param {Date} time_end - the end time of the interval, in UTC.
 */
const getPointsByPolicyByNameByStartTimeByEndTime = (policy, name, time_start, time_end) => {
    return influx.query(
        `
        select * from ${CONFIG.db_name}.${policy}.${name} where time >= '${time_start}' and time <= '${time_end}'
        `
    );
};

/**
 * Get all the points of a specified field of a specified time serie in a time interval [start, end].
 * @param {string} policy - the name of the policy.
 * @param {string} name - the name of the time serie.
 * @param {Date} time_start - the start time of the interval, in UTC.
 * @param {Date} time_end - the end time of the interval, in UTC.
 * @param {string} field - the specified field of the time serie.
 * @returns {Promise<IResults<any>>}
 */
const getPointsByPolicyByNameByStartTimeByEndTimeByField = (policy, name, time_start, time_end, field) => {

    return influx.query(
        `
        select ${field} from ${CONFIG.db_name}.${policy}.${name} where time >= '${time_start}' and time <= '${time_end}'
        `
    )
};

/**
 * Get all the time series names with a given tag key equal to a given tag value.
 * @param {string} tag_key - the given tag key
 * @param {string} tag_value - the given tag value
 */
const getNamesByTagKeyByTagValue = (tag_key, tag_value) => {
    return influx.query(
        `
        show tag values on ${CONFIG.db_name} WITH KEY = ${tag_key} WHERE ${tag_key} = '${tag_value}'
        `
    );
};

/**
 * Get the tag keys of all the time series.
 * @param {number} limit - the limit of the results returned.
 * @param {number} offset - the offset from which the results are returned.
 */
const getAllTagKeys = (limit, offset) => {
    return influx.query(
        `
        show tag keys on ${CONFIG.db_name} limit ${limit} offset ${offset}
        `
    );
};

/**
 * Get the tag keys of a time serie.
 * @param {string} name  - the name of the time serie.
 * @param {number} limit - the limit of the results returned.
 * @param {number} offset - the offset from which the results are returned.
 */
const getAllTagKeysByName = (name, limit, offset) => {
    return influx.query(
        `
        show tag keys on ${CONFIG.db_name} from ${name} limit ${limit} offset ${offset}
        `
    );
};

/**
 * Get the field keys of all the time series.
 */
const getAllFieldsKeyByDatabase = (dbname) => {
    return influx.query(
        `
        show field keys on ${dbname}
        `
    );
};

const getAllFieldsKeyByDatabaseByName = (dbname, name) => {
    return influx.query(
        `
        show field keys on ${dbname} from ${name}
        `
    );
};

module.exports = {
    ping: ping,
    getDatabases: getDatabases,
    getRetentionPolicies: getRetentionPolicies,
    getMeasurements: getMeasurements,
    getFirstMeasurement: getFirstMeasurement,
    getStartInterval: getStartInterval,
    getEndInterval: getEndInterval,
    getDataByPolicyByName: getDataByPolicyByName,
    getPointsByPolicyByNameByStartTimeByEndTime: getPointsByPolicyByNameByStartTimeByEndTime,
    getPointsByPolicyByNameByStartTimeByEndTimeByField: getPointsByPolicyByNameByStartTimeByEndTimeByField,
    getNamesByTagKeyByTagValue: getNamesByTagKeyByTagValue,
    getAllTagKeys: getAllTagKeys,
    getAllTagKeysByName: getAllTagKeysByName,
    getAllFieldsKeyByDatabase: getAllFieldsKeyByDatabase,
    getAllFieldsKeyByDatabaseByName: getAllFieldsKeyByDatabaseByName
};