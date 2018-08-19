require('datejs');

const influx = require('../database/influxdb');

const fs = require('fs'),
      path = require('path');

const csv = require("fast-csv");

//node-canvas
let Canvas = require('canvas');

/* Images Types */
const _IMAGE_PNG = 'PNG';
const _IMAGE_JPEG = 'JPEG';
const _IMAGE_PDF = 'PDF';

const _PATH_IMAGES_HEATMAPS = './public/images';

/* Palettes */
const _PALETTE_GRAY     = 'GRAY';
const _PALETTE_RED      = 'RED';

const palettes = [
    _PALETTE_GRAY,
    _PALETTE_RED
];

const palette_shades_gray = [
    {r:61 , g:61 , b:61},
    {r:71 , g:71 , b:71 },
    {r:81 , g:81 , b:81 },
    {r:91 , g:91 , b:91 },
    {r:102 , g:102 , b:102 },
    {r:117 , g:117 , b:117 },
    {r:132 , g:132 , b:132 },
    {r:147 , g:147 , b:147 },
    {r:163 , g:163 , b:163 },
    {r:178 , g:178 , b:178 }
];

const palette_shades_red = [
    {r:255 , g:102 , b:102 },
    {r:255 , g:76 , b:76 },
    {r:255 , g:50 , b:50 },
    {r:255 , g:25 , b:25 },
    {r:255 , g:0 , b:0 },
    {r:229 , g:0 , b:0 },
    {r:204 , g:0 , b:0 },
    {r:178 , g:0 , b:0 },
    {r:153 , g:0 , b:0 },
    {r:127 , g:0 , b:0 }
];

const getPalettesRGB = (palette) => {

    switch (palette) {

        case _PALETTE_GRAY:

            return palette_shades_gray;

        case _PALETTE_RED:

            return palette_shades_red;

        default:
            return palette_shades_gray;
    }
};

const getPalettes = () => {

    return palettes;
};

/* HeatMap Types */
const _HEATMAP_TYPE_BY_MACHINE              = 'sortByMachine';
const _HEATMAP_TYPE_BY_SUM                  = 'sortBySum';
const _HEATMAP_TYPE_BY_TS_OF_MAX_VALUE      = 'sortByTsOfMaxValue';

const heatMapTypes = [
    _HEATMAP_TYPE_BY_MACHINE,
    _HEATMAP_TYPE_BY_SUM,
    _HEATMAP_TYPE_BY_TS_OF_MAX_VALUE,
];

/*
 * Feature Scaling: Standardization
 * https://en.wikipedia.org/wiki/Standard_score
 * (used by colorize())
 */
let _MIN_Z_SCORE = -3
,   _MAX_Z_SCORE = 3;

const x = p => { throw new Error(`Missing parameter: ${p}`) };

