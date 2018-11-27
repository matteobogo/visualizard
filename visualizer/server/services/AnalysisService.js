require('datejs');

const logger = require('../config/winston');

const config = require('../config/config');
const constants = require('../utils/constants');
const sharedConstants = require('../commons/constants');

const redis = require('../cache/redis');
const influxdb = require('../database/influxdb');

const DatasetAnalysisModel = require('../models/DatasetAnalysis');
const MeasurementStatsModel = require('../models/MeasurementsStats');
const PointsStatsPerTimestampModel = require('../models/PointsStatsPerTimestamp');

const x = p => { throw new Error(`Missing parameter: ${p}`) };

const getStatistics = () => {

    return ['mean', 'sum', 'min', 'max'];
};

const initializePointsStatsPerTS = (
    {
        startInterval,
        endInterval,
        period,
        fields
    }

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
    await DatasetAnalysisModel.deleteMany({}, (err) => {
        if (err) throw Error(`Failed to delete previous dataset analysis: ${err}`);
    });

    await MeasurementStatsModel.deleteMany({}, (err) => {
       if (err) throw Error(`Failed to delete previous measurement stats analysis: ${err}`);
    });

    await PointsStatsPerTimestampModel.deleteMany({}, (err) => {
        if (err) throw Error(`Failed to delete previous points stats per timestamp analysis ${err}`);
    });

    /* Start Analysis */
    const timeStart = new Date();

    //get measurements names list
    let measurements = await influxdb.fetchMeasurementsListFromHttpApi(database);
    if (measurements.length === 0) throw Error('no measurements in the dataset');

    //get first measurement (used for obtaining the list of field)
    const firstMeasurement = await
        influxdb.getFirstMeasurement(database)
            .then(data => data.pop().name);

    //get the list of field
    let fields = await
        influxdb.getAllFieldsKeyByDatabaseByName(database, firstMeasurement)
            .then(data => data.map(f => f['fieldKey']));

    //compute the number of intervals (using start/end interval and the period)
    const intervals = (Date.parse(endInterval) - Date.parse(startInterval)) / (period * 1000) + 1;

    //if nMeasurement is specified, takes a sub-array of measurements
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

    //analysis initialization
    logger.log('info', 'Start Analysis Initialization');

    let datasetFieldsStats = [];                //dataset analysis
    let pointsStatsPerTimestamp =               //pspt analysis
        initializePointsStatsPerTS({
            startInterval: startInterval,
            endInterval: endInterval,
            period: period,
            fields: fields,
        });

    //for each field in the dataset (assuming all the time series have the same set of fields)
    //adds an object containing the field name and the statistics (min/max/min_ts/max_ts/sum/population/mean/std)
    //we will use the order of the list of field to access the array (index)
    //Note: max_ts and min_ts means the timestamp of the max(min) value (of a field) in the dataset
    fields.forEach(field => {

        datasetFieldsStats.push({

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

    //used to measure the computation time of the analysis
    //the ratio between the number of measurements and the fixed time percentages
    const computationTimeIntervals =
        Math.floor(measurements.length / constants.COMPUTATION_PERCENTAGES.length);

    let currentStageTime = new Date();

    //for each measurement (time serie) in the dataset, we fetch its points (a batch of values, one for each field)
    //for each field of each point fetched we compute the statistics and we update the statistics objects
    logger.log('info', 'Start fetching points and computing statistics');
    for (let i = 0; i < measurements.length; ++i) {

        //measurement stats initialization
        let measurementStat = {

            database: database,
            policy: policy,
            startInterval: (new Date(startInterval)).getTime(),
            endInterval: (new Date(endInterval)).getTime(),
            period: period,
            intervals: intervals,
            fields: fields,
            measurement: measurements[i],
            fieldsStats: [],
        };

        //init fields stats (of measurement stats of measurements stats analysis)
        //array position (index) is used for the order of fields
        fields.forEach((field, index) => {

            measurementStat.fieldsStats.push({

                field: field,
                fieldIndex: index,
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

        //fetches measurement's points
        const points = await influxdb.fetchPointsFromHttpApi({
            database: database,
            policy: policy,
            measurements: [measurements[i]],
            startInterval: startInterval,
            endInterval: endInterval,
            period: period,
            fields: fields
        });

        //collect stats from points
        points[0].forEach(point => {

            fields.forEach((field, index) => {

                //min (dataset analysis)
                if (point[field] < datasetFieldsStats[index].min) {
                    datasetFieldsStats[index].min = point[field];
                    datasetFieldsStats[index].min_ts = point.time.getTime();
                }

                //min (measurement analysis)
                if (point[field] < measurementStat.fieldsStats[index].min) {
                    measurementStat.fieldsStats[index].min = point[field];
                    measurementStat.fieldsStats[index].min_ts = point.time.getTime();
                }

                //max (dataset analysis)
                if (point[field] > datasetFieldsStats[index].max) {
                    datasetFieldsStats[index].max = point[field];
                    datasetFieldsStats[index].max_ts = point.time.getTime();
                }

                //max (measurement analysis)
                if (point[field] > measurementStat.fieldsStats[index].max) {
                    measurementStat.fieldsStats[index].max = point[field];
                    measurementStat.fieldsStats[index].max_ts = point.time.getTime();
                }

                //sum (dataset analysis)
                datasetFieldsStats[index].sum += point[field];

                //sum (measurement analysis)
                measurementStat.fieldsStats[index].sum += point[field];

                //population (dataset analysis)
                datasetFieldsStats[index].population += 1;

                //population (measurement analysis)
                measurementStat.fieldsStats[index].population += 1;

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

        //mean for each field (measurement analysis)
        fields.forEach((field, index) => {

            measurementStat.fieldsStats[index].mean =
                measurementStat.fieldsStats[index].sum / measurementStat.fieldsStats[index].population;
        });

        //store measurement stats on database
        const measurementStatsObj = new MeasurementStatsModel(measurementStat);
        await measurementStatsObj.save();

        if (i > 0 && i % computationTimeIntervals === 0)
        logger.log('info',
            `${constants.COMPUTATION_PERCENTAGES[(i / computationTimeIntervals) - 1]}% of measurements analyzed`);
    }

    let timeEnd = new Date();
    let timeDiff = (timeEnd.getTime() - currentStageTime.getTime());
    logger.log('info', `Points fetched and analyzed in ${((timeDiff / 1000) / 60).toFixed(2)} minutes`);

    //mean for each field (dataset analysis)
    logger.log('info', 'Computing the mean of the dataset');
    fields.forEach((field, index) => {

        datasetFieldsStats[index].mean = datasetFieldsStats[index].sum / datasetFieldsStats[index].population;
    });

    //std (dataset + measurements analysis)
    //sqrt ( 1/N * sum from 1 to N of (xi - dataset_mean)^2 )
    //with N the entire population
    logger.log('info', 'Computing the standard deviation of the dataset');

    currentStageTime = new Date();

    //second pass to compute the standard deviation
    //in the first pass we have obtained the mean, both for each measurement and the entire dataset
    //(necessary to compute the std)
    let datasetTmpData = {};
    for (let i = 0; i < measurements.length; ++i) {

        let measurementTmpData = {};

        //fetches measurement's points
        const points = await influxdb.fetchPointsFromHttpApi({
            database: database,
            policy: policy,
            measurements: [measurements[i]],
            startInterval: startInterval,
            endInterval: endInterval,
            period: period,
            fields: fields
        });

        //fetches measurement stats from the database (we need to take the mean)
        const measurementStatFieldsStats = await MeasurementStatsModel
            .findOne({measurement: measurements[i]})
            .select({fieldsStats: 1})   //0 excludes, 1 includes
            .then(result => result.fieldsStats)
            .catch(err => {
                logger.log('error', `Failed to retrieve measurement stats of ${measurements[i]}: ${err.message}`);
            });

        //std computation (first part): sums (xi - mean)^2 for each measurement's point xi
        points[0].forEach(point => {

            fields.forEach((field, index) => {

                //dataset std
                const datasetMean = datasetFieldsStats[index].mean;
                datasetTmpData[field] = datasetTmpData[field] === undefined ? 0 : //init to 0 the first time
                    datasetTmpData[field] += Math.pow((point[field] - datasetMean), 2);

                //measurement std
                const measurementMean = measurementStatFieldsStats[index].mean;
                measurementTmpData[field] = measurementTmpData[field] === undefined ? 0 :
                    measurementTmpData[field] += Math.pow((point[field] - measurementMean), 2);
            });
        });

        //std computation (second part): divides the sum with the number of points and applies the sqrt
        fields.forEach((field, index) => {

            const measurementPopulation = measurementStatFieldsStats[index].population;
            measurementStatFieldsStats[index].std = Math.sqrt((measurementTmpData[field] / measurementPopulation));
        });

        //update the std on the measurement's stats (previously stored during first pass)
        await MeasurementStatsModel
            .update(
                { measurement: measurements[i] },
                { $set: { fieldsStats: measurementStatFieldsStats } }
            )
            .catch(err => {
                logger.log('error', `Failed to update measurement std of ${measurements[i]}: ${err.message}`);
            });

        if (i > 0 && i % computationTimeIntervals === 0)
            logger.log('info',
                `${constants.COMPUTATION_PERCENTAGES[(i / computationTimeIntervals) - 1]}% of measurements analyzed (standard deviation)`);
    }

    //computes the dataset's std (for each field)
    fields.forEach((field, index) => {

        const datasetPopulation = datasetFieldsStats[index].population;
        datasetFieldsStats[index].std = Math.sqrt(datasetTmpData[field] / datasetPopulation);
    });

    timeEnd = new Date();
    timeDiff = (timeEnd.getTime() - currentStageTime.getTime());
    logger.log('info', `Points fetched and analyzed in ${((timeDiff / 1000) / 60).toFixed(2)} minutes`);

    timeEnd = new Date();
    timeDiff = (timeEnd.getTime() - timeStart.getTime());
    logger.log('info', `Dataset Analysis completed in ${((timeDiff / 1000) / 60).toFixed(2)} minutes`);

    //dataset analysis object
    let datasetAnalysis = {
        database: database,
        policy: policy,
        startInterval: (new Date(startInterval)).getTime(), //unix epoch time
        endInterval: (new Date(endInterval)).getTime(),
        period: period,
        intervals: intervals,
        timeseries: measurements.length,
        fields: fields,
        fieldsStats: datasetFieldsStats,
        timeCompleted: timeDiff / 1000, //in seconds
    };

    //store to db
    logger.log('info', 'Storing Dataset Analysis on the database');
    const datasetAnalysisObj = new DatasetAnalysisModel(datasetAnalysis);
    await datasetAnalysisObj.save();

    currentStageTime = new Date();

    //points stats per timestamp analysis
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
            const pointsStatsPerTimestampModel = new PointsStatsPerTimestampModel(pointsStatsPerTimestampObj);
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

const getAnalysisCached = async (request) => {

    request.database = request.database || x`Database is missing`;
    request.policy = request.policy || x`Policy is missing`;
    request.startInterval = request.startInterval || x`Start Interval is missing`;
    request.endInterval = request.endInterval || x`End Interval is missing`;
    request.type = request.type || x`Analysis Type is missing`;
    request.visualizationFlag = request.visualizationFlag || x`Client flag is missing`;   //better visualization for clients

    //logger.log('debug', request);

    //validate request
    //TODO

    //search in cache
    let result = await redis.get(
        `${request.type}_` +
        `${request.database}_` +
        `${request.policy}_` +
        `${request.startInterval}_` +
        `${request.endInterval}_` +
        `${request.visualizationFlag}`) // [client | server]

        .catch(err => {

            logger.log('error', `error during redis cache search: ${err.message}`);
        })
        .then(result => {

            return JSON.parse(result); //exists in cache
        });

    if (!result) { //search in db

        switch (request.type) {

            case sharedConstants.ANALYSIS_DATASET:

                result = await DatasetAnalysisModel
                    .findOne({database: request.database, policy: request.policy})
                    .catch(err => {
                        logger.log('error', `Failed to retrieve dataset analysis from database: ${err.message}`);
                    });

                break;

            case sharedConstants.ANALYSIS_MEASUREMENTS:

                result = await MeasurementStatsModel
                    .find({database: request.database, policy: request.policy})
                    .catch(err => {
                        logger.log('error', `Failed to retrieve measurements stats analysis from database: ${err.message}`);
                    });

                break;

            case sharedConstants.ANALYSIS_PSPT:

                result = await PointsStatsPerTimestampModel
                    .find({database: request.database, policy: request.policy,
                            timestamp: {
                                $gte: (new Date(request.startInterval)).getTime(),
                                $lte: (new Date(request.endInterval)).getTime()
                            }
                    })
                    .catch(err => {
                        logger.log('error', `Failed to retrieve pspt analysis from database: ${err.message}`);
                    });

                //better visualization for clients
                //using with react-timeseries-charts
                if (result && request.visualizationFlag === 'client') {
                    const transformPsptAnalysis = () => {

                        //obj = {
                        //  field1 = [ ["timestamp", min, max, sum, mean], .. ]
                        //  ..
                        //}

                        let obj = {};
                        result[0].fields.forEach(field => {

                            obj[field] = [];
                        });

                        result.forEach(value => {

                            value.fieldsStats.forEach(fieldStat => {

                                let entry = [value.timestamp];
                                entry.push(fieldStat.min);
                                entry.push(fieldStat.max);
                                entry.push(fieldStat.sum);
                                entry.push(fieldStat.mean);

                                obj[fieldStat.field].push(entry);
                            });
                        });

                        return obj;
                    };

                    result = transformPsptAnalysis();
                }

                break;
        }

        if (!result) throw Error(`${request.type} not found`);
        else {

            //set result in redis cache
            const redisCheck = await redis.set(
                `${request.type}_` +
                `${request.database}_` +
                `${request.policy}_` +
                `${request.startInterval}_` +
                `${request.endInterval}_` +
                `${request.visualizationFlag}`,
                JSON.stringify(result)
            );

            //redis check
            if (redisCheck !== 'OK')
                logger.log('warning', `Failed to set ${request.type} in cache, with request: ${request}`);
        }
    }

    return result;
};

module.exports = {
    getStatistics: getStatistics,
    analyzeDataset: analyzeDataset,
    getAnalysisCached: getAnalysisCached,
};