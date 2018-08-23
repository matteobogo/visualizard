require('datejs');

const logger = require('../config/winston');

const config = require('../config/config');
const constants = require('../utils/constants');

const influx = require('../database/influxdb');
const analysisService = require('../services/AnalysisService');

const util = require('util');
const fs = require('fs');
const path = require('path');

const readFile = util.promisify(fs.readFile);
const Canvas = require('canvas');

const getPalettesRGB = (palette) => {

    if (constants.PALETTES.hasOwnProperty(palette)) {

        return constants.PALETTES[palette.uppercase()].RGB_SCALE;
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
    let file = await fs.existsSync(`${constants.PATH_HEATMAPS_IMAGES + filename}.${imageType}`);

    //heatmap image doesn't exist, build it
    if (!file) {

        logger.log('info', `${filename}.${imageType} not exist, start building it`);

        //obtain dataset analysis
        logger.log('info', `Fetching Dataset Analysis for ${filename}`);
        let analysis = await analysisService.getAnalysisCached({
            database: heatMapRequest.database,
            policy: heatMapRequest.policy,
            startInterval: heatMapRequest.startInterval,
            endInterval: heatMapRequest.endInterval,
            analysisType: constants.ANALYSIS.TYPES.DATASET,
            visualizationFlag: 'server',
        });

        if (!analysis) {

            logger.log('warn', `Dataset Analysis not available during HeatMap construction`);
            throw Error('HeatMap service not available');
        }

        logger.log('info', `Start building HeatMap Image and stores it`);

        //builds and stores the image
        const result = await heatMapBuildAndStore({
            heatMapRequest: heatMapRequest,
            imageType: imageType,

            // analysis | null - tell to BuildAndStore to avoid dataset analysis computation and build only the image
            analysis: analysis,
        });

        if (!result || result !== 'OK') {

            logger.log('error', `Failed to build and store the HeatMap image`);
            throw Error('HeatMap service not available, sorry for the inconvenience');
        }

        logger.log('info', `HeatMap stored, fetching it and sends back the base64 encode`);

        //fetch the stored image and send back the 64 encode representation
        file = await readFile(`${constants.PATH_HEATMAPS_IMAGES + filename}.${imageType}`);

        if (!file) {

            logger.log('error', `${filename}.${imageType} not exist after buildNStore process`);
            throw Error('HeatMap service not available, sorry for the inconvenience');
        }
    }

    //convert image file to base64-encoded string
    const base64Image = new Buffer(file, 'binary').toString('base64');

    //combine all the strings and return the result
    return `data:image/${imageType};base64,${base64Image}`;
};

/* HeatMap Construction */

const heatMapCanvasToImage = async (
    {
        canvas,
        heatMapRequest,
        imageType,
    }) => {

    const filename = filenameGenerator(heatMapRequest);
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

    const width = analysis.intervals;
    const height = analysis.timeseries;

    console.log(`Start building ${request.heatMapType} HeatMap for ${request.fields[0]}`);

    //palette RGBs
    const palette = getPalettesRGB(request.palette);

    //canvas
    console.log(`Generating Canvas [${width}x${height}]`);
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    for (let i = 0, l = 0; i < height; ++i) {

        let err, points;
        [err, points] = await to(influx.fetchPointsFromHttpApi(
            request.database,
            request.policy,
            analysis.measurementStats[i].measurement, //decides the order
            request.startInterval,
            request.endInterval,
            request.period,
            request.fields
        ));

        if (err) {

            console.log(err);
            throw new Error('error fetching points from timeseries');
        }

        if (points.length === 0) {

            throw new Error(`no points available for ${analysis.measurementStats[i].measurement}`);
        }

        //drawing pixels
        points.forEach((point, index) => {

            let standardizedPoint = standardize(
                point,
                request.fields[0],
                analysis.datasetStats[request.fields[0]].mean,
                analysis.datasetStats[request.fields[0]].std
            );

            let colorizedPoint = colorize(standardizedPoint, minZscore, maxZscore, palette);

            ctx.fillStyle = `rgb(${colorizedPoint.r},${colorizedPoint.g},${colorizedPoint.b})`;
            ctx.fillRect(index, i, 1, 1);
        });
    }

    return canvas;
};

const heatMapBuildAndStore = async (

    {
        heatMapRequest,
        imageType,
    }

) => {

    logger.info('info', `Start Validation for ${JSON.stringify(heatMapRequest)}`);

    //validation
    await heatMapConfigurationValidation(heatMapRequest)
        .catch(err => {
            logger.log('error', `Failing to validate heatmap request: ${err.message}`);
            throw Error(`Validation fails: ${error.message}`);
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
            console.log(error);
            throw new Error(`Construction fails: ${error.message}`);
        });

    console.log(`Start images storing`);

    //storing
    const stored = await heatMapCanvasToImage(
        {
            canvas: canvas,
            request: heatMapRequest,
            imageType: imageType,
        })
        .then(data => { return data; })
        .catch(error => {
            console.log(error);
            throw new Error(`Storing fails: ${error.message}`);
        });

    console.log(`BuildNStore process completed`);

    return 'OK';
};

const sortMeasurementsByFieldByStatsType = (measurementsAnalysis, field, type) => {

    return measurementsAnalysis.slice().sort(function (a, b) {

        return a['stats'][field][type] < b['stats'][field][type];
    });
};

const heatMapConstruction = async (
    {
        request = x`Computation Request`,
        analysis = x`Analysis`,
    }

    ) => {

    console.log(analysis.measurementsAnalysis);
    process.exit(1)

    //sorts the measurements analysis
    //the order of each measurement in the measurements analysis is used to build different heatmaps
    let measurementsAnalysis = analysis.measurementsAnalysis;
    switch (request.heatMapType) {

        case constants.HEATMAPS.TYPES.BY_MACHINE:

            break;

        case constants.HEATMAPS.TYPES.BY_SUM:

            measurementsAnalysis =
                sortMeasurementsByFieldByStatsType(
                    measurementsAnalysis,
                    request.fields[0],
                    'sum');

            break;

        case constants.HEATMAPS.TYPES.BY_TS_OF_MAX_VALUE:

            measurementsAnalysis =
                sortMeasurementsByFieldByStatsType(
                    measurementsAnalysis,
                    request.fields[0],
                    'max_ts');

            break;

        default:
            break;
    }

    analysis.measurementsAnalysis = measurementsAnalysis;

    return drawHeatMap(
        {
            request: request,
            analysis: analysis,
        })
        .then(data => {
            return data;
        })
        .catch(error => {
            console.log(error);
            throw new Error(`Drawing HeatMap fails: ${error.message}`);
        });
};

/* HeatMap Configuration Validation */

const validateDatabaseArgs = async (dbname, policy, fields) => {

    const [dbs, policies, measurements] = await Promise.all([
        influx.getDatabases(),
        influx.getRetentionPolicies(dbname),
        influx.fetchMeasurementsListFromHttpApi(dbname)
    ]).catch(err => { throw new Error('timeseries unavailable');});

    if (dbs.filter(d => (d.name === dbname)).length === 0)
        throw new Error(`invalid database ${dbname}`);

    if (policies.filter(p => (p.name === policy)).length === 0)
        throw new Error(`invalid policy ${policy}`);

    if (measurements.length === 0) throw new Error('no measurements available');
    if (fields.length === 0) throw new Error('missing field');

    let measurement = measurements[0];
    await influx.getAllFieldsKeyByDatabaseByName(dbname, measurement)
        .catch(err => { throw new Error('no points available'); })
        .then(res => {

            let fieldKeys = res.map(k => k.fieldKey);
            if (!fieldKeys.includes(fields[0])) throw new Error('wrong fields');
        });
};

const heatMapConfigurationValidation = async (request) => {

    request.database = request.database || x`Database`;
    request.policy = request.policy || x`Policy`;
    request.startInterval = request.startInterval || x`Start Interval`;
    request.endInterval = request.endInterval || x`End Interval`;
    request.fields = request.fields || x`Fields`;
    request.nMeasurements = request.nMeasurements || x`number of measurements`;
    request.period = request.period || x`Period`;
    request.heatMapType = request.heatMapType || x`HeatMap type`;
    request.palette = request.palette || x`Palette`;

    //database + policy + fields validation
    await validateDatabaseArgs(request.database, request.policy, request.fields)
    .catch(err => {
       logger.log('error', `Failed to validate Database/Policy/Fields: ${err.message}`);
       throw Error(`Validation of Database/Policy/Fields failed`);
    });

    logger.log('info', `Database: [${request.database}] validated\n` +
                       `Policy: [${request.policy}] validated\n` +
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
};