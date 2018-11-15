require('datejs');
const gf = require('../utils/global_functions');

const logger = require('../config/winston');

const config = require('../config/config');
const constants = require('../utils/constants');
const sharedConstants = require('../commons/constants');
const globals = require('../utils/globals');

const ConfigurationsModel = require('../models/Configurations');

const influx = require('../database/influxdb');
const analysisService = require('../services/AnalysisService');

const util = require('util');
const fs = require('fs');
const pathjs = require('path');
const mkdirp = require('mkdirp');   //recursively mkdir in Node.js

const readFile = util.promisify(fs.readFile);
const Canvas = require('canvas');

const getDirsListByPath = (path, flags) => {

    flags.toInt = !flags.toInt ? true : flags.toInt;
    flags.sort = !flags.sort || !['asc', 'desc', 'none'].includes(flags.sort) ? 'asc' : flags.sort;

    if (!fs.existsSync(path)) throw Error(`path [${path}] not exist`);

    const dirs = fs.readdirSync(path).filter(f => fs.statSync(pathjs.join(path, f)).isDirectory());

    if (dirs.length === 0) {

        logger.log('warn', `during dirs fetching of path [${path}] any sub-folder have been found`);
        return [];
    }

    if (flags.toInt) dirs.map(e => parseInt(e, 10)) ;

    let fsort;
    if (flags.sort === 'asc') fsort = (a, b) => a - b;
    else if (flags.sort === 'desc') fsort = (a, b) => b - a;
    else return dirs;

    return dirs.sort(fsort);
};

const getPalettesRGB = (palette) => {

    if (constants.PALETTES.hasOwnProperty(palette)) {

        return constants.PALETTES[palette.toUpperCase()].RGB_SCALE;
    }
    else throw Error(`palette ${palette} not available`);
};

const getPalettesBounds = (palette) => {

    if (constants.PALETTES.hasOwnProperty(palette)) {

        return [
            constants.PALETTES[palette.toUpperCase()].OUTLIER_MIN,
            constants.PALETTES[palette.toUpperCase()].OUTLIER_MAX
        ];
    }
};

const getPalettes = () => {

    return Object.keys(constants.PALETTES);
};

const getHeatMapTypes = () => {

    return Object.keys(constants.HEATMAPS.TYPES);
};

const getZoomLevels = ({database, policy}) => {   //TODO use also heatMapType and field for granularity?

    const query = {database: database, policy: policy};

    return new Promise((resolve, reject) => {

        ConfigurationsModel.findOne(query, 'heatMapZooms', (err, result) => {

            if (err) {
                logger.log('error', `Failed during gotcha zoom levels in any heatmap config: ${err}`);
                reject(`cannot find zoom levels`);
            }

            resolve(result.heatMapZooms);
        });
    });
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

    return new Promise((resolve, reject) => {

        const finishMsg = `Storing ${path+filename}.${imageType}`;

        switch (imageType) {

            case constants.IMAGE_EXTENSIONS.IMAGE_PNG_EXT:

                canvas
                    .createPNGStream()
                    .pipe(fs.createWriteStream(path + `${filename}.${imageType}`))
                    .on('finish', () => {
                        logger.log('info', finishMsg);
                        resolve();
                    });
                break;

            case constants.IMAGE_EXTENSIONS.IMAGE_JPEG_EXT:

                canvas
                    .createJPEGStream()
                    .pipe(fs.createWriteStream(path + `${filename}.${imageType}`))
                    .on('finish', () => {
                        logger.log('info', finishMsg);
                        resolve();
                    });
                break;

            case constants.IMAGE_EXTENSIONS.IMAGE_PDF_EXT:

                canvas
                    .createPDFStream()
                    .pipe(fs.createWriteStream(path + `${filename}.${imageType}`))
                    .on('finish', () => {
                        logger.log('info', finishMsg);
                        resolve();
                    });
                break;

            default:
                reject(`media type not supported: ${imageType}`);
        }
    })
};

