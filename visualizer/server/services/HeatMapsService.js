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
const mkdirp = require('mkdirp');   //recursively mkdir in Node.js

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

// const heatMapFetcher = async (
//     {
//         heatMapRequest,
//         imageType = constants.IMAGE_EXTENSIONS.IMAGE_PNG_EXT,
//     }
//
//     ) => {
//
//     heatMapRequest.database = heatMapRequest.database || x`Database is missing`;
//     heatMapRequest.policy = heatMapRequest.policy || x`Policy is missing`;
//     heatMapRequest.startInterval = heatMapRequest.startInterval || x`Start Interval is missing`;
//     heatMapRequest.endInterval = heatMapRequest.endInterval || x`End Interval is missing`;
//     heatMapRequest.fields[0] = heatMapRequest.fields[0] || x`Field is missing`;
//     heatMapRequest.nMeasurements = heatMapRequest.nMeasurements || x`number of measurements is missing`;
//     heatMapRequest.period = heatMapRequest.period || x`Period is missing`;
//     heatMapRequest.heatMapType = heatMapRequest.heatMapType || x`HeatMap Type is missing`;
//     heatMapRequest.palette = heatMapRequest.palette || x`Palette is missing`;
//
//     const filename = filenameGenerator(heatMapRequest);
//
//     logger.log('info', `Requesting ${filename}.${imageType}`);
//
//     //TODO image stored on external service like Amazon S3
//
//     //checks if the heatmap image is already stored
//     //TODO usa mkdirp ?
//     const file = fs.existsSync(`${constants.PATH_HEATMAPS_IMAGES + filename}.${imageType}`);
//
//     if (!file) {
//         logger.log('warn', `Requested ${constants.PATH_HEATMAPS_IMAGES + filename}.${imageType} ` +
//                            `but image has not been computed yet`);
//     }
//
//     //TODO carica heatmap grossa e ritaglia? altre strategie?
//
//
//     //convert image file to base64-encoded string
//     const base64Image = new Buffer(file, 'binary').toString('base64');
//
//     //combine all the strings and return the result
//     return `data:image/${imageType};base64,${base64Image}`;
// };

/* HeatMap Construction */

//TODO storing on external storage service like Amazon S3 and stores the HTTP URLs in a database
//TODO then just fetches to the clients the URL of requested tiles

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

    try {

        const range = Math.abs(max - min);
        const bucket_len = range / palette.length;

        //outliers
        if (value < min) return {r: 255, g: 255, b: 255};   //white
        if (value > max) return {r: 0, g: 0, b: 0};         //black

        //mapping colors to normal distribution
        for (let i = 0, b = min; i < palette.length; ++i, b += bucket_len) {

            //value in the current bucket
            if (value <= b + bucket_len)
                return palette[i];
        }

    } catch(err) {
        throw Error(`Failed during color mapping: ${err}`);
    }
};

const standardize = (
    {
        point,
        field,
        mean,
        std
    }) => {

    try {

        return (point[field] - mean) / std;

    } catch(err) {
        throw Error(`Failed during standardization: ${err}`);
    }
};

/* HeatMap Tiles Builder */

const drawHeatMapTile = async({

    pointsBatch = x`Points Batch`,
    field = x`Field`,
    datasetMean = x`Dataset Mean`,
    datasetStd = x`Dataset Std`,
    palette = x`Palette`,
    width = x`Tile's Width`,
    height = x`Tile's Height`,

}) => {

    if (pointsBatch.length === 0) {

        throw Error(`Failed during HeatMap tiles drawing, the batch provided doesn't have any measurement's points`);
    }

    try {

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

    } catch(err) {
        throw Error(`Failed during HeatMap tiles drawing: ${err}`);
    }
};

const tileStorage = async (
    {
        request,
        canvas,
        zoom,
        xID,
        yID,
        imageType,

    }) => {

    //builds the filename
    const filename = `/tile`;

    //path for storing image
    //retina/zoom
    //x (timestamp => ID starting from 0, according to TMS standard
    //y (# machines => ID starting from 0, according to TMS standard)
    const pathTilesDir =
        process.cwd() +
        constants.PATH_HEATMAPS_IMAGES +
        `/TILES` +
        `/${request.database}` +
        `/${request.policy}` +
        `/${request.heatMapType}` +
        `/${request.fields[0]}` +
        `/${zoom}` +
        `/${xID}` +
        `/${yID}`;

    //check if directory exists, otherwise creates it
    if (!fs.existsSync(pathTilesDir)) {
        mkdirp.sync(pathTilesDir);
    }

    //stores original tile
    await canvasToImage({
        canvas: canvas,
        filename: filename,
        imageType: imageType,
        path: pathTilesDir,
    });
};