const fetchMeasurementsListFromHttpApi = (dbname) => {

    return new Promise(
        function(resolve, reject) {

            influx.getMeasurements(dbname)
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

const fetchPointsFromHttpApi = (
    database,
    policy,
    measurement,
    startInterval,
    endInterval,
    period,
    fields) => {

    return new Promise(
        function (resolve, reject) {

            influx.getPointsByPolicyByNameByStartTimeByEndTime(
                database,
                policy,
                measurement,
                startInterval,
                endInterval)

                .then(p => {

                    let points = [];

                    //fix missing values (eventually)
                    let current_timestamp = Date.parse(startInterval)
                        , end_timestamp = Date.parse(endInterval)
                        , k = 0;

                    while (current_timestamp <= end_timestamp) { //<= ?

                        //init point's time and fields
                        let point = {time: Date.parse(current_timestamp)};
                        fields.forEach(field => {

                            point[field] = 0.0;
                        });

                        //there are points to process
                        if (k < p.length) {

                            let timestamp = Date.parse(p[k].time);
                            const diff = timestamp - current_timestamp;

                            //timestamps mismatch: i'm ahead, so the current ts is missing
                            if (diff > 0) {
                                current_timestamp.setSeconds(current_timestamp.getSeconds() + period);
                            }
                            //timestamp match
                            else if (diff === 0) {

                                //update fields with real value
                                fields.forEach(field => {

                                    point[field] = p[k][field];
                                });

                                ++k;
                                current_timestamp.setSeconds(current_timestamp.getSeconds() + period);
                            }
                            //timestamp mismatch: i'm back, so the start interval was ahead.
                            else if (diff < 0) {
                                ++k;
                                continue;
                            }
                        }
                        else { //no more points
                            current_timestamp.setSeconds(current_timestamp.getSeconds() + period);
                        }
                        points.push(point);
                    }

                    resolve(points);
                })
                .catch((err) => {
                    console.log(err);
                    reject('server unavailable');
                });
        }
    )
};

/* HeatMap Construction */

const heatMapCanvasToImage = async (
    {
        canvas,
        heatMapRequest,
        imageType,
    }

) => {

    switch (imageType) {

        case _IMAGE_PNG:

            canvas
                .createPNGStream()
                .pipe(
                    fs.createWriteStream(
                        _PATH_IMAGES_HEATMAPS +
                        `/heatmap_${heatMapRequest.heatMapType}_${heatMapRequest.fields[0]}_${heatMapRequest.palette}.png`))
                .on('finish', () =>
                    console.log(
                        `Storing ` + _PATH_IMAGES_HEATMAPS +
                        `/heatmap_${heatMapRequest.heatMapType}_${heatMapRequest.fields[0]}_${heatMapRequest.palette}.png`));

            break;

        case _IMAGE_JPEG:

            canvas
                .createJPEGStream()
                .pipe(
                    fs.createWriteStream(
                        _PATH_IMAGES_HEATMAPS +
                        `/heatmap_${heatMapRequest.heatMapType}_${heatMapRequest.fields[0]}_${heatMapRequest.palette}.jpeg`))
                .on('finish', () =>
                    console.log(
                        `Storing ` + _PATH_IMAGES_HEATMAPS +
                        `/heatmap_${heatMapRequest.heatMapType}_${heatMapRequest.fields[0]}_${heatMapRequest.palette}.jpeg`));;

            break;

        case _IMAGE_PDF:

            canvas.createPDFStream().pipe(
                fs.createWriteStream(
                    _PATH_IMAGES_HEATMAPS +
                    `/heatmap_${heatMapRequest.heatMapType}_${heatMapRequest.field}_${heatMapRequest.palette}.pdf`))
                .on('finish', () =>
                    console.log(
                        `Storing ` + _PATH_IMAGES_HEATMAPS +
                        `/heatmap_${heatMapRequest.heatMapType}_${heatMapRequest.fields[0]}_${heatMapRequest.palette}.pdf`));

            break;

        default:
            throw new Error(`media type not supported: ${imageType}`);
    }
};

const colorize = (value, min, max, palette) => {    //value must be standardized first

    let range = Math.abs(max - min);
    let bucket_len = range / palette.length;

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

    heatMapRequest,
    heatMapAnalysis,

}) => {

    const startInterval = Date.parse(heatMapRequest.startInterval);
    const endInterval = Date.parse(heatMapRequest.endInterval);
    const period = heatMapRequest.period * 1000;

    const width = (endInterval - startInterval) / (period) + 1;
    const height = heatMapAnalysis.measurementStats.length;

    console.log(`Start building ${heatMapRequest.heatMapType} HeatMap for ${heatMapRequest.fields[0]}`);

    //palette RGBs
    const palette = getPalettesRGB(heatMapRequest.palette);

    //canvas
    console.log(`Generating Canvas [${width}x${height}]`);
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    for (let i = 0, l = 0; i < height; ++i) {

        let err, points;
        [err, points] = await to(fetchPointsFromHttpApi(
            heatMapRequest.database,
            heatMapRequest.policy,
            heatMapAnalysis.measurementStats[i].measurement, //decide the order
            heatMapRequest.startInterval,
            heatMapRequest.endInterval,
            heatMapRequest.period,
            heatMapRequest.fields
        ));

        if (err) {

            console.log(err);
            throw new Error('error fetching points from timeseries');
        }

        if (points.length === 0) {

            throw new Error(`no points available for ${measurements[i]}`);
        }

        //drawing pixels
        points.forEach((point, index) => {

            let standardizedPoint = standardize(
                point,
                heatMapRequest.fields[0],
                heatMapAnalysis.datasetStats[heatMapRequest.fields[0]].mean,
                heatMapAnalysis.datasetStats[heatMapRequest.fields[0]].std
            );

            let colorizedPoint = colorize(standardizedPoint, _MIN_Z_SCORE, _MAX_Z_SCORE, palette);

            ctx.fillStyle = `rgb(${colorizedPoint.r},${colorizedPoint.g},${colorizedPoint.b})`;
            ctx.fillRect(index, i, 1, 1);
        });
    }

    return canvas;
};

const heatMapBuildAndStore = async (

    {
        heatMapRequest,
        imageType, //TODO maybe insert it to request?
    }

) => {

    console.log(`Start Validation for ${JSON.stringify(heatMapRequest)}`);

    //validation
    const validate = await heatMapConfigurationValidation(
        {
            heatMapRequest: heatMapRequest,
        })
        .then(data => { return data; })
        .catch(error => {
            console.log(error);
            throw new Error(`Validation fails: ${error.message}`);
        });

    console.log(`Start Analysis`);

    //analysis
    const analysis = await heatMapAnalysis(
        {
            heatMapRequest: heatMapRequest,
        })
        .then(data => { return data; })
        .catch(error => {
            console.log(error);
            throw new Error(`Analysis fails: ${error.message}`);
        });

    console.log(`Start Construction`);

    //construction
    const canvas = await heatMapConstruction(
        {
            heatMapRequest: heatMapRequest,
            heatMapAnalysis: analysis,

        })
        .then(data => { return data; })
        .catch(error => {
            console.log(error);
            throw new Error(`Construction fails: ${error.message}`);
        });

    console.log(`Start images storing`);

    //storing
    const stored = await heatMapCanvasToImage(
        {
            canvas: canvas,
            heatMapRequest: heatMapRequest,
            imageType: imageType,
        })
        .then(data => { return data; })
        .catch(error => {
            console.log(error);
            throw new Error(`Storing fails: ${error.message}`);
        });

    console.log(`BuildNStore process completed`);
};

const sortMeasurementsByFieldByStatsType = (stats, field, type) => {

    return stats.slice().sort(function (a, b) {

        return a['stats'][field][type] < b['stats'][field][type];
    });
};

const heatMapConstruction = async (
    {
        heatMapRequest = x`HeatMap Request`,
        heatMapAnalysis = x`HeatMap Analysis`,
    }

    ) => {

    let measurementStats = heatMapAnalysis.measurementStats;
    switch (heatMapRequest.heatMapType) {

        case _HEATMAP_TYPE_BY_MACHINE:

            break;

        case _HEATMAP_TYPE_BY_SUM:

            measurementStats =
                sortMeasurementsByFieldByStatsType(
                    measurementStats,
                    heatMapRequest.fields[0],
                    'sum');

            break;

        case _HEATMAP_TYPE_BY_TS_OF_MAX_VALUE:

            measurementStats =
                sortMeasurementsByFieldByStatsType(
                    measurementStats,
                    heatMapRequest.fields[0],
                    'max_ts');

            break;
    }

    heatMapAnalysis.measurementStats = measurementStats;

    return drawHeatMap(
        {
            heatMapRequest: heatMapRequest,
            heatMapAnalysis: heatMapAnalysis,
        })
        .then(data => {
            return data;
        })
        .catch(error => {
            console.log(error);
            throw new Error(`Drawing HeatMap fails: ${error.message}`);
        });
};

/* HeatMap Analysis */

const initializeMeanPointsPerTS = (startInterval, endInterval, period, fields) => {

    let structure = {};

    let currentIntervalParsed = new Date(startInterval);
    let endIntervalParsed = new Date(endInterval);
    while (currentIntervalParsed <= endIntervalParsed) {

        let entry = {timestamp: currentIntervalParsed.toUTCString()};
        fields.forEach(field => entry[field] = []); //array of points (of field)
        structure[currentIntervalParsed.getTime()] = entry;

        currentIntervalParsed.setSeconds(currentIntervalParsed.getSeconds() + period);
    }

    return structure;
};

const analyzeMeasurements = async (
    database,
    policy,
    measurements,
    startInterval,
    endInterval,
    period,
    fields) => {

    //init mean points per ts
    let meanPointsPerTimestamp = initializeMeanPointsPerTS(startInterval, endInterval, period, fields);

    let sample_points_length = -1;
    let measurementStats = [];
    for (let i = 0; i < measurements.length; ++i) {

        let stats = {};
        let points = await fetchPointsFromHttpApi(
            database,
            policy,
            measurements[i],
            startInterval,
            endInterval,
            period,
            fields
        ).then(points => { return points; }); //non serve

        //need at the end to compute dataset mean
        sample_points_length = points.length;

        //initialize
        stats['database'] = database;
        stats['policy'] = policy;
        stats['measurement'] = measurements[i];
        stats['startInterval'] = startInterval;
        stats['endInterval'] = endInterval;
        stats['period'] = period;
        stats['intervals'] = (Date.parse(endInterval) - Date.parse(startInterval)) / (period * 1000) + 1;
        stats['fields'] = fields;
        stats['stats'] = {};
        fields.forEach(field => {
            stats['stats'][field] = {
                min: Number.MAX_SAFE_INTEGER,
                max: Number.MIN_SAFE_INTEGER,
                sum: 0,
                mean: -1,
                max_ts: '',
                min_ts: ''
            }
        });

        //collect stats
        points.forEach(p => {

            fields.forEach(field => {

                //min
                if (stats['stats'][field]['min'] === undefined || p[field] < stats['stats'][field]['min']) {
                    stats['stats'][field]['min'] = p[field];
                    stats['stats'][field]['min_ts'] = Date.parse(p['time']);
                }

                //max
                if (stats['stats'][field]['max'] === undefined || p[field] > stats['stats'][field]['max']) {
                    stats['stats'][field]['max'] = p[field];
                    stats['stats'][field]['max_ts'] = Date.parse(p['time']);
                }

                //sum
                stats['stats'][field]['sum'] += p[field];
                
                //collect points per timestamp                
                let timestamp = p['time'].getTime();  //convert in unix epoch
                meanPointsPerTimestamp[timestamp][field].push(p[field]);
            });
        });

        //mean
        fields.forEach(field => {

            stats['stats'][field]['mean'] = stats['stats'][field]['sum'] / points.length;
        });
        measurementStats.push(stats);
    }

    //global dataset stats
    let datasetStats = {};
    fields.forEach(field => {

        //initialize
        datasetStats[field] = {
            min: Number.MAX_SAFE_INTEGER,
            max: Number.MIN_SAFE_INTEGER,
            sum: 0,
            mean: -1,
            std: -1,
            population: 0
        };

        measurementStats.forEach(stat => {

            //sum
            datasetStats[field]['sum'] += stat['stats'][field]['sum'];

            //min - max
            if (stat['stats'][field]['min'] < datasetStats[field]['min'])
                datasetStats[field]['min'] = stat['stats'][field]['min'];

            if (stat['stats'][field]['max'] > datasetStats[field]['max'])
                datasetStats[field]['max'] = stat['stats'][field]['max'];

        });

        //global mean
        datasetStats[field]['mean'] = datasetStats[field]['sum'] / (measurements.length * sample_points_length);
    });

    //standard deviation (std)
    // sqrt ( 1/N * sum from 1 to N of (xi - dataset_mean)^2 ) , with N the entire population
    let tmp_data = {};
    fields.forEach(field => {
        tmp_data[field] = 0
    });

    for (let i = 0; i < measurements.length; ++i) {

        let points = await fetchPointsFromHttpApi(
            database,
            policy,
            measurements[i],
            startInterval,
            endInterval,
            period,
            fields
        ).catch(err => { throw new Error(err.message); });

        points.forEach(point => {

            fields.forEach(field => {

                datasetStats[field]['population'] += 1;
                tmp_data[field] += Math.pow((point[field] - datasetStats[field]['mean']), 2);
            });
        });
    }

    fields.forEach(field => {

        datasetStats[field]['std'] = Math.sqrt(tmp_data[field] / datasetStats[field]['population']);
    });
    
    //mean per timestamp
    //{
    //  ts1: { timestamp: ts1, field1: [...], field2: [...], .. }  ==> ts1: { timestamp: ts1, field1: mean(points), .. }
    //  ts2: ...
    //  ...
    //}
    for (let key in meanPointsPerTimestamp) {
        if (meanPointsPerTimestamp.hasOwnProperty(key)) {

            fields.forEach(field => {

                let sum = meanPointsPerTimestamp[key][field].reduce((acc, curr) => acc + curr, 0);
                meanPointsPerTimestamp[key][field] = sum / meanPointsPerTimestamp[key][field].length;
            });
        }
    }

    return {
        datasetStats: datasetStats,
        measurementStats: measurementStats,
        meanPointsPerTimestamp: meanPointsPerTimestamp,
    };
};

const heatMapAnalysis = async (
    {
        heatMapRequest,
    }
) => {

    /* Fetch Measurements from Database */
    let measurements = await fetchMeasurementsListFromHttpApi(heatMapRequest.database);

    //only a sample of machines
    if (heatMapRequest.nMeasurements > 0) { // 0 means all measurements
        measurements = measurements.slice(0, heatMapRequest.nMeasurements);
    }

    /* Analyze Measurements */
    return await
        analyzeMeasurements(
            heatMapRequest.database,
            heatMapRequest.policy,
            measurements,
            heatMapRequest.startInterval,
            heatMapRequest.endInterval,
            heatMapRequest.period,
            heatMapRequest.fields);
};

/* HeatMap Configuration Validation */

const validateDatabaseArgs = async (dbname, policy, fields) => {

    const [dbs, policies, measurements] = await Promise.all([
        influx.getDatabases(),
        influx.getRetentionPolicies(dbname),
        fetchMeasurementsListFromHttpApi(dbname)
    ]).catch(err => { throw new Error('timeseries unavailable');});

    if (dbs.filter(d => (d.name === dbname)).length === 0)
        throw new Error(`invalid database ${dbname}`);

    if (policies.filter(p => (p.name === policy)).length === 0)
        throw new Error(`invalid policy ${policy}`);

    if (measurements.length === 0) throw new Error('no measurements available');
    if (fields.length === 0) throw new Error('missing fields');

    let measurement = measurements[0];
    await influx.getAllFieldsKeyByDatabaseByName(dbname, measurement)
        .catch(err => { throw new Error('no points available'); })
        .then(res => {

            let fieldKeys = res.map(k => k.fieldKey);
            if (!fieldKeys.some(r => fields.includes(r))) throw new Error('wrong fields');
        })
};

const heatMapConfigurationValidation = async (

    {
        heatMapRequest = x`HeatMap Request`,
    }

) => {

    //timeseries validation
    //console.log(`Validating DB: ${database} \n - policy: ${policy} \n - fields: ${fields}`);
    await validateDatabaseArgs(heatMapRequest.database, heatMapRequest.policy, heatMapRequest.fields);

    //intervals validation
    //console.log(`Validating time interval [${startInterval} - ${endInterval}]`);
    let start_interval, end_interval;
    try {

        start_interval = Date.parse(heatMapRequest.startInterval);
        end_interval = Date.parse(heatMapRequest.endInterval);
    }
    catch (e) {
        throw new Error(`invalid interval: [${heatMapRequest.startInterval} - ${heatMapRequest.endInterval}]`);
    }

    //end interval must be equal or greater than start interval
    const diff_time = start_interval - end_interval;
    if (diff_time > 0)
        throw new Error('end interval must be greater or equal then start');

    //number of measurements validation
    //console.log(`Validing #measurements [${nMeasurements}]`);
    if (heatMapRequest.nMeasurements < 0)
        throw new Error(`measurements cannot be negative [Default: 0 => all]`);

    //period validation
    //console.log(`Validating period [${period}]`);
    if ((heatMapRequest.period % 300) !== 0)
        throw new Error('invalid period, must be multiple of 300 (5min)');

    //palette validation
    if (!palettes.includes(heatMapRequest.palette))
        throw new Error(`invalid palette [AVAILABLE: ${palettes}]`);

    //heatmap type validation
    if (!heatMapTypes.includes(heatMapRequest.heatMapType))
        throw new Error(`invalid heatmap type [AVAILABLE: ${heatMapTypes}]`);

    return true;
};

module.exports = {
    heatMapConfigurationValidation: heatMapConfigurationValidation,
    heatMapAnalysis: heatMapAnalysis,
    heatMapConstruction: heatMapConstruction,
    heatMapBuildAndStore: heatMapBuildAndStore,
    heatMapCanvasToImage: heatMapCanvasToImage,
    getPalettes: getPalettes,
};