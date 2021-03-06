const config = require('../config/config');

const influx = require('../database/influxdb');
const heatmaps = require('../services/HeatMapsService');

const ping = async function(req, res) {
    res.setHeader('Content-Type', 'application/json');

    let err, ping;
    [err, ping] = await to(influx.ping(2000));

    if (err) return ReE(res, 'server is unreachable') ;

    let pings_json = [];
    ping.forEach(p => {
        pings_json.push({ host: p.url.href, rtt: p.rtt, online: p.online });
    });

    return ReS(res, pings_json);
};

const getDatabases = async function (req, res) {
    res.setHeader('Content-Type', 'application/json');

    let err, databases;
    [err, databases] = await to(influx.getDatabases());

    if (err) return ReE(res, 'error retrieving databases');

    let databases_json = [];
    databases
        .filter(db => db['name'] !== '_internal')   //remove influx internal db
        .forEach(db => databases_json.push(db['name']));

    return ReS(res, {payload: databases_json}, 200);
};

const getAllPolicies = async function(req, res) {
    res.setHeader('Content-Type', 'application/json');

    let err, dbname, policies;

    dbname = req.query.dbname;

    [err, policies] = await to(influx.getRetentionPolicies(dbname));

    if (err) return ReE(res, 'error retrieving policies');

    let policies_json = [];
    policies.forEach(p => {
        policies_json.push(p.name);
    });

    return ReS(res, {payload: policies_json}, 200);
};

const getAllFields = async function(req, res) {
    res.setHeader('Content-Type', 'application/json');

    let err, dbname, firstMeasurement, fields;

    dbname = req.query.dbname;

    //take the first measurement name (there is at least one, otherwise the database is empty)
    //assuming all time series have the same fields

    [err, firstMeasurement] = await to(influx.getFirstMeasurement(dbname));
    if (err) return ReE(res, 'error retrieving fields');

    [err, fields] = await to(influx.getAllFieldsKeyByDatabaseByName(dbname, firstMeasurement[0]['name']));
    if (err) return ReE(res, 'error retrieving fields');

    let fields_json = [];
    fields.forEach(f => {
        fields_json.push(f['fieldKey']);
    });

    return ReS(res, {payload: fields_json}, 200);
};

const getFirstInterval = async (req, res) => {

    res.setHeader('Content-Type', 'application/json');

    let err, dbname, policy, field, firstMeasurement, firstInterval;

    dbname = req.query.dbname;
    policy = req.query.policy;
    field = req.query.field;

    [err, firstMeasurement] = await to(influx.getFirstMeasurement(dbname));
    if (err) return ReE(res, 'error retrieving first interval');

    [err, firstInterval] = await to(influx.getFirstInterval(dbname, firstMeasurement[0]['name'], policy, field));
    if (err) return ReE(res, 'error retrieving first interval');

    return ReS(res, {payload: firstInterval.pop().time._nanoISO}, 200);
};

const getLastInterval = async (req, res) => {

    res.setHeader('Content-Type', 'application/json');

    let err, dbname, policy, field, firstMeasurement, lastInterval;

    dbname = req.query.dbname;
    policy = req.query.policy;
    field = req.query.field;

    [err, firstMeasurement] = await to(influx.getFirstMeasurement(dbname));
    if (err) return ReE(res, 'error retrieving last interval');

    [err, lastInterval] = await to(influx.getLastInterval(dbname, firstMeasurement[0]['name'], policy, field));
    if (err) return ReE(res, 'error retrieving last interval');

    return ReS(res, {payload: lastInterval.pop().time._nanoISO}, 200);
};

const getFirstAndLastIntervals = async (req, res) => {

    res.setHeader('Content-Type', 'application/json');

    let err, dbname, policy, field, firstMeasurement, firstInterval, lastInterval;

    dbname = req.query.dbname;
    policy = req.query.policy;
    field = req.query.field;

    [err, firstMeasurement] = await to(influx.getFirstMeasurement(dbname));
    if (err) return ReE(res, 'error retrieving time range');

    [err, firstInterval] = await to(influx.getFirstInterval(dbname, firstMeasurement[0]['name'], policy, field));
    [err, lastInterval] = await to(influx.getLastInterval(dbname, firstMeasurement[0]['name'], policy, field));

    if(err) return ReE(res, 'error retrieving time range');

    return ReS(res, {
        payload: {
            firstInterval: firstInterval.pop().time._nanoISO,
            lastInterval: lastInterval.pop().time._nanoISO
        }
    });
};

