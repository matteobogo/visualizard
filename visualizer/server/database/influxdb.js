const config = require("../config/config");
const logger = require("../config/winston");
const InfluxClient = require("influx");

const x = p => { throw new Error(`Missing parameter: ${p}`) };

const influx = new InfluxClient.InfluxDB(
    'http://'+config.INFLUX.db_user+
    ':'+config.INFLUX.db_password
    +'@'+config.INFLUX.db_host
    +':'+config.INFLUX.db_port
    +'/'+config.INFLUX.db_name);

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
const getFirstInterval = (dbname, name, policy, field) => {
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
const getLastInterval = (dbname, name, policy, field) => {
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

const getPointsByDatabaseByPolicyByNameByStartTimeByEndTime =
    (dbname, policy, name, time_start, time_end, period, fillMissing = 0) => {

    const query =
        `
        select mean(*) from 
        ${dbname}.${policy}.${name} 
        where time >= '${time_start}' and time <= '${time_end}' GROUP BY time(${period}s) fill(${fillMissing})
        `;

        return removePrefixFromQueryResult(influx.query(query));
};

/**
 * Get all the points of a specified field of a specified time serie in a time interval [start, end].
 * @param {string} dbname - the database name.
 * @param {string} policy - the name of the policy.
 * @param {string} name - the name of the time serie.
 * @param {Date} time_start - the start time of the interval, in UTC.
 * @param {Date} time_end - the end time of the interval, in UTC.
 * @param {string} field - the specified field of the time serie.
 * @returns {Promise<IResults<any>>}
 */
const getPointsByDatabaseByPolicyByNameByStartTimeByEndTimeByField =
    (dbname, policy, name, time_start, time_end, field) => {

    return influx.query(
        `
        select ${field} from ${dbname}.${policy}.${name} where time >= '${time_start}' and time <= '${time_end}'
        `
    );
};

//mean(*) is necessary because GROUP BY doesn't work without an aggregation function.
//Furthermore, InfluxDB doesn't support mixed aggregation and not-aggregation in the select clause
//using the user defined period (in seconds) as grouping attribute for time, values will not change
//this workaround is necessary to use the fill() function (only works with GROUP BY) for replacing missing values
const getPointsBatchByDatabaseByPolicyByMultiNameByStartTimeByEndTime =
    (database, policy, measurements, time_start, time_end, period, fillMissing = 0) => {

    const query =
        `
        select mean(*) from 
        ${measurements.map((measurement) => `${database}.${policy}.${measurement}`)}
        where time >= '${time_start}' and time <= '${time_end}' GROUP BY time(${period}s) fill(${fillMissing})
        `;

    return removePrefixFromQueryResult(influx.query(query));
};

const removePrefixFromQueryResult = (queryResult) => {

    return queryResult
        .then(data => {

            //InfluxDB know issue:
            //https://community.influxdata.com/t/query-problem-removing-prefix-to-field-name-of-into-clause/1006
            //we can't remove the prefix before the field's names: mean(*) => mean_xxx , mean_yyy, ...
            //we can't do "select mean(*) as *" for making new fieldnames same as the source measurement
            data.map(point => {

                //removes mean_ placed by InfluxDB before the field key in the result object
                Object.keys(point).forEach(key => {
                    if (point.hasOwnProperty(key)) {
                        if(key.includes('mean_')) {
                            point[key.replace('mean_', '')] = point[key];
                            delete point[key]
                        }
                    }
                });
            });

            return data;
        })
        .catch(err => {
            logger.log('error', `Failed to remove InfluxDB prefix from the query result: ${err.message}`);
            throw Error(`Failed during query result transformation`);
        });
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

const fetchMeasurementsListFromHttpApi = (dbname) => {

    return new Promise(
        function(resolve, reject) {

            getMeasurements(dbname)
                .then(data => {

                    let measurements = [];
                    data.forEach(m => {
                        measurements.push(m.name);
                    });
                    resolve(measurements);
                })
                .catch(() => { reject('server unavailable'); });
        }
    )
};

const fetchPointsFromHttpApi = async (
    {
        database = x`Database`,
        policy = x`Policy`,
        measurements = x`Measurements`,
        startInterval = x`Start Interval`,
        endInterval = x`End Interval`,
        period = x`Period`,
        fields = x`Fields`,
    }
) => {

    if (measurements.length === 0)
        throw Error(`measurements cannot be empty`);
    if (fields.length === 0)
        throw Error(`fields cannot be empty`);

    //number of intervals per measurement
    //period * 1000 because epoch time is in ms and period is in sec
    const intervals = (Date.parse(endInterval) - Date.parse(startInterval)) / (period * 1000) + 1;

    // [batch_measurement1 .. batch_measurementn]
    //[
    // { time: timestamp1, field1: value, .. , fieldn: value }, .. { time: timestampn, field1: value, .. , fieldn: value },
    // { time: timestamp1, field1: value, .. , fieldn: value }, .. { time: timestampn, field1: value, .. , fieldn: value },
    // ..
    //]
    const expectedBatchSize = intervals * measurements.length;

    return getPointsBatchByDatabaseByPolicyByMultiNameByStartTimeByEndTime(
        database,
        policy,
        measurements,
        startInterval,
        endInterval,
        period
    )
        .then(async (pointsBatch) => {

            if (pointsBatch.length === 0) {

                throw Error(`Empty points batch fetched from InfluxDB for [${database}][${policy}][${measurements}]` +
                    `[${startInterval}][${endInterval}][${period}]`);
            }

            //InfluxDB missing feature: https://github.com/influxdata/influxdb/issues/6412
            //if a timeserie has no points in a time range, InfluxDB will answer with empty result, even if we
            //use GROUP BY time(period) fill(value). InfluxDB will fill empty values only if there at least one
            //point not empty, otherwise the result is empty.
            //In this scenario, we will request a batch of points of multiple time series in a specific time
            //interval, so if a time serie has no points in the time range of k intervals requested, the result
            //array has k points less then expected.

            //with this "patch" (hoping that in the future InfluxDB will release this feature), if the batch has
            //less points than expected, we will check which timeserie/s has no points in the time interval and
            //we will generate its array of points with 0 values (default) programmatically.

            if (pointsBatch.length < expectedBatchSize) {

                await (async () => {

                    pointsBatch = [];
                    for (let i = 0; i < measurements.length; ++i) {

                        let points = await getPointsByDatabaseByPolicyByNameByStartTimeByEndTime(
                            database,
                            policy,
                            measurements[i],
                            startInterval,
                            endInterval,
                            period,
                        )
                            .catch(err => {
                                logger.log('error',
                                    `Failed fetching points of measurement [${measurements[i]}]` +
                                    `during a wrong points batch size detection: ${err.message}`);
                                throw Error(`Failed to retrieve points batch from InfluxDB`);
                            });

                        //time serie with no points in the time interval specified
                        //if the time serie has missing values, but at least one value, the fill() used in the
                        //query will cover the missing values with 0.
                        //This is the scenario in which the time serie has no points (i.e. only missing values)
                        if (points.length === 0) {

                            let timestamp = new Date(startInterval);

                            //reconstructs: [{time: xxx, field1: xxx, field2: yyy, .. fieldn: zzz}]
                            for (let i = 0; i < intervals; ++i) {

                                let obj = {time: timestamp.setSeconds(timestamp.getSeconds() + (period * i))};

                                fields.forEach((field, index) => {

                                    obj[field] = 0;
                                });

                                points.push(obj);
                            }
                        }

                        pointsBatch.push(points);
                    }
                })();

                if (pointsBatch.length === 0)
                    throw Error(`Failed to reconstruct points batch after inconsistent batch size detection`);
                else
                    return pointsBatch;   //implicitly spliced with sub-arrays of measurements

            }
            else if (pointsBatch > expectedBatchSize) {

                logger.log('error',
                    `Points Batch fetched [${pointsBatch.length}] is greater than expected ` +
                    `[${expectedBatchSize.length}]`);
                throw Error(`Failed to retrieve points batch from InfluxDB`);
            }

            //[ { m1_ts1, fields }, { m1_ts2, fields }, .. { mn_ts1, fields }, { mn_ts2, fields } ]
            // ==> [ [ { m1_ts1, fields }, { m1_ts2, fields }, .. ] , [ { mn_ts1, fields }, { mn_ts2, fields } ] ]
            // each sub-array represents a measurement with its set of points in the time interval specified
            let splicedPointsBatch = [];
            while (pointsBatch.length > 0) {

                splicedPointsBatch.push(pointsBatch.splice(0, intervals));
            }

            if (splicedPointsBatch.length === 0)
                throw Error(`Failed to splice points batch according to the number of intervals [${intervals}]`);
            else return splicedPointsBatch;
        });
};

module.exports = {
    ping: ping,
    getDatabases: getDatabases,
    getRetentionPolicies: getRetentionPolicies,
    getMeasurements: getMeasurements,
    getFirstMeasurement: getFirstMeasurement,
    getFirstInterval: getFirstInterval,
    getLastInterval: getLastInterval,
    getDataByPolicyByName: getDataByPolicyByName,
    getPointsByDatabaseByPolicyByNameByStartTimeByEndTime: getPointsByDatabaseByPolicyByNameByStartTimeByEndTime,
    getPointsByDatabaseByPolicyByNameByStartTimeByEndTimeByField: getPointsByDatabaseByPolicyByNameByStartTimeByEndTimeByField,
    getPointsBatchByDatabaseByPolicyByMultiNameByStartTimeByEndTime: getPointsBatchByDatabaseByPolicyByMultiNameByStartTimeByEndTime,
    getNamesByTagKeyByTagValue: getNamesByTagKeyByTagValue,
    getAllTagKeys: getAllTagKeys,
    getAllTagKeysByName: getAllTagKeysByName,
    getAllFieldsKeyByDatabase: getAllFieldsKeyByDatabase,
    getAllFieldsKeyByDatabaseByName: getAllFieldsKeyByDatabaseByName,
    fetchMeasurementsListFromHttpApi: fetchMeasurementsListFromHttpApi,
    fetchPointsFromHttpApi: fetchPointsFromHttpApi,
};