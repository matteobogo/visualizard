require('datejs');

const logger = require('../config/winston');

const config = require('../config/config');
const constants = require('../utils/constants');
const globals = require('../utils/globals');

const influx = require('../database/influxdb');
const analysisService = require('../services/AnalysisService');

const util = require('util');
const fs = require('fs');
const path = require('path');

const readFile = util.promisify(fs.readFile);
const Canvas = require('canvas');

const getPalettesRGB = (palette) => {

    if (constants.PALETTES.hasOwnProperty(palette)) {

        return constants.PALETTES[palette.toUpperCase()].RGB_SCALE;
    }
    else throw Error(`palette ${palette} not available`);
};

const getPalettes = () => {

    return Object.keys(constants.PALETTES);
};

const getHeatMapTypes = () => {

    return Object.keys(constants.HEATMAPS.TYPES);
};

//Feature Scaling: Standardization => https://en.wikipedia.org/wiki/Standard_score
//used for mapping colors in colorize function (EDITABLE)
let minZscore = -3;
let maxZscore = 3;

const setZscores = (min, max) => {

    const oldMinZscore = minZscore;
    const oldMaxZscore = maxZscore;

    minZscore = min;
    maxZscore = max;

    logger.log('info', `Changed HeatMap Z scores: [${oldMinZscore},${oldMaxZscore}] => [${minZscore},${maxZscore}]`);
};

const getZscores = () => ({ min: minZscore, max: maxZscore });

const x = p => { throw new Error(`Missing parameter: ${p}`) };

const filenameGenerator = (heatMapRequest) => {

    return `/heatmap_` +
        `${heatMapRequest.database}_` +
        `${heatMapRequest.policy}_` +
        `${heatMapRequest.startInterval}_` +
        `${heatMapRequest.endInterval}_` +
        `${heatMapRequest.fields[0]}_` +
        `${heatMapRequest.nMeasurements}_` +
        `${heatMapRequest.period}_` +
        `${heatMapRequest.heatMapType}_` +
        `${heatMapRequest.palette}`;
};

/* HeatMap Fetchers */

const heatMapFetcher = async (
    {
        heatMapRequest,
        imageType = constants.IMAGE_EXTENSIONS.IMAGE_PNG_EXT,
    }

    ) => {

    heatMapRequest.database = heatMapRequest.database || x`Database is missing`;
    heatMapRequest.policy = heatMapRequest.policy || x`Policy is missing`;
    heatMapRequest.startInterval = heatMapRequest.startInterval || x`Start Interval is missing`;
    heatMapRequest.endInterval = heatMapRequest.endInterval || x`End Interval is missing`;
    heatMapRequest.fields[0] = heatMapRequest.fields[0] || x`Field is missing`;
    heatMapRequest.nMeasurements = heatMapRequest.nMeasurements || x`number of measurements is missing`;
    heatMapRequest.period = heatMapRequest.period || x`Period is missing`;
    heatMapRequest.heatMapType = heatMapRequest.heatMapType || x`HeatMap Type is missing`;
    heatMapRequest.palette = heatMapRequest.palette || x`Palette is missing`;

    const filename = filenameGenerator(heatMapRequest);

    logger.log('info', `Requesting ${filename}.${imageType}`);

    //TODO image stored on external service like Amazon S3

    //checks if the heatmap image is already stored
    const file = fs.existsSync(`${constants.PATH_HEATMAPS_IMAGES + filename}.${imageType}`);

    if (!file) {
        logger.log('warn', `Requested ${constants.PATH_HEATMAPS_IMAGES + filename}.${imageType} ` +
                           `but image has not been computed yet`);
    }

    //TODO carica heatmap grossa e ritaglia? altre strategie?

    //convert image file to base64-encoded string
    const base64Image = new Buffer(file, 'binary').toString('base64');

    //combine all the strings and return the result
    return `data:image/${imageType};base64,${base64Image}`;
};

/* HeatMap Construction */

const heatMapCanvasToImage = async (
    {
        canvas,
        request,
        imageType,
    }) => {

    const filename = filenameGenerator(request);
    const finishMsg = `Storing ${constants.PATH_HEATMAPS_IMAGES+filename}.${imageType}`;

    switch (imageType) {

        case constants.IMAGE_EXTENSIONS.IMAGE_PNG_EXT:

            canvas
                .createPNGStream()
                .pipe(fs.createWriteStream(constants.PATH_HEATMAPS_IMAGES + `${filename}.${imageType}`))
                .on('finish', () => logger.log('info', finishMsg));

            break;

        case constants.IMAGE_EXTENSIONS.IMAGE_JPEG_EXT:

            canvas
                .createJPEGStream()
                .pipe(fs.createWriteStream(constants.PATH_HEATMAPS_IMAGES + `${filename}.${imageType}`))
                .on('finish', () => logger.log('info', finishMsg));

            break;

        case constants.IMAGE_EXTENSIONS.IMAGE_PDF_EXT:

            canvas
                .createPDFStream()
                .pipe(fs.createWriteStream(constants.PATH_HEATMAPS_IMAGES + `${filename}.${imageType}`))
                .on('finish', () => logger.log('info', finishMsg));

            break;

        default:
            throw Error(`media type not supported: ${imageType}`);
    }
};