const getPeriods = async (req, res) => {

    res.setHeader('Content-Type', 'application/json');

    let periods = [];
    periods.push(config.TIMESERIES.period);  //now is only 1

    return ReS(res, {payload: periods}, 200);
};

const getMeasurements = async function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    
    let err, dbname, measurements;

    dbname = req.query.dbname;

    [err, measurements] = await to(influx.fetchMeasurementsListFromHttpApi(dbname));

    if(err) return ReE(res, 'error retrieving measurements');

    return ReS(res, {measurements: measurements}, 200);
};

const getNMeasurements = async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    let dbname = req.query.dbname;

    let err, nMeasurements;
    [err, nMeasurements] = await to(influx.fetchMeasurementsListFromHttpApi(dbname));

    if (err) return ReE(res, `error retrieving the number of measurements`);

    return ReS(res, {payload: nMeasurements.length}, 200);
};

const getTimeIntervalByPolicyByNameByField = async function(req, res) {
    res.setHeader('Content-Type', 'application/json');

    let policy, name, field, err1, time1, err2, time2;
    policy = req.params.policy;
    name = req.params.name;
    field = req.params.field;

    [err1, time1] = await to(influx.getStartInterval(name,policy,field));
    [err2, time2] = await to(influx.getEndInterval(name,policy,field));

    if(err1 || err2) return ReE(res, 'error retrieving time interval');
    if(!time1 || !time2) return ReE(res, 'error retrieving time interval of ' +
                            name + ' with policy ' + policy +
                            ' and field ' + field);

    let start = time1.pop().time._nanoISO;
    let end = time2.pop().time._nanoISO;
    
    return ReS(res, {start: start, end: end}, 200); 
};

const getDataByPolicyByName = async function(req, res) {
    res.setHeader('Content-Type', 'application/json');

    let policy, name, err, measurement;
    policy = req.params.policy;
    name = req.params.name;

    [err, measurement] = await to(influx.getDataByPolicyByName(name,policy));

    if(err) return ReE(res, 'error finding measurement');
    if(!measurement) return ReE(res, 'error finding measurement '+ name);

    return ReS(res, {measurement: measurement}, 200);
};

const getPointsBatchByDatabaseByPolicyByMultiNameByStartTimeByEndTime = async function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    
    let database, policy, name, time_start, time_end, err, measurements;
    database = req.params.database;
    policy = req.params.policy;
    measurements = req.params.name;
    time_start = req.params.time_start;
    time_end = req.params.time_end;

    [err, measurements] = await to(
        influx.getPointsBatchByDatabaseByPolicyByMultiNameByStartTimeByEndTime(
            database,
            policy,
            measurements,
            time_start,
            time_end)
    );

    if(err) return ReE(res, 'error finding measurement');
    if(!measurements) return ReE(res, 'error finding measurement '+ name +
                                ' from ' + time_start + ' to ' + time_end);

    return ReS(res, {measurements: measurements}, 200);
};

const getNamesByTagKeyByTagValue = async function(req, res) {
    res.setHeader('Content-Type', 'application/json');

    let tag_key, tag_value, err, names;
    tag_key = req.params.tag_key;
    tag_value = req.params.tag_value;

    [err, names] = await to(influx.getNamesByTagKeyByTagValue(tag_key,tag_value));

    if(err) return ReE(res, 'error finding measurement');
    if(!names) return ReE(res, 'error finding names ' +
                                ' with tag ' + tag_key + ' = ' + tag_value);

    names_json = [];
    names.groupRows.forEach(elem => {
        names_json.push(elem.name);
    });

    return ReS(res, {names: names_json}, 200);
};

module.exports = {
    ping: ping,
    getDatabases: getDatabases,
    getAllPolicies: getAllPolicies,
    getAllFields: getAllFields,
    getFirstInterval: getFirstInterval,
    getLastInterval: getLastInterval,
    getFirstAndLastIntervals: getFirstAndLastIntervals,
    getPeriods: getPeriods,
    getMeasurements: getMeasurements,
    getNMeasurements: getNMeasurements,
    getTimeIntervalByPolicyByNameByField: getTimeIntervalByPolicyByNameByField,
    getDataByPolicyByName: getDataByPolicyByName,
    getPointsBatchByDatabaseByPolicyByMultiNameByStartTimeByEndTime: getPointsBatchByDatabaseByPolicyByMultiNameByStartTimeByEndTime,
    getNamesByTagKeyByTagValue: getNamesByTagKeyByTagValue,
};