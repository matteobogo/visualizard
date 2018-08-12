require('datejs');

const influx = require('../database/influxdb');

const fs = require('fs'),
      path = require('path');

const csv = require("fast-csv");

//node-canvas
let Canvas = require('canvas');

//palette for nodejs (https://github.com/tj/palette)
//const palette = require('palette');

//color gray scale
// const palette_shades_gray = [  //50 shades of gray.. ;)
//     "#FFFFFF","#F8F8F8","#F0F0F0","#E8E8E8","#E0E0E0","#D8D8D8","#D0D0D0","#C8C8C8","#C0C0C0","#B8B8B8",
//     "#B0B0B0","#A8A8A8","#A0A0A0","#989898","#909090","#888888","#808080","#787878","#707070","#686868",
//     "#606060","#585858","#505050","#484848","#404040","#383838","#303030","#282828","#202020","#181818",
//     "#101010","#080808","#000000"];

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

exports.getPalettes = () => {

    return palettes;
};

/* HeatMap Types */
const _HEATMAP_TYPE_BY_MACHINE              = 'Sort by machine';
const _HEATMAP_TYPE_BY_SUM                  = 'Sort by sum';
const _HEATMAP_TYPE_BY_TS_OF_MAX_VALUE      = 'Sort by TimeStamp of Max Value';

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

const _PATH_IMAGES_HEATMAPS = './public/images';

const computation_stages = {
    //TODO
    //TODO each method update a global var with computation stage
};

/**
 * Manage missing parameters in functions.
 * @param p the missing parameter
 */
const x = p => { throw new Error(`Missing parameter: ${p}`) };


//Fast, small color manipulation and conversion for JavaScript
//https://github.com/bgrins/TinyColor
//const tinycolor = require("tinycolor2");

//8192 intervals
// const _START_INTERVAL = '2011-02-01T00:15:00.000Z';
// const _END_INTERVAL = '2011-03-01T10:50:00.000Z';
// const _POLICY = 'autogen';
//
// const domain_min = 0;
// const domain_max = 13.267759;

/**
 *
 * @param path
 * @param fields
 * @returns {Promise<any>}
 */
const fetchDataFromCSV = (path, ...fields) => {

    return new Promise(
        function (resolve, reject) {

            if (!fs.existsSync(path)) {
                reject('file does not exist');
            }

            let rows = [];
            csv.fromPath(path, {headers: true})
                .on("data", data => {

                    let row = {};
                    fields.forEach(field => {
                        row[field] = data[field];
                    });
                    rows.push(row);
                })
                .on("end", function () {
                    resolve(rows);
                });
        }
    )
};

/**
 *
 * @returns {Promise<any>}
 */
const fetchCSVList = () => {

    return new Promise(
        function (resolve, reject) {

            if (!fs.existsSync(CONFIG.data_path))
                reject('no data available');

            fs.readdir(CONFIG.data_path, function (err, files) {
                if (err || files.length === 0) reject('no data available');
                else resolve(files);
            });
        }
    )
};

/**
 *
 * @param dbname
 * @returns {Promise<any>}
 */
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

/**
 *
 * @param dbname
 * @param policy
 * @param measurement
 * @param start_interval
 * @param end_interval
 * @param period
 * @param fields
 * @returns {Promise<any>}
 */
