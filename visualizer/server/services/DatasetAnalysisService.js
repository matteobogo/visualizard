require('datejs');

const logger = require('../config/winston');

const redis = require('../cache/redis');

const influxdb = require('../database/influxdb');
const DatasetAnalysis = require('../models/DatasetAnalysis');
const PointsStatsPerTimestamp = require('../models/PointsStatsPerTimestamp');

const _ANALYSIS_TYPES = {
    DATASET_ANALYSIS: 'DATASET_ANALYSIS',
    POINTS_STATS_PER_TIMESTAMP_ANALYSIS: 'POINTS_STATS_PER_TIMESTAMP_ANALYSIS',
};

const _COMPUTATION_PERCENTAGES = ['10','20','30','40','50','60','70','80','90','100'];

const initializePointsStatsPerTS = (
    startInterval,
    endInterval,
    period,
    fields

) => {

    let pointsStatsPerTimestamp = {};

    let currentIntervalParsed = new Date(startInterval);
    let endIntervalParsed = new Date(endInterval);

    while (currentIntervalParsed <= endIntervalParsed) {

        let timestamp = currentIntervalParsed.getTime();  //toUTCString();

        pointsStatsPerTimestamp[timestamp] = {};
        fields.forEach((field) => {

            pointsStatsPerTimestamp[timestamp][field] = {

                min: Number.MAX_SAFE_INTEGER,
                max: Number.MIN_SAFE_INTEGER,
                sum: 0,
                population: 0,
                mean: 0,
            };
        });

        currentIntervalParsed.setSeconds(currentIntervalParsed.getSeconds() + period);
    }

    return pointsStatsPerTimestamp;
};