const heatMapTilesBuilder = async (
    {
        request,
        measurements,       //from measurement analysis, sorted, only the names
        datasetMean,        //from dataset analysis
        datasetStd,         //from dataset analysis
        imageType = constants.IMAGE_EXTENSIONS.IMAGE_PNG_EXT,
        tileSize = config.HEATMAPS.TILE_SIZE,       //256x256 px
        zoomLevels = config.HEATMAPS.TILE_ZOOMS,    //2x
    }) => {

    const intervals =
        (Date.parse(request.endInterval) - Date.parse(request.startInterval)) / (request.period * 1000) + 1;

    //seconds in a time interval (i.e. the width of the tile)
    const tileTimeRangeWidth = (request.period * tileSize) - request.period;

    let currentStartInterval = new Date(request.startInterval);
    let currentEndInterval = new Date(request.startInterval);
    currentEndInterval.setSeconds(currentEndInterval.getSeconds() + tileTimeRangeWidth);

    for (let i = 0, xIDsrc = 0; i < intervals; i += tileSize, ++xIDsrc) {                 //xID is used for TMS x ID

        for (let j = 0, yIDsrc = 0; j < measurements.length; j += tileSize, ++yIDsrc) {   //yID is used for TMS y ID

            const slicedMeasurements = measurements.slice(j, j + tileSize);

            let formattedCurrentStartInterval = currentStartInterval.toISOString();
            let formattedCurrentEndInterval = currentEndInterval.toISOString();

            if (currentEndInterval > Date.parse(request.endInterval))
                formattedCurrentEndInterval = (new Date(request.endInterval)).toISOString();

            //fetches points batch
            const originalCanvas = await influx.fetchPointsFromHttpApi({
                    database: request.database,
                    policy: request.policy,
                    measurements: slicedMeasurements,
                    startInterval: formattedCurrentStartInterval,
                    endInterval: formattedCurrentEndInterval,
                    period: request.period,
                    fields: request.fields,
                })
                .then(pointsBatch => {

                    //build canvas
                    return drawHeatMapTile({
                        pointsBatch: pointsBatch,
                        field: request.fields[0],
                        datasetMean: datasetMean,
                        datasetStd: datasetStd,
                        palette: request.palette,
                        width: tileSize,
                        height: tileSize,
                    });
                })
                .catch((err) => {
                    throw Error(`Failed during HeatMap Image Tiles building: ${err}`);
                });

            //building the tile's filename according to TMS standard http://.../z/x/y.imagetype
            //TMS providers will fetch a coordinates tuple as (x, y, z) starting from (0, 0, 0), where:
            //x is the axis X (timestamps, 0 is the first timestamp, every 256 timestamp the ID is increased)
            //y is the axis Y (machines, 0 is the first machine, every 256 machines the ID is increased)
            //z is the zoom (0 => 256 pixels, default for tiles)
            //further info on TMS standard: https://wiki.osgeo.org/wiki/Tile_Map_Service_Specification

            logger.log('info', `Storing original Canvas [${xIDsrc},${yIDsrc}]`);

            //save the original tile (level 1)
            await tileStorage({
                request: request,
                canvas: originalCanvas,
                zoom: 0,
                xID: xIDsrc,
                yID: yIDsrc,
                imageType: imageType,
            })
                .catch(err => logger.log('error', `Failed to store the original canvas: ${err.message}`));

            //zooms
            //https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
            for (let i = 0; i < zoomLevels.length; ++i) {

                const zoom = zoomLevels[i];

                //skip 1x zoom (i.e. the original canvas)
                if (config.HEATMAPS.TILE_ZOOMS.includes(zoom)) {

                    logger.log('info', `Start Generating tiles with zoom: ${`@${zoom}x`} ` +
                        `- original: [${xIDsrc},${yIDsrc}]`);

                    const subTileSize = tileSize / zoom;

                    let xID = xIDsrc * zoom;
                    for (let x = 0; x < tileSize; x += subTileSize, ++xID) {

                        let yID = yIDsrc * zoom;
                        for (let y = 0; y < tileSize; y += subTileSize, ++yID) {

                            //generates a new canvas and scales
                            const canvas = Canvas.createCanvas(tileSize, tileSize);
                            const ctx = canvas.getContext("2d");

                            ctx.drawImage(originalCanvas, x, y, subTileSize, subTileSize, 0, 0, tileSize, tileSize);

                            await tileStorage({
                                request: request,
                                canvas: canvas,
                                zoom: zoom,
                                xID: xID,
                                yID: yID,
                                imageType: imageType
                            })
                                .catch(err => logger.log('error', `Failed to store a zoomed [@${zoom}x] tile ` +
                                    `[${xID},${yID}]: ${err.message}`));
                        }
                    }
                }
                else throw Error(`Failed during HeatMap Image Tiles building: ` +
                    `Zoom level not permitted: ${zoom}`);
            }
        }

        //advance with time interval
        currentStartInterval.setSeconds(currentStartInterval.getSeconds() + tileTimeRangeWidth);
        currentEndInterval.setSeconds(currentEndInterval.getSeconds() + tileTimeRangeWidth);
    }

    return 'OK';
};

