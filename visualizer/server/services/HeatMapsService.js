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

const canvasToImage = async (
    {
        canvas,
        filename,
        imageType,
        path,
    }) => {

    const finishMsg = `Storing ${path+filename}.${imageType}`;

    switch (imageType) {

        case constants.IMAGE_EXTENSIONS.IMAGE_PNG_EXT:

            return canvas
                .createPNGStream()
                .pipe(fs.createWriteStream(path + `${filename}.${imageType}`))
                .on('finish', () => logger.log('info', finishMsg));

        case constants.IMAGE_EXTENSIONS.IMAGE_JPEG_EXT:

            return canvas
                .createJPEGStream()
                .pipe(fs.createWriteStream(path + `${filename}.${imageType}`))
                .on('finish', () => logger.log('info', finishMsg));

        case constants.IMAGE_EXTENSIONS.IMAGE_PDF_EXT:

            return canvas
                .createPDFStream()
                .pipe(fs.createWriteStream(path + `${filename}.${imageType}`))
                .on('finish', () => logger.log('info', finishMsg));

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

const standardize = ({point, field, mean, std}) => {

    return (point[field] - mean) / std;
};

const drawHeatMapTile = async({

    pointsBatch = x`Points Batch`,
    field = x`Field`,
    datasetMean = x`Dataset Mean`,
    datasetStd = x`Dataset Std`,
    palette = x`Palette`,
    width = x`Tile's Width`,
    height = x`Tile's Height`

}) => {

    if (pointsBatch.length === 0) {
        logger.log('error', `The batch provided doesn't have any measurement's points`);
        throw Error(`Failing to draw HeatMap's tiles`);
    }

    //palette RGBs
    const paletteRGB = getPalettesRGB(palette);

    //canvas
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    pointsBatch.forEach((entry, indexY) => {

        //drawing pixels line
        entry.forEach((point, indexX) => {

            //standardization
            const standardizedPoint = standardize({
                point: point,
                field: field,
                mean: datasetMean,
                std: datasetStd,
            });

            //color mapping
            const colorizedPoint = colorize({
                value: standardizedPoint,
                min: minZscore,
                max: maxZscore,
                palette: paletteRGB,
            });

            ctx.fillStyle = `rgb(${colorizedPoint.r},${colorizedPoint.g},${colorizedPoint.b})`;
            ctx.fillRect(indexX, indexY, 1, 1);
        });
    });

    return canvas;
};

const heatMapTilesBuilder = async (
    {
        request,
        measurements,       //from measurement analysis, sorted, only the names
        datasetMean,        //from dataset analysis
        datasetStd,         //from dataset analysis
        imageType = constants.IMAGE_EXTENSIONS.IMAGE_PNG_EXT,
    }) => {

    const intervals =
        (Date.parse(request.endInterval) - Date.parse(request.startInterval)) / (request.period * 1000) + 1;

    //seconds in a time interval (i.e. the width of the tile)
    const tileTimeRangeWidth = (request.period * config.HEATMAPS.TILE_WIDTH) - request.period;

    let currentStartInterval = new Date(request.startInterval);
    let currentEndInterval = new Date(request.startInterval);
    currentEndInterval.setSeconds(currentEndInterval.getSeconds() + tileTimeRangeWidth);

    for (let i = 0; i < intervals; i += config.HEATMAPS.TILE_WIDTH) {

        for (let j = 0; j < measurements.length; j += config.HEATMAPS.TILE_HEIGHT) {

            const slicedMeasurements = measurements.slice(j, j + config.HEATMAPS.TILE_HEIGHT);

            let formattedCurrentStartInterval = currentStartInterval.toISOString();
            let formattedCurrentEndInterval = currentEndInterval.toISOString();

            if (currentEndInterval > Date.parse(request.endInterval))
                formattedCurrentEndInterval = (new Date(request.endInterval)).toISOString();

            //fetches points batch
            await influx.fetchPointsFromHttpApi({
                    database: request.database,
                    policy: request.policy,
                    measurements: slicedMeasurements,
                    startInterval: formattedCurrentStartInterval,
                    endInterval: formattedCurrentEndInterval,
                    period: request.period,
                    fields: request.fields,
                })
                .then(pointsBatch => {

                    if (pointsBatch.length === 0)
                        console.log(pointsBatch);

                    //build canvas
                    return drawHeatMapTile({
                        pointsBatch: pointsBatch,
                        field: request.fields[0],
                        datasetMean: datasetMean,
                        datasetStd: datasetStd,
                        palette: request.palette,
                        width: config.HEATMAPS.TILE_WIDTH,
                        height: config.HEATMAPS.TILE_HEIGHT,
                    });
                })
                .then(canvas => {

                    //builds the filename
                    const filename =
                        `/TILE_` +
                        `${request.database}_` +
                        `${request.policy}_` +
                        `${formattedCurrentStartInterval}_` +
                        `${formattedCurrentEndInterval}_` +
                        `${request.period}_` +
                        `${request.fields[0]}_` +
                        `${request.heatMapType}_` +
                        `${request.palette}_` +
                        `${j}_${(j + slicedMeasurements.length) - 1}`;

                    //path for storing image
                    const pathTilesDir = constants.PATH_HEATMAPS_IMAGES+`/${request.database}`;
                    if (!fs.existsSync(pathTilesDir)) {
                        fs.mkdirSync(pathTilesDir);
                    }

                    //stores tile
                    return canvasToImage({
                        canvas: canvas,
                        filename: filename,
                        imageType: imageType,
                        path: pathTilesDir,
                    })
                })
                .catch((err) => {
                    logger.log('error', `Failed during HeatMap Image Tiles building: ${err}`);
                });
        }

        //advance with time interval
        currentStartInterval.setSeconds(currentStartInterval.getSeconds() + tileTimeRangeWidth);
        currentEndInterval.setSeconds(currentEndInterval.getSeconds() + tileTimeRangeWidth);
    }
    return 'OK';
};

const drawHeatMap = async ({

    request,
    analysis,
    fieldIndex,

}) => {

    //computes canvas dimensions
    const width = analysis.datasetAnalysis.intervals;
    let height = analysis.measurementsAnalysis.length; //number of measurements to compute

    logger.log('info', `Start building ${request.heatMapType} HeatMap for ${request.fields[0]}`);

    //palette RGBs
    const palette = getPalettesRGB(request.palette);

    //canvas
    //logger.log('info', `Generating Canvas [${width}x${height}]`);
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
        const points = await influx.fetchPointsFromHttpApi({
            database: request.database,
            policy: request.policy,
            measurements: [measurement],            //decides the order
            startInterval: request.startInterval,
            endInterval: request.endInterval,
            period: request.period,
            fields: request.fields,
        })
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

            let standardizedPoint = standardize({
                point: point,
                fields: request.fields[0],
                mean: analysis.datasetAnalysis.fieldsStats[fieldIndex].mean,
                std: analysis.datasetAnalysis.fieldsStats[fieldIndex].std
            });

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

const heatMapMeasurementsSorting = async (
    {
        heatMapType = x`HeatMap Type`,
        measurementsAnalysis = x`Analysis`,
        field = x`Field`,
        fieldIndex = x`Field Index of Dataset Analysis`
    }) => {

    logger.log('info', `Sorting Measurements Stats according to HeatMap Type [${heatMapType}] for the field ` +
        `[${field} with Field Index: ${fieldIndex}]`);

    //sorts the measurements analysis
    //the order of each measurement in the measurements analysis is used to build different heatmaps
    let measurementsAnalysisSorted = measurementsAnalysis;
    switch (heatMapType) {

        case constants.HEATMAPS.TYPES.SORT_BY_MACHINE:

            break;

        case constants.HEATMAPS.TYPES.SORT_BY_SUM:

            measurementsAnalysisSorted =
                sortMeasurementsByFieldByStatsType(
                    measurementsAnalysis,
                    fieldIndex,
                    'sum');

            break;

        case constants.HEATMAPS.TYPES.SORT_BY_TS_OF_MAX_VALUE:

            measurementsAnalysisSorted =
                sortMeasurementsByFieldByStatsType(
                    measurementsAnalysis,
                    fieldIndex,
                    'max_ts');

            break;

        default:
            break;
    }

    logger.log('info', `Sorted Measurements Analysis updated`);

    return measurementsAnalysisSorted;
};

const heatMapBuildAndStore = async (
    {
        request = x`HeatMap request`,
        imageType = x`Image Type`,
        mode = constants.HEATMAPS.MODES.TILES    //single | tiles
    }) => {

    //sets computation in progress (global)
    globals.setHeatMapComputationStatus(true);

    //computes computation time
    let currentStageTime = new Date();

    try {

        logger.info('info', `Start Validation for ${JSON.stringify(request)}`);

        //validation
        await heatMapConfigurationValidation(request)
            .catch(err => {
                logger.log('error', `Failing to validate heatmap request: ${err.message}`);
                throw Error(`Validation fails: ${err.message}`);
            });

        logger.log('info', `Fetching Dataset Analysis`);

        //dataset analysis
        const datasetAnalysis = await analysisService.getAnalysisCached({
            database: request.database,
            policy: request.policy,
            startInterval: request.startInterval,
            endInterval: request.endInterval,
            analysisType: constants.ANALYSIS.TYPES.DATASET,
            visualizationFlag: 'server',
        })
            .catch(err => {
                logger.log('error', `Failing to fetch dataset analysis: ${err.message}`);
                throw Error(`Fetching Dataset Analysis fails: ${err.message}`);
            });

        logger.log('info', `Fetching Measurements Analysis`);

        //measurements analysis
        let measurementsAnalysis = await analysisService.getAnalysisCached({
            database: request.database,
            policy: request.policy,
            startInterval: request.startInterval,
            endInterval: request.endInterval,
            analysisType: constants.ANALYSIS.TYPES.MEASUREMENTS,
            visualizationFlag: 'server',
        })
            .catch(err => {
                logger.log('error', `Failing to fetch measurements analysis: ${err.message}`);
                throw Error(`Fetching Measurements Analysis fails: ${err.message}`);
            });

        logger.log('info', `Start HeatMap Construction [MODE: ${mode}]`);

        //return the field index (of the requested field) in the list of fields within the fieldsStats array
        const fieldIndex = datasetAnalysis.fieldsStats.map(entry => entry.field).indexOf(request.fields[0]);

        //sorts measurement analysis according to the type of HeatMap requested
        const measurementsAnalysisSorted = await heatMapMeasurementsSorting({
            heatMapType: request.heatMapType,
            measurementsAnalysis: measurementsAnalysis,
            field: request.fields[0],
            fieldIndex: fieldIndex,
        });

        //subset of measurements selected
        if (request.nMeasurements > 0) {
            measurementsAnalysis = measurementsAnalysisSorted.slice(0, request.nMeasurements);
        }

        //slices measurements if we want only a subset of them
        // if (request.nMeasurements > 0) {    // 0 means all the measurements
        //     analysisSorted.measurementsAnalysis = analysisSorted.measurementsAnalysis.slice(0, request.nMeasurements);
        // }

        //construction
        switch (mode) {

            case constants.HEATMAPS.MODES.SINGLE_IMAGE:

                //builds canvas
                await drawHeatMap(
                    {
                        request: request,
                        analysis: measurementsAnalysis,
                        fieldIndex: fieldIndex,
                    })
                    .then(canvas => {

                        return canvasToImage(
                            {
                                canvas: canvas,
                                request: request,
                                imageType: imageType,
                            });
                    })
                    .catch(error => {
                        logger.log('error', `Failing to build the HeatMap Image: ${error.message}`);
                        throw Error(`Construction of the single image HeatMap fails`);
                    });

                break;

            case constants.HEATMAPS.MODES.TILES:

                await heatMapTilesBuilder({
                    request: request,
                    measurements: measurementsAnalysis.map(m => m.measurement), //fetches only the names, sorted
                    datasetMean: datasetAnalysis.fieldsStats[fieldIndex].mean,
                    datasetStd: datasetAnalysis.fieldsStats[fieldIndex].std,
                    imageType: imageType,
                })
                    .catch(err => {
                        logger.log('error', `Failing to build the HeatMap Image Tiles: ${err.message}`);
                        throw Error(`Construction of the HeatMap Image Tiles fails`);
                    });
        }

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
    request.field = request.field || x`Fields`;
    // request.nMeasurements = request.nMeasurements || x`number of measurements`;
    request.period = request.period || x`Period`;
    request.heatMapType = request.heatMapType || x`HeatMap type`;
    request.palette = request.palette || x`Palette`;

    //database + policy + fields validation
    await validateDatabaseArgs(request.database, request.policy, [request.field])
    .catch(err => {
       logger.log('error', `Failed to validate Database/Policy/Fields: ${err.message}`);
       throw Error(`Validation of Database/Policy/Fields failed`);
    });

    logger.log('info', `Database: [${request.database}] validated ` +
                       `Policy: [${request.policy}] validated ` +
                       `Fields: [${request.field}] validated`);

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
    heatMapBuildAndStore: heatMapBuildAndStore,
    heatMapFetcher: heatMapFetcher,
    getHeatMapTypes: getHeatMapTypes,
    getPalettes: getPalettes,
    setZscores: setZscores,
    getZscores: getZscores,
};