const fetchPointsFromHttpApi = (
    dbname,
    policy,
    measurement,
    start_interval,
    end_interval,
    period,
    fields) => {

    return new Promise(
        function (resolve, reject) {

            influx.getPointsByPolicyByNameByStartTimeByEndTime(
                dbname,
                policy,
                measurement,
                start_interval,
                end_interval)

                .then(p => {

                    let points = [];

                    //fix missing values (eventually)
                    let current_timestamp = Date.parse(start_interval)
                        , end_timestamp = Date.parse(end_interval)
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




/**
 *
 * @param points
 * @param field
 * @param mean
 * @param std
 * @returns {Array}
 */
const standardization = (points, field, mean, std) => {

    let standardizated_points = [];
    points.forEach(point => {

        standardizated_points.push((point[field] - mean) / std);
    });

    return standardizated_points;
};

/**
 *
 * @param value
 * @param min
 * @param max
 * @param palette
 * @returns {*}
 */
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

/**
 *
 * @param width
 * @param height
 * @param dataset_stats
 * @param measurement_stats
 * @param palette
 * @param heatmap_type
 * @returns {Promise<string>}
 */
const drawHeatMap = async (
    { width, height },
    {dataset_stats, measurement_stats},
    { palette },
    heatmap_type) => {

    let current_palette = getPalettesRGB(palette);

    //one heatmap for each field
    let fields = measurement_stats[0]['fields'];
    for(let k = 0; k < fields.length; ++k) {

        console.log(`Start building HeatMap ${heatmap_type} for ${fields[k]}`);

        //init canvas
        console.log(`Generating Canvas [${width}x${height}]..`);
        let canvas = Canvas.createCanvas(width, height)
        ,   ctx = canvas.getContext('2d')
        ,   imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        //paint pixels
        console.log(`Start drawing ${imageData.data.length} pixels..`);
        for (let i = 0, l = 0; i < height; ++i) {

            let points = await fetchPointsFromHttpApi(
                measurement_stats[i]['dbname'],
                measurement_stats[i]['policy'],
                measurement_stats[i]['measurement'],
                measurement_stats[i]['start_interval'],
                measurement_stats[i]['end_interval'],
                measurement_stats[i]['period'],
                [fields[k]]) //f needs an array of fields, just pass 1 field within an array

                .catch(err => {

                    console.log(err);
                    throw new Error('error fetching points from timeseries');
                });

            if (points.length === 0) throw new Error(`no points available for ${measurement_stats[i]['measurement']}`);

            //standardize points with feature scaling
            let standardizated_points = standardization(
                points,
                fields[k],
                dataset_stats[fields[k]]['mean'],
                dataset_stats[fields[k]]['std']
            );

            //console.log(`Drawing line #${i+1} with ${standardizated_points.length} points`);
            for (let j = 0; j < standardizated_points.length; ++j, l += 4) {

                let c = colorize(standardizated_points[j], _MIN_Z_SCORE, _MAX_Z_SCORE, current_palette);

                imageData.data[l + 0] = c.r;
                imageData.data[l + 1] = c.g;
                imageData.data[l + 2] = c.b;
                imageData.data[l + 3] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);

        console.log(`HeatMap ${heatmap_type} built`);

        console.log(`Saving HeatMap for ${fields[k]}..`);

        // //write .PNG
        // canvas
        //     .createPNGStream()
        //     .pipe(fs.createWriteStream(_PATH_IMAGES_HEATMAPS + `/heatmap_${heatmap_type}_${fields[k]}.png`))
        //     .on('finish', () => console.log(`HeatMap .PNG for ${fields[k]} saved`));
		//
        // //write .JPEG
        // canvas
        //     .createJPEGStream()
        //     .pipe(fs.createWriteStream(_PATH_IMAGES_HEATMAPS + `/heatmap_${heatmap_type}_${fields[k]}.jpeg`))
        //     .on('finish', () => console.log(`HeatMap .JPEG for ${fields[k]} saved`));

        return canvas.toDataURL('image/png');
    }
    //check png saved true/false
    //TODO
};

const sortMeasurementsByFieldByStatsType = (stats, field, type) => {

    return stats.slice().sort(function (a, b) {

        return a['stats'][field][type] < b['stats'][field][type];
    });
};

/**
 * Building a set of HeatMaps.
 * @param {string} dbname - the timeseries name
 * @param {string} policy - the retention policy
 * @param {Object} interval - the interval of time
 * @param {string} interval.start_time - the start interval (UTC)
 * @param {string} interval.end_time - the end interval (UTC)
 * @param {string[]} fields - the fields of the points which will be fetched
 * @param {number} [n_measurements=0] - the number of measurements sampled, 0 means all measurements
 * @param {number} [period=300] - the interval of time between interval's timestamps, 300 means 300 seconds
 * @param {string} [type=all] - the type of heatmaps that will be generated
 * @param {string} [palette=gray] - the color palette used to paint pixels
 * @returns {Promise<void>}
 */

/**
 *
 * @param options
 * @returns {Promise<void>}
 */
const buildHeatMaps = async (options) => {

    // /* Fetch Measurements from Database */
    // console.log(`Fetching list of measurements from database..`);
    // let measurements = await fetchMeasurementsListFromHttpApi(options.dbname);
    //
    // //only a sample of machines
    // if (options.n_measurements > 0) {
    //     console.log(`Selected only a sample of ${options.n_measurements} measurements`);
    //     measurements = measurements.slice(0, options.n_measurements);
    // }
    //
    // /* Analyze Measurements */
    // console.log(`Start analyzing ${measurements.length} measurements..`);
    // let dataset_stats, measurement_stats;
    // [dataset_stats, measurement_stats] = await
    //     analyzeMeasurements(
    //         options.dbname,
    //         options.policy,
    //         measurements,
    //         options.start_time,
    //         options.end_time,
    //         options.period,
    //         options.fields);
    //
    // if (measurement_stats.length === 0) throw new Error('measurements analysis fails');

    let width = (Date.parse(options.end_time) - Date.parse(options.start_time)) / (options.period * 1000) + 1
    ,   height = measurements.length;
    console.log(`Computed HeatMaps dimensions (W x H): [${width} x ${height}]`);

    switch(options.type) {

        case "sortByMachine":

            console.log(`Building ${options.type} HeatMaps..`);

            for(let i = 0; i < options.fields.length; ++i) {
                return await drawHeatMap(
                    {width: width, height: height},
                    {dataset_stats: dataset_stats, measurement_stats: measurement_stats},
                    {palette: options.palette}, options.type);
            }
            break;

        case "sortBySum":

            console.log(`Building ${options.type} HeatMaps..`);
            break;

        case "sortByTsOfMaxValue":

            console.log(`Building ${options.type} HeatMaps..`);
            break;

        default:

            console.log(`Building ${options.type} HeatMaps..`);
            for(let i = 0; i < options.fields.length; ++i) {

                await Promise.all([

                    //sorted by machine id
                    drawHeatMap(
                        {width: width, height: height},
                        {dataset_stats: dataset_stats, measurement_stats: measurement_stats},
                        {palette: options.palette},
                        'original'
                    ),

                    //sorted by sum (integral)
                    drawHeatMap(
                        {width: width, height: height},
                        {
                            dataset_stats: dataset_stats,
                            measurement_stats: sortMeasurementsByFieldByStatsType(measurement_stats, options.fields[i], 'sum')
                        },
                        {palette: options.palette},
                        'sum'
                    ),

                    //sorted by timestamp of max value
                    drawHeatMap(
                        {width: width, height: height},
                        {
                            dataset_stats: dataset_stats,
                            measurement_stats: sortMeasurementsByFieldByStatsType(measurement_stats, options.fields[i], 'sum')
                        },
                        {palette: options.palette},
                        'max_ts'
                    )
                ]);
            }
    }
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
    dbname,
    policy,
    measurements,
    start_interval,
    end_interval,
    period,
    fields) => {

    //init mean points per ts
    let mean_points_per_timestamp = initializeMeanPointsPerTS(start_interval, end_interval, period, fields);

    let sample_points_length = -1;
    let measurements_stats = [];
    for (let i = 0; i < measurements.length; ++i) {

        let stats = {};
        let points = await fetchPointsFromHttpApi(
            dbname,
            policy,
            measurements[i],
            start_interval,
            end_interval,
            period,
            fields
        ).then(points => { return points; }); //non serve

        //need at the end to compute dataset mean
        sample_points_length = points.length;

        //initialize
        stats['dbname'] = dbname;
        stats['policy'] = policy;
        stats['measurement'] = measurements[i];
        stats['start_interval'] = start_interval;
        stats['end_interval'] = end_interval;
        stats['period'] = period;
        stats['intervals'] = (Date.parse(end_interval) - Date.parse(start_interval)) / (period * 1000) + 1;
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
                mean_points_per_timestamp[timestamp][field].push(p[field]);
            });
        });

        //mean
        fields.forEach(field => {

            stats['stats'][field]['mean'] = stats['stats'][field]['sum'] / points.length;
        });
        measurements_stats.push(stats);
    }

    //global dataset stats
    let dataset_stats = {};
    fields.forEach(field => {

        //initialize
        dataset_stats[field] = {
            min: Number.MAX_SAFE_INTEGER,
            max: Number.MIN_SAFE_INTEGER,
            sum: 0,
            mean: -1,
            std: -1,
            population: 0
        };

        measurements_stats.forEach(stat => {

            //sum
            dataset_stats[field]['sum'] += stat['stats'][field]['sum'];

            //min - max
            if (stat['stats'][field]['min'] < dataset_stats[field]['min'])
                dataset_stats[field]['min'] = stat['stats'][field]['min'];

            if (stat['stats'][field]['max'] > dataset_stats[field]['max'])
                dataset_stats[field]['max'] = stat['stats'][field]['max'];

        });

        //global mean
        dataset_stats[field]['mean'] = dataset_stats[field]['sum'] / (measurements.length * sample_points_length);
    });

    //standard deviation (std)
    // sqrt ( 1/N * sum from 1 to N of (xi - dataset_mean)^2 ) , with N the entire population
    let tmp_data = {};
    fields.forEach(field => {
        tmp_data[field] = 0
    });

    for (let i = 0; i < measurements.length; ++i) {

        let points = await fetchPointsFromHttpApi(
            dbname,
            policy,
            measurements[i],
            start_interval,
            end_interval,
            period,
            fields
        ).catch(err => { throw new Error(err.message); });

        points.forEach(point => {

            fields.forEach(field => {

                dataset_stats[field]['population'] += 1;
                tmp_data[field] += Math.pow((point[field] - dataset_stats[field]['mean']), 2);
            });
        });
    }

    fields.forEach(field => {

        dataset_stats[field]['std'] = Math.sqrt(tmp_data[field] / dataset_stats[field]['population']);
    });
    
    //mean per timestamp
    //{
    //  ts1: { timestamp: ts1, field1: [...], field2: [...], .. }  ==> ts1: { timestamp: ts1, field1: mean(points), .. }
    //  ts2: ...
    //  ...
    //}
    for (let key in mean_points_per_timestamp) {
        if (mean_points_per_timestamp.hasOwnProperty(key)) {

            fields.forEach(field => {

                let sum = mean_points_per_timestamp[key][field].reduce((acc, curr) => acc + curr, 0);
                mean_points_per_timestamp[key][field] = sum / mean_points_per_timestamp[key][field].length;
            });
        }
    }

    return {
        datasetStats: dataset_stats,
        meanPointsPerTimestamp: mean_points_per_timestamp,
        //measurementStats: measurements_stats,

    };
};

exports.heatMapAnalysis = async (
    {
        database = x`database`,
        policy = x`policy`,
        startInterval = x`startInterval`,
        endInterval = x`endInterval`,
        fields = x`fields`,
        nMeasurements = 0,
        period = 300,
    }
) => {

    /* Fetch Measurements from Database */
    console.log(`Fetching list of measurements from database..`);
    let measurements = await fetchMeasurementsListFromHttpApi(database);

    //only a sample of machines
    if (nMeasurements > 0) {
        console.log(`Selected only a sample of ${nMeasurements} measurements`);
        measurements = measurements.slice(0, nMeasurements);
    }

    /* Analyze Measurements */
    console.log(`Start analyzing ${measurements.length} measurements..`);
    let analysis = await
        analyzeMeasurements(
            database,
            policy,
            measurements,
            startInterval,
            endInterval,
            period,
            fields);

    console.log(`Analysis completed`);

    return analysis;
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

exports.heatMapConfigurationValidation = async (

    {
        database = x`database`,
        policy = x`policy`,
        startInterval = x`startInterval`,
        endInterval = x`endInterval`,
        fields = x`fields`,
        nMeasurements = 0,
        period = 300,
        palette = _PALETTE_GRAY,
        heatMapType = 'original'
    }

) => {

    //timeseries validation
    console.log(`Validating DB: ${database} \n - policy: ${policy} \n - fields: ${fields}`);
    await validateDatabaseArgs(database, policy, fields);

    //intervals validation
    console.log(`Validating time interval [${startInterval} - ${endInterval}]`);
    let start_interval, end_interval;
    try {

        start_interval = Date.parse(startInterval);
        end_interval = Date.parse(endInterval);
    }
    catch (e) {
        throw new Error(`invalid interval: [${startInterval} - ${endInterval}]`);
    }

    //end interval must be equal or greater than start interval
    const diff_time = start_interval - end_interval;
    if (diff_time > 0)
        throw new Error('end interval must be greater or equal then start');

    //number of measurements validation
    console.log(`Validing #measurements [${nMeasurements}]`);
    if (nMeasurements < 0)
        throw new Error(`measurements cannot be negative [Default: 0 => all]`);

    //period validation
    console.log(`Validating period [${period}]`);
    if ((period % 300) !== 0)
        throw new Error('invalid period, must be multiple of 300 (5min)');

    //palette validation
    if (!palettes.includes(palette))
        throw new Error(`invalid palette [AVAILABLE: ${palettes}]`);

    //heatmap type validation
    if (!heatMapTypes.includes(heatMapType))
        throw new Error(`invalid heatmap type [AVAILABLE: ${heatMapTypes}]`);

    return true;
};