const analyzeDataset = async (
    {
        database,
        policy,
        startInterval,
        endInterval,
        period,
        nMeasurements = 0 //means all the measurements
    }

) => {

    logger.log('info', 'Remove previous analysis');

    //remove previous analysis
    await DatasetAnalysis.deleteMany({}, (err) => {
        if (err) throw Error(`Failed to delete previous dataset analysis: ${err}`);
    });

    await PointsStatsPerTimestamp.deleteMany({}, (err) => {
        if (err) throw Error(`Failed to delete previous points stats per timestamp analysis ${err}`);
    });

    /* Start Analysis */
    const timeStart = new Date();

    let measurements = await influxdb.fetchMeasurementsListFromHttpApi(database);
    if (measurements === 0) throw Error('no measurements in the dataset');

    const firstMeasurement = await
        influxdb.getFirstMeasurement(database)
            .then(data => data.pop().name);

    let fields = await
        influxdb.getAllFieldsKeyByDatabaseByName(database, firstMeasurement)
            .then(data => data.map(f => f['fieldKey']));

    const intervals = (Date.parse(endInterval) - Date.parse(startInterval)) / (period * 1000) + 1;

    if (nMeasurements > 0) {
        measurements = measurements.slice(0, nMeasurements);
    }

    logger.log('info',
        `Start Dataset Analysis: ` +
        `- Measurements: ${measurements.length} [nMeasurements: ${nMeasurements}],` +
        `- First Measurement: ${firstMeasurement},` +
        `- Intervals: ${intervals},` +
        `- Start Interval: ${startInterval},` +
        `- End Interval: ${endInterval},` +
        `- Period: ${period},` +
        `- Fields: ${fields}`
    );

    //init
    logger.log('info', 'Start Initialization');
    let fieldsStats = [];
    let pointsStatsPerTimestamp =
        initializePointsStatsPerTS(
            startInterval,
            endInterval,
            period,
            fields
        );

    fields.forEach(field => {

        fieldsStats.push({

            field: field,
            min: Number.MAX_SAFE_INTEGER,
            max: Number.MIN_SAFE_INTEGER,
            min_ts: null,
            max_ts: null,
            sum: 0,
            population: 0,
            mean: 0,
            std: 0,
        });
    });

    const computationTimeIntervals =
        Math.floor(measurements.length / _COMPUTATION_PERCENTAGES.length);

    let currentStageTime = new Date();
    logger.log('info', 'Start fetching points and computing statistics');
    for (let i = 0; i < measurements.length; ++i) {

        const points = await influxdb.fetchPointsFromHttpApi(
            database,
            policy,
            measurements[i],
            startInterval,
            endInterval,
            period,
            fields
        );

        //collect stats from points
        points.forEach(point => {

            fields.forEach((field, index) => {

                //min
                if (point[field] < fieldsStats[index].min) {
                    fieldsStats[index].min = point[field];
                    fieldsStats[index].min_ts = point.time.getTime();
                }

                //max
                if (point[field] > fieldsStats[index].max) {
                    fieldsStats[index].max = point[field];
                    fieldsStats[index].max_ts = point.time.getTime();
                }

                //sum
                fieldsStats[index].sum += point[field];

                //population
                fieldsStats[index].population += 1;

                /* points stats per timestamp */
                const timestamp = point.time.getTime(); //convert in unix epoch

                //min
                if (point[field] < pointsStatsPerTimestamp[timestamp][field].min) {
                    pointsStatsPerTimestamp[timestamp][field].min = point[field];
                }

                //max
                if (point[field] > pointsStatsPerTimestamp[timestamp][field].max) {
                    pointsStatsPerTimestamp[timestamp][field].max = point[field];
                }

                //sum
                pointsStatsPerTimestamp[timestamp][field].sum += point[field];

                //population
                pointsStatsPerTimestamp[timestamp][field].population += 1;
            });
        });

        if (i > 0 && i % computationTimeIntervals === 0)
        logger.log('info',
            `${_COMPUTATION_PERCENTAGES[(i / computationTimeIntervals) - 1]}% of measurements analyzed`);
    }

    let timeEnd = new Date();
    let timeDiff = (timeEnd.getTime() - currentStageTime.getTime());
    logger.log('info', `Points fetched and analyzed in ${((timeDiff / 1000) / 60).toFixed(2)} minutes`);

    //mean (dataset)
    logger.log('info', 'Computing the mean of the dataset');
    fields.forEach((field, index) => {

        fieldsStats[index].mean = fieldsStats[index].sum / fieldsStats[index].population;
    });

    //std (dataset)
    //sqrt ( 1/N * sum from 1 to N of (xi - dataset_mean)^2 )
    //with N the entire population
    logger.log('info', 'Computing the standard deviation of the dataset');
    let tmpData = {};
    fields.forEach(field => {
        tmpData[field] = 0;
    });

    currentStageTime = new Date();

    for (let i = 0; i < measurements.length; ++i) {

        const points = await influxdb.fetchPointsFromHttpApi(
            database,
            policy,
            measurements[i],
            startInterval,
            endInterval,
            period,
            fields
        );

        points.forEach(point => {

            fields.forEach((field, index) => {

                const datasetMean = fieldsStats[index].mean;
                tmpData[field] += Math.pow((point[field] - datasetMean), 2);
            });
        });

        if (i > 0 && i % computationTimeIntervals === 0)
            logger.log('info',
                `${_COMPUTATION_PERCENTAGES[(i / computationTimeIntervals) - 1]}% of measurements analyzed (standard deviation)`);
    }

    fields.forEach((field, index) => {

        fieldsStats[index].std = Math.sqrt(tmpData[field]);
    });

    timeEnd = new Date();
    timeDiff = (timeEnd.getTime() - currentStageTime.getTime());
    logger.log('info', `Points fetched and analyzed in ${((timeDiff / 1000) / 60).toFixed(2)} minutes`);

    timeEnd = new Date();
    timeDiff = (timeEnd.getTime() - timeStart.getTime());
    logger.log('info', `Dataset Analysis completed in ${((timeDiff / 1000) / 60).toFixed(2)} minutes`);

    let datasetAnalysis = {};
    datasetAnalysis['database'] = database;
    datasetAnalysis['policy'] = policy;
    datasetAnalysis['startInterval'] = (new Date(startInterval)).getTime(); //unix epoch time
    datasetAnalysis['endInterval'] = (new Date(endInterval)).getTime();
    datasetAnalysis['period'] = period;
    datasetAnalysis['intervals'] = intervals;
    datasetAnalysis['timeseries'] = measurements.length;
    datasetAnalysis['fields'] = fields;
    datasetAnalysis['fieldsStats'] = fieldsStats;
    datasetAnalysis['timeCompleted'] = timeDiff / 1000; //in seconds

    //store to db
    logger.log('info', 'Storing Dataset Analysis on the database');
    const datasetAnalysisObj = new DatasetAnalysis(datasetAnalysis);
    await datasetAnalysisObj.save();

    currentStageTime = new Date();

    /* points stats per timestamp */
    //compute mean + array construction
    logger.log('info', 'Start Points Stats per Timestamp Analysis');
    for (let timestamp in pointsStatsPerTimestamp) {
        if (pointsStatsPerTimestamp.hasOwnProperty(timestamp)) {

            //store
            let pointsStatsPerTimestampObj = {
                database: database,
                policy: policy,
                timestamp: timestamp,
                timeseries: measurements.length,
                fields: fields,
                fieldsStats: [],
            };

            fields.forEach(field => {

                const sum = pointsStatsPerTimestamp[timestamp][field].sum;
                const population = pointsStatsPerTimestamp[timestamp][field].population;
                pointsStatsPerTimestamp[timestamp][field].mean = sum / population;

                let fieldEntry = {
                    field: field,
                    min: pointsStatsPerTimestamp[timestamp][field].min,
                    max: pointsStatsPerTimestamp[timestamp][field].max,
                    sum: pointsStatsPerTimestamp[timestamp][field].sum,
                    population: pointsStatsPerTimestamp[timestamp][field].population,
                    mean: pointsStatsPerTimestamp[timestamp][field].mean,
                };

                pointsStatsPerTimestampObj.fieldsStats.push(fieldEntry);
            });

            //save on db
            const pointsStatsPerTimestampModel = new PointsStatsPerTimestamp(pointsStatsPerTimestampObj);
            await pointsStatsPerTimestampModel.save();
        }
    }

    timeEnd = new Date();
    timeDiff = (timeEnd.getTime() - currentStageTime.getTime());
    logger.log('info', `Points Stats per Timestamp Analysis completed in ${((timeDiff / 1000) / 60).toFixed(2)} minutes`);

    logger.log('info', 'Points Stats per Timestamp Analysis stored on the database');

    timeEnd = new Date();
    timeDiff = (timeEnd.getTime() - timeStart.getTime());
    logger.log('info', `Total Analysis completed in ${((timeDiff / 1000) / 60).toFixed(2)} minutes`);

    return true;
};