const colorize = ( //value must be standardized first
    {
        value,
        min,
        max,
        palette,
    }) => {

    const range = Math.abs(max - min);
    const bucket_len = range / palette.length;

    //outliers
    if (value < min) return {r:255, g:255, b:255};   //white
    if (value > max) return {r:0, g:0, b:0};         //black

    //mapping colors to normal distribution
    for(let i = 0, b = min; i < palette.length; ++i, b += bucket_len) {

        //value in the current bucket
        if (value <= b + bucket_len)
            return palette[i];
    }
};

const standardize = (point, field, mean, std) => {

    return (point[field] - mean) / std;
};

const drawHeatMap = async ({

    request,
    analysis,

}) => {

    //computes the field index (used to retrieve the request field in fieldsStats within the measurements analysis)
    const fieldIndex = analysis.datasetAnalysis.fieldsStats.map(entry => entry.field).indexOf(request.fields[0]);

    //computes canvas dimensions
    const width = analysis.datasetAnalysis.intervals;
    let height = analysis.measurementsAnalysis.length; //number of measurements to compute
    if (request.nMeasurements > 0) {
        height = analysis.measurementsAnalysis.slice(0, request.nMeasurements).length;
    }

    logger.log('info', `Start building ${request.heatMapType} HeatMap for ${request.fields[0]}`);

    //palette RGBs
    const palette = getPalettesRGB(request.palette);

    //canvas
    logger.log('info', `Generating Canvas [${width}x${height}]`);
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    //computation completation time
    const computationTimeIntervals =
        Math.floor(height / constants.COMPUTATION_PERCENTAGES.length);

    for (let i = 0, l = 0; i < height; ++i) {

        //check if computation needs to be stopped
        if (!globals.getHeatMapComputationStatus()) {
            logger.log('warn', `HeatMap Image drawing stopped by the user`);
            throw Error(`HeatMap Image drawing stopped by the user`);
        }

        const measurement = analysis.measurementsAnalysis[i].measurement;
        const points = await influx.fetchPointsFromHttpApi(
            request.database,
            request.policy,
            measurement,            //decides the order
            request.startInterval,
            request.endInterval,
            request.period,
            request.fields
        )
            .catch(err => {
                logger.log('error', `Failed to fetch points: ${err.message}`);
                throw Error(`Failed to draw the HeatMap`);
            });

        if (points.length === 0) {

            logger.log('error', `No points available in the timeserie [${measurement}]`);
            throw Error(`Failed to draw the HeatMap`);
        }

        //drawing pixels
        points.forEach((point, index) => {

            let standardizedPoint = standardize(
                point,
                request.fields[0],
                analysis.datasetAnalysis.fieldsStats[fieldIndex].mean,
                analysis.datasetAnalysis.fieldsStats[fieldIndex].std
            );

            let colorizedPoint = colorize({
                value: standardizedPoint,
                min: minZscore,
                max: maxZscore,
                palette: palette
            });

            ctx.fillStyle = `rgb(${colorizedPoint.r},${colorizedPoint.g},${colorizedPoint.b})`;
            ctx.fillRect(index, i, 1, 1);
        });

        if (i > 0 && i % computationTimeIntervals === 0) {

            const percentage = constants.COMPUTATION_PERCENTAGES[(i / computationTimeIntervals) - 1];
            globals.setHeatMapComputationPercentage(percentage);

            logger.log('info',
                `${percentage}% of measurements painted`);
        }
    }
    return canvas;
};