const drawHeatMap = async ({

    request,
    measurements,
    datasetMean,
    datasetStd,
    imageType,

}) => {

    //computes canvas dimensions

    //width => intervals
    const width =
        (Date.parse(request.endInterval) - Date.parse(request.startInterval)) / (request.period * 1000) + 1;

    //height => measurements
    const height = measurements.length;

    logger.log('info', `Start building ${request.heatMapType} HeatMap for ${request.fields[0]}`);

    //palette RGBs
    const palette = getPalettesRGB(request.palette);

    //canvas
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

        const points = await influx.fetchPointsFromHttpApi({
            database: request.database,
            policy: request.policy,
            measurements: [measurements[i]],            //decides the order, accepts array => need to encapsulate
            startInterval: request.startInterval,
            endInterval: request.endInterval,
            period: request.period,
            fields: request.fields,
        })
        .catch(err => {
            throw Error(`Failed to fetch points: ${err.message}`);
        });

        if (points.length === 0) {

            throw Error(`No points available in the timeserie [${measurements[i]}]`);
        }

        //drawing pixels
        points.forEach((point, index) => {

            let standardizedPoint = standardize({
                point: point,
                fields: request.fields[0],
                mean: datasetMean,
                std: datasetStd
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

    logger.log('info',
        `Canvas generation completed, now starts to convert the canvas in ${imageType}`);

    const formattedStartInterval = (new Date(request.startInterval)).toISOString();
    const formattedEndInterval = (new Date(request.endInterval)).toISOString();

    //builds the filename
    const filename =
        `/HEATMAP_` +
        `${request.database}_` +
        `${request.policy}_` +
        `${formattedStartInterval}_` +
        `${formattedEndInterval}_` +
        `${request.period}_` +
        `${request.fields[0]}_` +
        `${request.heatMapType}_` +
        `${request.palette}_`;

    //path for storing image
    const pathImageDir =
        process.cwd() +
        constants.PATH_HEATMAPS_IMAGES +
        `/HEATMAPS` +
        `/${request.database}` +
        `/${request.policy}` +
        `/${request.heatMapType}` +
        `/${request.fields[0]}` +
        `/${request.palette}`;

    //check if directory exists, otherwise creates it
    if (!fs.existsSync(pathTilesDir)) {
        mkdirp.sync(pathTilesDir);
    }

    return canvasToImage({
        canvas: canvas,
        filename: filename,
        imageType: imageType,
        path: path,
    })
        .catch(err => {
            throw Error(`Failed to convert canvas to image: ${err.message}`);
        });
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
        mode = constants.HEATMAPS.MODES.TILES,    //single | tiles
        tileSize = 256,
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

        logger.log('info', `Sorting Measurement Analysis according to the type of HeatMap requested`);

        //return the field index (of the requested field) in the list of fields within the fieldsStats array
        const fieldIndex = datasetAnalysis.fieldsStats.map(entry => entry.field).indexOf(request.fields[0]);

        //sorts measurement analysis according to the type of HeatMap requested
        let measurementsAnalysisSorted = await heatMapMeasurementsSorting({
            heatMapType: request.heatMapType,
            measurementsAnalysis: measurementsAnalysis,
            field: request.fields[0],
            fieldIndex: fieldIndex,
        });

        //subset of measurements selected
        if (request.nMeasurements > 0) {

            logger.log('info',
                `Selecting a subset of measurements: ${request.nMeasurements}/${measurementsAnalysis.length}`);

            measurementsAnalysisSorted = measurementsAnalysisSorted.slice(0, request.nMeasurements);
        }

        logger.log('info', `Start HeatMap Construction [MODE: ${mode}]`);

        //fetches only the names, sorted according to the HeatMap type requested
        const measurementsNames = measurementsAnalysisSorted.map(m => m.measurement);

        //mean and std of the dataset, used for color mapping and standardization of points
        const datasetMean = datasetAnalysis.fieldsStats[fieldIndex].mean;
        const datasetStd = datasetAnalysis.fieldsStats[fieldIndex].std;

        //construction
        switch (mode) {

            case constants.HEATMAPS.MODES.SINGLE_IMAGE:

                await drawHeatMap(
                    {
                        request: request,
                        measurements: measurementsNames,
                        datasetMean: datasetMean,
                        datasetStd: datasetStd,
                        imageType: imageType
                    })
                    .catch(error => {
                        logger.log('error', `Failing to build the HeatMap Image: ${error.message}`);
                        throw Error(`Construction of the single image HeatMap fails`);
                    });

                break;

            case constants.HEATMAPS.MODES.TILES:

                await heatMapTilesBuilder(
                    {
                        request: request,
                        measurements: measurementsNames,
                        datasetMean: datasetMean,
                        datasetStd: datasetStd,
                        imageType: imageType,
                        tileSize: tileSize,
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
    request.fields = request.fields || x`Fields`;

    //database + policy + fields validation
    await validateDatabaseArgs(request.database, request.policy, request.fields) //field accepts array
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

    return true;
};

module.exports = {
    heatMapConfigurationValidation: heatMapConfigurationValidation,
    heatMapBuildAndStore: heatMapBuildAndStore,
    getHeatMapTypes: getHeatMapTypes,
    getPalettes: getPalettes,
    setZscores: setZscores,
    getZscores: getZscores,
};