const getAnalysisCached = (
    {
        database,
        policy,
        startInterval,
        endInterval,
        analysisType,
    },
    callback
) => {

    //search in cache
    redis.get(`${analysisType}_${database}_${policy}_${startInterval}_${endInterval}`, (err, reply) => {

        if (err) {
            logger.log('error', 'error during redis cache search');
        }
        else if (reply) { //exists in cache

            callback(null, JSON.parse(reply));
        }
        else { //not in cache -> search in persistent storage

            switch (analysisType) {

                case _ANALYSIS_TYPES.DATASET_ANALYSIS:

                    DatasetAnalysis.find(
                        {
                            database: database,
                            policy: policy,
                        },
                        (err, datasetAnalysis) => {

                        if (err || !datasetAnalysis) {
                            logger.log('error', `Failed to retrieve dataset analysis from database: ${err.message}`);
                            callback(err, null);
                        }
                        else {

                            redis.set(database, JSON.stringify(datasetAnalysis), () => {

                                callback(null, datasetAnalysis);
                            });
                        }
                    });

                    break;

                case _ANALYSIS_TYPES.POINTS_STATS_PER_TIMESTAMP_ANALYSIS:

                    PointsStatsPerTimestamp.find(
                        {
                            database: database,
                            policy: policy,
                            timestamp: {
                                $gte: (new Date(startInterval)).getTime(),
                                $lte: (new Date(endInterval)).getTime()
                            }
                        },
                        (err, psptAnalysis) => {

                        if (err || !psptAnalysis) {
                            logger.log('error', `Failed to retrieve pspt analysis from database: ${err.message}`);
                            callback(err, null);
                        }
                        else {

                            redis.set(database, JSON.stringify(psptAnalysis), () => {

                                callback(null, psptAnalysis);

                            });
                        }
                    });

                    break;

                default:
                    break;
            }
        }
    });
};

module.exports = {
    analyzeDataset: analyzeDataset,
    getAnalysisCached: getAnalysisCached,
    _ANALYSIS_TYPES,
};