const heatMapBuildAndStore = async (heatMapRequest, imageType) => {

    //args check
    heatMapRequest = heatMapRequest || x`HeatMap request`;
    imageType = imageType || x`Image Type`;

    //sets computation in progress (global)
    globals.setHeatMapComputationStatus(true);

    //computes computation time
    let currentStageTime = new Date();

    try {

        logger.info('info', `Start Validation for ${JSON.stringify(heatMapRequest)}`);

        //validation
        await heatMapConfigurationValidation(heatMapRequest)
            .catch(err => {
                logger.log('error', `Failing to validate heatmap request: ${err.message}`);
                throw Error(`Validation fails: ${err.message}`);
            });

        logger.log('info', `Fetching Dataset Analysis`);

        //dataset analysis
        const datasetAnalysis = await analysisService.getAnalysisCached({
            database: heatMapRequest.database,
            policy: heatMapRequest.policy,
            startInterval: heatMapRequest.startInterval,
            endInterval: heatMapRequest.endInterval,
            analysisType: constants.ANALYSIS.TYPES.DATASET,
            visualizationFlag: 'server',
        })
            .catch(err => {
                logger.log('error', `Failing to fetch dataset analysis: ${err.message}`);
                throw Error(`Fetching Dataset Analysis fails: ${err.message}`);
            });

        logger.log('info', `Fetching Measurements Analysis`);

        //measurements analysis
        const measurementsAnalysis = await analysisService.getAnalysisCached({
            database: heatMapRequest.database,
            policy: heatMapRequest.policy,
            startInterval: heatMapRequest.startInterval,
            endInterval: heatMapRequest.endInterval,
            analysisType: constants.ANALYSIS.TYPES.MEASUREMENTS,
            visualizationFlag: 'server',
        })
            .catch(err => {
                logger.log('error', `Failing to fetch measurements analysis: ${err.message}`);
                throw Error(`Fetching Measurements Analysis fails: ${err.message}`);
            });

        logger.log('info', `Start HeatMap Construction`);

        //construction
        const canvas = await heatMapConstruction(
            {
                request: heatMapRequest,
                analysis: {
                    datasetAnalysis: datasetAnalysis,
                    measurementsAnalysis: measurementsAnalysis,
                },
            })
            .catch(error => {
                logger.log('error', `Failing to build the HeatMap Image: ${error.message}`);
                throw Error(`Construction fails: ${error.message}`);
            });

        logger.log('info', `Start image storing`);

        //storing
        await heatMapCanvasToImage(
            {
                canvas: canvas,
                request: heatMapRequest,
                imageType: imageType,
            })
            .catch(error => {
                logger.log('error', `Failing to store the HeatMap Image: ${error.message}`);
                throw Error(`Storing fails: ${error.message}`);
            });

        logger.log('info', `BuildNStore process completed`);

        //computes computation time
        let timeEnd = new Date();
        let timeDiff = (timeEnd.getTime() - currentStageTime.getTime());
        logger.log('info', `HeatMap Image built and stored in ${((timeDiff / 1000) / 60).toFixed(2)} minutes`);

        return 'OK';

    } catch (error) {

        throw Error(error.message); //re-throwing error

    } finally {

        globals.setHeatMapComputationStatus(false);
    }
};

const sortMeasurementsByFieldByStatsType = (measurementsAnalysis, fieldIndex, type) => {

    return measurementsAnalysis.sort(function (a, b) {

        return a.fieldsStats[fieldIndex][type] < b['stats'][fieldIndex][type];
    });
};

const heatMapConstruction = async (
    {
        request = x`Computation Request`,
        analysis = x`Analysis`,
    }

    ) => {

    //sorts the measurements analysis
    //the order of each measurement in the measurements analysis is used to build different heatmaps
    let measurementsAnalysis = analysis.measurementsAnalysis;

    //return the field index (of the requested field) in the list of fields within the fieldsStats array
    const fieldIndex = analysis.datasetAnalysis.fieldsStats.map(entry => entry.field).indexOf(request.fields[0]);

    logger.log('info', `Sorting Measurements Stats according to HeatMap Type [${request.heatMapType}] for the field ` +
                       `[${request.fields[0]} with Field Index: ${fieldIndex}]`);

    switch (request.heatMapType) {

        case constants.HEATMAPS.TYPES.SORT_BY_MACHINE:

            break;

        case constants.HEATMAPS.TYPES.SORT_BY_SUM:

            measurementsAnalysis =
                sortMeasurementsByFieldByStatsType(
                    measurementsAnalysis,
                    fieldIndex,
                    'sum');

            break;

        case constants.HEATMAPS.TYPES.SORT_BY_TS_OF_MAX_VALUE:

            measurementsAnalysis =
                sortMeasurementsByFieldByStatsType(
                    measurementsAnalysis,
                    fieldIndex,
                    'max_ts');

            break;

        default:
            break;
    }

    //update the measurement analysis (eventually) sorted
    analysis.measurementsAnalysis = measurementsAnalysis;

    logger.log('info', `Sorted Measurements Analysis updated`);

    return drawHeatMap(
        {
            request: request,
            analysis: analysis,
        })
        .catch(error => {
            logger.log('error', `Failed during HeatMap Drawing: ${error.message}`);
            throw Error(`Drawing HeatMap fails: ${error.message}`);
        });
};

