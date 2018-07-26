require('datejs');

const influx = require('../database/influxdb');

const fs = require('fs'),
      path = require('path');

const csv = require("fast-csv");

//palette for nodejs (https://github.com/tj/palette)
//const palette = require('palette');

//color gray scale
// const palette_shades_gray = [  //50 shades of gray.. ;)
//     "#FFFFFF","#F8F8F8","#F0F0F0","#E8E8E8","#E0E0E0","#D8D8D8","#D0D0D0","#C8C8C8","#C0C0C0","#B8B8B8",
//     "#B0B0B0","#A8A8A8","#A0A0A0","#989898","#909090","#888888","#808080","#787878","#707070","#686868",
//     "#606060","#585858","#505050","#484848","#404040","#383838","#303030","#282828","#202020","#181818",
//     "#101010","#080808","#000000"];

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
 * Manage missing parameters in functions.
 * @param p the missing parameter
 */
const x = p => { throw new Error(`Missing parameter: ${p}`) };

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

const validateDatabaseArgs = async (dbname, policy, fields) => {

    const [dbs, policies, measurements] = await Promise.all([
        influx.getDatabases(),
        influx.getRetentionPolicies(dbname),
        fetchMeasurementsListFromHttpApi(dbname)
    ]).catch(err => { throw new Error('database unavailable');});

    if (dbs.filter(d => (d.name === dbname)).length === 0)
        throw new Error(`invalid database ${dbname}`);

    if (policies.filter(p => (p.name === policy)).length === 0)
        throw new Error(`invalid policy ${policy}`);

    if (measurements.length === 0) throw new Error('no data available');
    else {

        let measurement = measurements[0];
        await influx.getFieldsKeyByName(measurement)
            .catch(err => { throw new Error('no data available'); })
            .then(res => {

                let fieldKeys = res.map(k => k.fieldKey);
                if (!fieldKeys.some(r => fields.includes(r))) throw new Error('wrong fields');
            })
    }
};

const analyzeMeasurements = async (
    dbname,
    policy,
    measurements,
    start_interval,
    end_interval,
    period,
    fields) => {

    let sample_point_length = -1;
    let measurements_stats = [];
    for (let i = 0; i < measurements.length; ++i) {

        let stat = {};
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
        sample_point_length = points.length;

        //initialize
        stat['dbname'] = dbname;
        stat['policy'] = policy;
        stat['measurement'] = measurements[i];
        stat['start_interval'] = start_interval;
        stat['end_interval'] = end_interval;
        stat['period'] = period;
        stat['intervals'] = (Date.parse(end_interval) - Date.parse(start_interval)) / (period * 1000) + 1;
        stat['fields'] = fields;
        stat['stats'] = {};
        fields.forEach(field => {
            stat['stats'][field] = {
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
                if (stat['stats'][field]['min'] === undefined || p[field] < stat['stats'][field]['min']) {
                    stat['stats'][field]['min'] = p[field];
                    stat['stats'][field]['min_ts'] = Date.parse(p['time']);
                }

                //max
                if (stat['stats'][field]['max'] === undefined || p[field] > stat['stats'][field]['max']) {
                    stat['stats'][field]['max'] = p[field];
                    stat['stats'][field]['max_ts'] = Date.parse(p['time']);
                }

                //sum
                stat['stats'][field]['sum'] += p[field];
            });
        });

        //mean
        fields.forEach(field => {

            stat['stats'][field]['mean'] = stat['stats'][field]['sum'] / points.length;
        });
        measurements_stats.push(stat);
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

        //mean
        dataset_stats[field]['mean'] = dataset_stats[field]['sum'] / (measurements.length * sample_point_length);
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
        ).then(points => { return points; }); //non serve

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

    return [dataset_stats, measurements_stats];
};

const paintPalette = () => {

    //TODO
};

//feature scaling: standardization
//https://en.wikipedia.org/wiki/Feature_scaling
const standardization = (points, field, mean, std) => {

    let standardizated_points = [];
    points.forEach(point => {

        standardizated_points.push((point[field] - mean) / std);
    });

    return standardizated_points;
};