const colorize = ( //value must be standardized first
    {
        value,
        min,
        max,
        palette,
    }) => {

    try {

        //palette RGBs
        const paletteRGB = getPalettesRGB(palette);
        let paletteMin, paletteMax;
        [paletteMin, paletteMax] = getPalettesBounds(palette);

        const range = Math.abs(max - min);
        const bucket_len = range / paletteRGB.length;

        //outliers
        if (value < min) return paletteMin;
        if (value > max) return paletteMax;

        //mapping colors to normal distribution
        for (let i = 0, b = min; i < paletteRGB.length; ++i, b += bucket_len) {

            //value in the current bucket
            if (value <= b + bucket_len)
                return paletteRGB[i];
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

    pointsBatch = gf.checkParam`Points Batch`,
    field = gf.checkParam`Field`,
    datasetMean = gf.checkParam`Dataset Mean`,
    datasetStd = gf.checkParam`Dataset Std`,
    palette = gf.checkParam`Palette`,
    width = gf.checkParam`Tile's Width`,
    height = gf.checkParam`Tile's Height`,

}) => {

    if (pointsBatch.length === 0) {

        throw Error(`Failed during HeatMap tiles drawing, the batch provided doesn't have any measurement's points`);
    }

    try {

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
                    palette: palette,
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
        pathjs.join(
            process.cwd(),
            constants.PATH_HEATMAPS_TILES,
            request.database,
            request.policy,
            request.heatMapType,
            request.fields[0],
            zoom.toString(),
            xID.toString(),
            yID.toString()
        );

    //check if directory exists, otherwise creates it
    if (!fs.existsSync(pathTilesDir)) {
        mkdirp.sync(pathTilesDir);
    }

    //stores original tile
    return canvasToImage({
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
        imageType,
        tileSize,
        zoomInLevels
    }) => {

    const intervals =
        (Date.parse(request.endInterval) - Date.parse(request.startInterval)) / (request.period * 1000) + 1;

    //check if the number of intervals is a power of two
    //this is necessary to generate zooms levels according to max horizontal tiles
    //e.g. 8192 intervals is 2^13. 8192 / 512 = 16. we have the max level of zooming is 16:1 for maintaining the 512px
    if (!gf.checkIfPowerOfTwo(intervals)) throw Error(`the number of intervals must be a power of two: ${intervals}`);

    //max width of the minimum zoom (parent) for the heatmap
    //it is computed using the size of the tiles and the max nr. of tiles in width
    const minZoomOutWidth = config.HEATMAPS.TILE_SIZE * config.HEATMAPS.MIN_ZOOM_OUT_NR_TILES;

    //computing the minimum out zoom level (e.g. 16:1)
    if (!gf.checkIfPowerOfTwo(minZoomOutWidth))
        throw Error(`the size of the tiles and the max nr. of tiles for minimum zoom must produce a power of two`);

    const minimumZoomLevel = intervals / minZoomOutWidth;

    logger.log('info',`Computed the minimum out zoom level: [${minimumZoomLevel}] according to TILE_SIZE: ` +
        `[${config.HEATMAPS.TILE_SIZE}] and NR_TILES_WIDTH: [${config.HEATMAPS.MIN_ZOOM_OUT_NR_TILES}]`);

    //computing the range of out zoom levels, starting from the previously computed minimum until the zero
    let powerOfTwoGen = gf.generatePowerOfTwoRangeBackward(minimumZoomLevel);
    const zoomOutLevels = [...powerOfTwoGen].map(v => -Math.abs(v));

    logger.log('info',`Computed the out zoom levels range: ${zoomOutLevels}`);

    //seconds in a time interval (i.e. the width of the tile)
    const tileTimeRangeWidth = (request.period * tileSize) - request.period;

    let currentStartInterval = new Date(request.startInterval);
    let currentEndInterval = new Date(request.startInterval);
    currentEndInterval.setSeconds(currentEndInterval.getSeconds() + tileTimeRangeWidth);

    logger.log('info', `Start generating tiles for the zoom level [0]`);

    for (let i = 0, xIDsrc = 0; i < intervals; i += tileSize, ++xIDsrc) {                 //xID is used for TMS x ID

        for (let j = 0, yIDsrc = 0; j < measurements.length; j += tileSize, ++yIDsrc) {   //yID is used for TMS y ID

            const slicedMeasurements = measurements.slice(j, j + tileSize);

            let formattedCurrentStartInterval = currentStartInterval.toISOString();
            let formattedCurrentEndInterval = currentEndInterval.toISOString();

            if (currentEndInterval > Date.parse(request.endInterval))
                formattedCurrentEndInterval = (new Date(request.endInterval)).toISOString();

            const originalCanvas =

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

            //save the original tile (level 0)
            await tileStorage({
                request: request,
                canvas: originalCanvas,
                zoom: 0,
                xID: xIDsrc,
                yID: yIDsrc,
                imageType: imageType,
            })
                .catch(err => {
                    throw Error(`Failed to store the original canvas: ${err.message}`);
                });

            //zooms
            //https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
            for (let i = 0; i < zoomInLevels.length; ++i) {

                const zoom = Number(zoomInLevels[i]);
                const availableZooms = config.HEATMAPS.TILE_ZOOMS.split(',').map(Number);

                //skip 1x zoom (i.e. the original canvas)
                if (availableZooms.includes(zoom)) {

                    logger.log('info', `Start Generating tiles with IN zoom: ${`@${zoom}x`} ` +
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

    /* Generating the OUT zoom levels */

    //reverse the order of out zoom levels (e.g. 16,8,4,2  => 2,4,8,16), also added the level 0 as init
    //we use the tiles generated for a zoom level to generate the tiles of the next level
    zoomOutLevels.push(0);
    zoomOutLevels.sort((a,b) => b - a);

    for (let i = 1; i < zoomOutLevels.length; ++i) {
        
        const previousZoomLevel = zoomOutLevels[i-1];
        const currentZoomLevel = zoomOutLevels[i];
        //const nTilesToBeCombined = Math.abs(currentZoomLevel);
        const nTilesToBeCombined = 2;

        const _ERR_NOT_GEN = `tiles of level [${previousZoomLevel}] has not been generated, tiles of level ` +
            `[${currentZoomLevel}] cannot be generated`;

        logger.log('info', `Start generating tiles for the OUT zoom level: [${currentZoomLevel}]`);

        //check if tiles of previous zoom level have been generated
        const zoomDirPath =
            pathjs.join(
                process.cwd(),
                constants.PATH_HEATMAPS_TILES,
                request.database,
                request.policy,
                request.heatMapType,
                request.fields[0],
                previousZoomLevel);    //previous zoom level
        
        //check if folder containing tiles of the previous zoom level exists
        if (!fs.existsSync(zoomDirPath)) throw Error(_ERR_NOT_GEN);

        //get the list of subdirs corresponding to the ID X of TMS (remark TMS: zoom/x/y/file.ext)
        const dirsIdX = getDirsListByPath(zoomDirPath, {toInt: true, sort: 'asc'});

        //check if the folder of the previous zoom level is not empty (i.e. tiles have been generated)
        if (dirsIdX.length === 0) throw Error(_ERR_NOT_GEN + `(X coords directory)`);

        let xID = 0;

        for (let j = 0; j < dirsIdX.length; j += nTilesToBeCombined) {

            //check if we are near the end (i.e. we don't have a sufficient number of tiles to combine according to the
            //zoom level to be generated. In that case we need to generate a "dummy" canvas to cover the missing area
            let missingXIds = 0;
            if ((j + nTilesToBeCombined) > dirsIdX.length)
                missingXIds = Math.abs(dirsIdX.length - (j + nTilesToBeCombined));

            //collect the lists of all sub-folders of each xID folder
            //we need only the first one for processing tiles, but is recommended to check the existence of all
            //sub-folders before start the tiles generation process
            let dirsIdYList = [];
            for (let z = 0; z < nTilesToBeCombined - missingXIds; ++z) {

                //get the path of the xID folder
                const xDirPath = pathjs.join(zoomDirPath, (j+z).toString());

                //get the list of sub-folders corresponding to the ID Y of TMS for the selected xID folder
                const dirsIdY = getDirsListByPath(xDirPath, {toInt: true, sort: 'asc'});

                //existence check
                if (dirsIdY.length === 0) throw Error(_ERR_NOT_GEN + `(Y coords directory)`);

                dirsIdYList.push(dirsIdY);
            }

            if (dirsIdYList.length === 0 || dirsIdYList.length < (nTilesToBeCombined - missingXIds))
                throw Error(`cannot find any sub-folders of Y coordinate, during zoom out level [${currentZoomLevel}]` +
                    ` tiles processing`);

            //take the first list of Y sub-folders (assuming it's always exists) for processing tiles
            //also in the case we'are at the boarder of the heatmap
            const firstDirIdY = dirsIdYList[0];

            let yID = 0;
            for (let w = 0; w < firstDirIdY.length; w += nTilesToBeCombined) {

                //check if we are near the end (vertically) as done previously for the X ids (horizontally)
                let missingYIds = 0;
                if ((w + nTilesToBeCombined) > firstDirIdY.length)
                    missingYIds = Math.abs(firstDirIdY.length - (w + nTilesToBeCombined));

                //create a "big" canvas to include the tiles to be combined of the previous zoom level
                const canvas = Canvas.createCanvas(tileSize * 2, tileSize * 2);
                const ctx = canvas.getContext("2d");

                let xStartCoord = 0;

                for (let x = 0; x < nTilesToBeCombined - missingXIds; ++x) {

                    const xDirPath = pathjs.join(zoomDirPath, (j+x).toString());

                    let yStartCoord = 0;

                    for (let y = 0; y < nTilesToBeCombined - missingYIds; ++y) {

                        const yDirPath = pathjs.join(xDirPath, (w+y).toString());

                        await Canvas.loadImage(pathjs.join(yDirPath, `tile.${imageType}`))
                            .then((image) => {

                                ctx.drawImage(image, xStartCoord, yStartCoord);
                            });

                        yStartCoord += tileSize;
                    }

                    xStartCoord += tileSize;
                }

                //https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
                //canvas/image, dx, dy, dWidth, dHeight
                const scaledCanvas = Canvas.createCanvas(tileSize, tileSize);
                const scaledCtx = scaledCanvas.getContext("2d");

                scaledCtx.drawImage(canvas, 0, 0, tileSize, tileSize);

                await tileStorage({
                    request: request,
                    canvas: scaledCanvas,
                    zoom: currentZoomLevel,
                    xID: xID,
                    yID: yID,
                    imageType: imageType,
                })
                    .then(() => {

                        logger.log('info', `Generated tile of OUT zoom level: [${currentZoomLevel}] with ID: ` +
                            `[${xID},${yID}]`);
                    });

                ++yID;
            }

            ++xID;
        }
    }

    //save configurations to db
    const update = {
        database: request.database,         //fixed
        policy: request.policy,             //fixed
        field: request.fields[0],           //fixed
        heatMapType: request.heatMapType,   //fixed
        heatMapZooms: zoomOutLevels.sort((a, b) => a - b).concat(zoomInLevels), //updated
    };

    //remove the updated params for the query
    const query = (({database,policy,field,heatMapType}) => ({database,policy,field,heatMapType}))(update);
    const options = { upsert: true, new: true, setDefaultsOnInsert: true };

    ConfigurationsModel.findOneAndUpdate(query, update, options, (err, doc) => {
        if (err) throw Error(`Failed to save heatmap configuration: ${err}`);
        else {
            const formatted = JSON.stringify(doc, null, 2);
            logger.log('info', `Configuration of generated heatmap saved\n ${formatted}`);
        }
    });

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

        if (points[0].length === 0) {

            throw Error(`No points available in the timeserie [${measurements[i]}]`);
        }

        //drawing pixels
        points[0].forEach((point, index) => {

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
    if (!fs.existsSync(pathImageDir)) {
        mkdirp.sync(pathImageDir);
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
        heatMapType = gf.checkParam`HeatMap Type`,
        measurementsAnalysis = gf.checkParam`Analysis`,
        field = gf.checkParam`Field`,
        fieldIndex = gf.checkParam`Field Index of Dataset Analysis`
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

const getZoomInLevels = () => config.HEATMAPS.TILE_ZOOMS.split(',');

const heatMapBuildAndStore = async (
    {
        request = gf.checkParam`HeatMap request`,
        imageType = constants.IMAGE_EXTENSIONS.IMAGE_PNG_EXT,       //png
        mode = constants.HEATMAPS.MODES.TILES,                      //single | tiles
        tileSize = config.HEATMAPS.TILE_SIZE,                       //fetch default from config
        zoomInLevels = getZoomInLevels(),                           //fetch default from config
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
            type: sharedConstants.ANALYSIS_DATASET,
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
            type: sharedConstants.ANALYSIS_MEASUREMENTS,
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
                        zoomInLevels: zoomInLevels,
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

    request.database = request.database || gf.checkParam`Database`;
    request.policy = request.policy || gf.checkParam`Policy`;
    request.startInterval = request.startInterval || gf.checkParam`Start Interval`;
    request.endInterval = request.endInterval || gf.checkParam`End Interval`;
    request.fields = request.fields || gf.checkParam`Fields`;

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

const getDataByMachineIdxByHeatMapType = async (
    {
        database = gf.checkParam`Database`,
        policy = gf.checkParam`Policy`,
        startInterval = gf.checkParam`Start Interval`,
        endInterval = gf.checkParam`End Interval`,
        fields = gf.checkParam`Fields`,
        heatMapType = gf.checkParam`HeatMap Type`,
        timeSerieIndex = gf.checkParam`Timeserie Index`,
    }) => {

    //validation
    await heatMapConfigurationValidation({
        database: database,
        policy: policy,
        startInterval: startInterval,
        endInterval: endInterval,
        fields: fields,
    });

    if (!getHeatMapTypes().includes(heatMapType))
        throw Error(`invalid param: HeatMap Type ${heatMapType}`);

    //fetch timeseries names from db
    let timeseriesNames = await
        influx.fetchMeasurementsListFromHttpApi(database)
            .catch(err => {
                logger.log('error', `Failed during measurements list fetching: ${err}`);
            });
    if (!timeseriesNames || timeseriesNames.length === 0) throw Error(`no timeseries available`);

    if (timeSerieIndex < 0 || timeSerieIndex > (timeseriesNames.length - 1))
        throw Error(`invalid param: Machine Index ${timeSerieIndex}`);

    //step 1: retrieve the timeserie name (e.g. resource_usage_10), according to heatmap type and a given index
    //different heatmap types (e.g. sort by sum) associate different indexes to timeseries
    switch(heatMapType) {

        case constants.HEATMAPS.TYPES.SORT_BY_MACHINE: //the natural order

            break;

        case constants.HEATMAPS.TYPES.SORT_BY_SUM:

            //TODO sort according, may saves the sorting order in the database when doing analysis?
            break;

        case constants.HEATMAPS.TYPES.SORT_BY_TS_OF_MAX_VALUE:

            //TODO
            break;
    }

    const indexedTimeSerie = timeseriesNames[timeSerieIndex];

    logger.log('info', `fetching data of timeserie ${indexedTimeSerie}`);

    let timeSerieData = await influx.fetchPointsFromHttpApi({
        database: database,
        policy: policy,
        measurements: [indexedTimeSerie],
        startInterval: startInterval,
        endInterval: endInterval,
        period: config.TIMESERIES.period,
        fields: fields,
    })
        .catch(err => {
            logger.log('error', `Failed during points fetching for ${indexedTimeSerie}: ${err}`);
        });

    //we have a batch of measurements where each entry contains the points of each measurement
    if (!timeSerieData || timeSerieData.length === 0) throw Error(`no data available for ${indexedTimeSerie}`);

    //flatting ('cos we have requested only 1 timeserie)
    const points = timeSerieData[0].map(e => {

        let data = [e.time.getTime()];    //convert to unix epoch
        fields.forEach((field, idx) => data.push(e[field])); //take only requested fields

        return data;
    });
    if (!points || points.length === 0) throw Error(`no points available for ${indexedTimeSerie}`);

    return {
        name: indexedTimeSerie,
        fields: ['time'].concat(fields),
        points: points,
    };
};

module.exports = {
    heatMapConfigurationValidation: heatMapConfigurationValidation,
    heatMapBuildAndStore: heatMapBuildAndStore,
    getHeatMapTypes: getHeatMapTypes,
    getZoomLevels: getZoomLevels,
    getPalettes: getPalettes,
    setZscores: setZscores,
    getZscores: getZscores,
    getDataByMachineIdxByHeatMapType: getDataByMachineIdxByHeatMapType,
};