/* HeatMap Configuration Validation */

const validateDatabaseArgs = async (database, policy, fields) => {

    const [databases, policies, measurements] = await Promise.all([
        influx.getDatabases(),
        influx.getRetentionPolicies(database),
        influx.fetchMeasurementsListFromHttpApi(database)
    ]).catch(err => {
        logger.log('error', `Failed while fetching databases/policies/measurements name: ${err.message}`);
    });

    if (databases.filter(d => (d.name === database)).length === 0)
        throw Error(`invalid database ${database}`);

    if (policies.filter(p => (p.name === policy)).length === 0)
        throw Error(`invalid policy ${policy}`);

    if (measurements.length === 0)
        throw Error('no measurements available');

    if (fields.length === 0)
        throw Error('missing fields');

    let measurement = measurements[0];
    await influx.getAllFieldsKeyByDatabaseByName(database, measurement)
        .catch(err => {
            throw Error(`Failed while fetching fields keys: ${err.message}`);
        })
        .then(res => {

            let fieldKeys = res.map(k => k.fieldKey);
            if (!fieldKeys.includes(fields[0]))
                throw Error(`${fields[0]} not exists`);
        });
};

const heatMapConfigurationValidation = async (request) => {

    request.database = request.database || x`Database`;
    request.policy = request.policy || x`Policy`;
    request.startInterval = request.startInterval || x`Start Interval`;
    request.endInterval = request.endInterval || x`End Interval`;
    request.fields = request.fields || x`Fields`;
    // request.nMeasurements = request.nMeasurements || x`number of measurements`;
    request.period = request.period || x`Period`;
    request.heatMapType = request.heatMapType || x`HeatMap type`;
    request.palette = request.palette || x`Palette`;

    //database + policy + fields validation
    await validateDatabaseArgs(request.database, request.policy, request.fields)
    .catch(err => {
       logger.log('error', `Failed to validate Database/Policy/Fields: ${err.message}`);
       throw Error(`Validation of Database/Policy/Fields failed`);
    });

    logger.log('info', `Database: [${request.database}] validated ` +
                       `Policy: [${request.policy}] validated ` +
                       `Fields: [${request.fields}] validated`);

    //intervals validation
    let startInterval, endInterval;
    try {

        startInterval = Date.parse(request.startInterval);
        endInterval = Date.parse(request.endInterval);
    }
    catch (e) {
        logger.log('error', `Failed to parse the time interval` +
                            `[${request.startInterval} - ${request.endInterval}]: ${e.message}`);
        throw Error(`invalid interval: [${request.startInterval} - ${request.endInterval}]`);
    }

    //end interval must be equal or greater than start interval
    const diff_time = startInterval - endInterval;
    if (diff_time > 0) {
        logger.log('error', `the start interval [${startInterval}] is greater than the end interval [${endInterval}`);
        throw Error('end interval must be greater or equal then start');
    }

    //number of measurements validation
    if (request.nMeasurements < 0) {
        logger.log('error', `Provided invalid #measurements: ${request.nMeasurements}`);
        throw  Error(`measurements cannot be negative [Default: 0 => all]`);
    }

    //period validation
    if ((request.period % 300) !== 0) {
        logger.log('error', `Provided invalid period: ${request.period}`);
        throw Error('invalid period, must be multiple of 300 (5min)');
    }

    //palette validation
    if (!getPalettes().includes(request.palette)) {
        logger.log('error', `Provided invalid palette: ${request.palette}`);
        throw Error(`invalid palette: ${request.palette} [AVAILABLE: ${getPalettes()}]`);
    }

    //heatmap type validation
    if (!getHeatMapTypes().includes(request.heatMapType)) {
        logger.log('error', `Provided invalid HeatMap type: ${request.heatMapType}`);
        throw Error(`invalid heatmap type [AVAILABLE: ${getHeatMapTypes()}]`);
    }

    return true;
};

module.exports = {
    heatMapConfigurationValidation: heatMapConfigurationValidation,
    heatMapConstruction: heatMapConstruction,
    heatMapBuildAndStore: heatMapBuildAndStore,
    heatMapFetcher: heatMapFetcher,
    heatMapCanvasToImage: heatMapCanvasToImage,
    getHeatMapTypes: getHeatMapTypes,
    getPalettes: getPalettes,
    setZscores: setZscores,
    getZscores: getZscores,
};