const drawHeatMap = async (
    { width, height },
    {dataset_stats, measurement_stats},
    { palette },
    heatmap_type) => {

    let first_pixel = false;

    let current_palette;
    if (palette === 'gray')
        current_palette = palette_shades_gray;
    else if (palette === 'red')
        current_palette = palette_shades_red;
    else throw new Error('invalid palette');

    console.log(`${palette} palette selected`);

    //one heatmap for each field
    let fields = measurement_stats[0]['fields'];
    for(let k = 0; k < fields.length; ++k) {

        console.log(`Start building HeatMap ${heatmap_type} for ${fields[k]}`);

        // //domain
        // let max = Number.MIN_SAFE_INTEGER
        // ,   min = Number.MAX_SAFE_INTEGER;
        //
        // console.log(`Computing domain..`);
        // measurement_stats.forEach(s => {
        //
        //     if (s['stats'][fields[k]]['min'] < min) min = s['stats'][fields[k]]['min'];
        //     if (s['stats'][fields[k]]['max'] > max) max = s['stats'][fields[k]]['max'];
        // });
        // console.log(`Domain: [${min} - ${max}]`);
        //
        // //normalize data
        // // zi = (xi - min(x)) / (max(x) - min(x))
        // const normalize = (value) => {
        //
        //     return (value - min) / (max - min);
        // };

        //feature scaling: standardization
        //https://en.wikipedia.org/wiki/Feature_scaling
        // let min = Number.MAX_SAFE_INTEGER;
        // let max = Number.MIN_SAFE_INTEGER;
        // for(let i = 0; i < height; ++i) {
        //
        //     let points = await fetchPointsFromHttpApi(
        //         measurement_stats[i]['dbname'],
        //         measurement_stats[i]['policy'],
        //         measurement_stats[i]['measurement'],
        //         measurement_stats[i]['start_interval'],
        //         measurement_stats[i]['end_interval'],
        //         measurement_stats[i]['period'],
        //         [fields[k]]) //f needs an array of fields, just pass 1 field within an array
        //
        //         .catch(err => {
        //
        //             console.log(err);
        //             throw new Error('error fetching points from database');
        //         });
        //
        //     if (points.length === 0) throw new Error(`no points available for ${measurement_stats[i]['measurement']}`);
        //
        //     let standardizated_points = standardization(
        //         points,
        //         fields[k],
        //         dataset_stats[fields[k]]['mean'],
        //         dataset_stats[fields[k]]['std']
        //     );
        //
        //     standardizated_points.forEach(std_point => {
        //
        //         if (std_point < min) min = std_point;
        //         if (std_point > max) max = std_point;
        //     })
        // }
        //
        //console.log(`standardizated domain: [${min} - ${max}]`);

        /* Color Function */

        // Feature Scaling
        // standardizated points:
        // less than -1 => white (outlier)
        // greater than +1 => black (outlier)
        // between -1 and +1 we maps the color palette
        // we can play with bounds [-1.5,1.5], [-2,+2], ecc to optimize the result
        let min = -3, max = 3;  //-5,5
        let range = Math.abs(max - min);
        let bucket_len = range / current_palette.length;

        const color = (value) => { //value need to be standardizated with feature scaling

            if (value < min) return {r:255, g:255, b:255};   //white
            if (value > max) return {r:0, g:0, b:0};         //black

            let rgb;
            for(let i = 0, b = min; i < current_palette.length; ++i, b += bucket_len) {

                if (value <= b + bucket_len) { //value in the current bucket

                    //console.log(value, current_palette[i]);
                    rgb = current_palette[i];
                    break;
                }
            }

            return rgb;
        };

        //init canvas
        console.log(`Generating Canvas [${width}x${height}]..`);
        let Canvas = require('canvas')
        ,   canvas = Canvas.createCanvas(width, height)
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
                    throw new Error('error fetching points from database');
                });

            if (points.length === 0) throw new Error(`no points available for ${measurement_stats[i]['measurement']}`);

            let standardizated_points = standardization(
                points,
                fields[k],
                dataset_stats[fields[k]]['mean'],
                dataset_stats[fields[k]]['std']
            );

            //console.log(`Drawing line #${i+1} with ${standardizated_points.length} points`);
            for (let j = 0; j < standardizated_points.length; ++j, l += 4) {

                let c = color(standardizated_points[j]);

                imageData.data[l + 0] = c.r;
                imageData.data[l + 1] = c.g;
                imageData.data[l + 2] = c.b;
                imageData.data[l + 3] = 255;

                //first red pixel (0,0) position
                if (first_pixel === false) {
                    first_pixel = true;
                    imageData.data[0] = 255;
                    imageData.data[1] = 0;
                    imageData.data[2] = 0;
                    imageData.data[3] = 255;
                }
            }
        }
        ctx.putImageData(imageData, 0, 0);

        console.log(`HeatMap ${heatmap_type} built`);

        //palette
        //TODO

        //write .PNG
        console.log(`Saving HeatMap for ${fields[k]}..`);
        canvas
            .createPNGStream()
            .pipe(fs.createWriteStream(path.join(__dirname + `/heatmap_${heatmap_type}_${fields[k]}.png`)))
            .on('finish', () => console.log(`HeatMap .PNG for ${fields[k]} saved`));

        canvas
            .createJPEGStream()
            .pipe(fs.createWriteStream(path.join(__dirname + `/heatmap_${heatmap_type}_${fields[k]}.jpeg`)))
            .on('finish', () => console.log(`HeatMap .JPEG for ${fields[k]} saved`));
    }
    //check png saved true/false
    //TODO
    return true;
};

const sortMeasurementsByFieldByStatsType = (stats, field, type) => {

    return stats.slice().sort(function (a, b) {

        return a['stats'][field][type] < b['stats'][field][type];
    });
};

const buildHeatMaps = async (
    {
        dbname = x`dbname`,
        policy = x`policy`,
        interval = x`interval`,
        fields = x`fields`,
        n_machines = 0,
        period = 300,
        type = 'all',
        palette= 'gray',
    } = {}) => {

    try {

        //database args
        await validateDatabaseArgs(dbname, policy, fields);  //TODO catch error

        //intervals
        let start_time, end_time;
        try {

            start_time = Date.parse(interval[0]);
            end_time = Date.parse(interval[1]);
        }
        catch (e) {
            throw new Error('invalid timestamps');
        }

        const diff_time = start_time - end_time;
        if (diff_time > 0)
            throw new Error('end interval must be greater or equal then start');

        //period
        if ((period % 300) !== 0) throw new Error('invalid period, must be multiple of 300 (5min)');

        /* Fetch Measurements from Database */
        let measurements = await fetchMeasurementsListFromHttpApi(dbname);

        //only a sample of machines
        if (n_machines > 0)
            measurements = measurements.slice(0, n_machines);

        /* Analyze Measurements */
        console.log(`Start analyzing ${measurements.length} measurements..`);
        let dataset_stats, measurement_stats;
        [dataset_stats, measurement_stats] = await
            analyzeMeasurements(
                dbname,
                policy,
                measurements,
                interval[0],
                interval[1],
                period,
                fields);

        if (measurement_stats.length === 0) throw new Error('measurements analysis fails');

        //TEST
        console.log(dataset_stats);

        console.log(`Start building HeatMaps..`);
        let width = (end_time - start_time) / (period * 1000) + 1
        ,   height = measurements.length;

        switch(type) {

            case "sortByMachine":

                await drawHeatMap(
                    {width: width, height: height},
                    {dataset_stats: dataset_stats, measurement_stats: measurement_stats},
                    {palette: palette}, type);
                break;

            case "sortBySum":

                break;

            case "sortByTsOfMaxValue":

                break;

            default:

                for(let i = 0; i < fields.length; ++i) {

                    await Promise.all([

                        //sorted by machine id
                        drawHeatMap(
                            {width: width, height: height},
                            {dataset_stats: dataset_stats, measurement_stats: measurement_stats},
                            {palette: palette},
                            'original'
                        ),

                        //sorted by sum (integral)
                        drawHeatMap(
                            {width: width, height: height},
                            {
                                dataset_stats: dataset_stats,
                                measurement_stats: sortMeasurementsByFieldByStatsType(measurement_stats, fields[i], 'sum')
                            },
                            {palette: palette},
                            'sum'
                        ),

                        //sorted by timestamp of max value
                        drawHeatMap(
                            {width: width, height: height},
                            {
                                dataset_stats: dataset_stats,
                                measurement_stats: sortMeasurementsByFieldByStatsType(measurement_stats, fields[i], 'sum')
                            },
                            {palette: palette},
                            'max_ts'
                        )
                    ]);
                }
        }
    }
    catch (e) {
        console.log(e);
    }
};

module.exports = {
    buildHeatMaps: buildHeatMaps,
};