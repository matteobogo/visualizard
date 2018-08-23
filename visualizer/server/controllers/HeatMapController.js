const globals = require('../utils/globals');
const heatMapsService = require('../services/HeatMapsService');

const mime = {
    png: 'image/png',
    jpeg: 'image/jpeg',
    json: 'application/json',
};

const getHeatMapTypes = async (req, res) => {

    let heatMapTypes = heatMapsService.getHeatMapTypes();

    if (heatMapTypes.length === 0) ReE(res, 'no heatmap types available');

    res.setHeader('Content-Type', mime.json);
    return ReS(res, {payload: heatMapTypes}, 200);
};

const getPalettes = async (req, res) => {

    let palettes = heatMapsService.getPalettes();

    if (palettes.length === 0) ReE(res, 'no palettes available');

    res.setHeader('Content-Type', mime.json);
    return ReS(res, {payload: palettes}, 200);
};

const setHeatMapZscores = async (req, res) => {

    const minZscore = req.query.min;
    const maxZscore = req.query.max;

    heatMapsService.setZscores(minZscore, maxZscore);

    res.setHeader('Content-Type', mime.json);
    return ReS(res, {payload: true}, 200);
};

const getHeatMapZscore = async (req, res) => {

    const zScores = heatMapsService.getZscores();

    res.setHeader('Content-Type', mime.json);
    return ReS(res, { payload: zScores}, 200);
};

const getHeatMapComputationStatus = async (req, res) => {

    const heatMapComputationStatus = globals.getHeatMapComputationStatus();
    const heatMapComputationPercentage = globals.getHeatMapComputationPercentage();

    res.setHeader('Content-Type', mime.json);
    return ReS(res, { payload: { status: heatMapComputationStatus, percentage: heatMapComputationPercentage } }, 200);
};

const stopHeatMapComputation = async (req, res) => {

    globals.setHeatMapComputationStatus(false);
    const heatMapComputationStatus = globals.getHeatMapComputationStatus();
    const heatMapComputationPercentage = globals.getHeatMapComputationPercentage();

    res.setHeader('Content-Type', mime.json);
    return ReS(res, { payload: { status: heatMapComputationStatus, percentage: heatMapComputationPercentage } }, 200);
};

const startHeatMapComputation = async (req, res) => {

    //TODO
};

const getHeatMapImageBase64Encoding = async (req, res) => {

    //TODO
};






const getHeatMap = async (req, res) => {

    let img_type = req.params.img_type
    ,   heatmap_type = req.params.heatmap_type
    ,   field = req.params.field;

    switch (img_type) {

        case 'png':
            //TODO
            break;

        case 'jpeg':
            //TODO
            break;

        default:
            res.setHeader('Content-Type', mime.json);
            return ReE(res, `${img_type} media type not supported`, 400);
    }
};

const buildResourceUsageHeatMaps = async function(req, res) {
    //res.setHeader('Content-Type', 'image/png');

    let err, type, dbname, policy, fields, n_measurements, period;

    type = req.query.type;
    dbname = req.query.dbname;
    policy = req.query.policy;
    fields = req.query.fields.split(',');
    n_measurements = req.query.n_measurements;
    period = req.query.period;

    // [err, response] = await to(
    //     heatmaps.buildHeatMapOrderByMachineId(
    //         'autogen',
    //         '2011-02-01T00:15:00.000Z',
    //         '2011-02-01T10:50:00.000Z',
    //         //'2011-03-01T10:50:00.000Z',
    //         resource_id,
    //         500
    //     ));

    let interval = req.query.interval.split(',');
    if (interval.length !== 2)
        return ReE(res, {message: 'two timestamps are required'}, 400);

    let body = await heatMapsService.entrypoint(

        dbname,
        policy,
        interval[0],
        interval[1],
        fields,
        n_measurements,
        period,
        type
    )
        .then(data => {
            res.set('Content-Type', 'image/png');
			res.send(data);
        });

    //TODO gestisci error (non usare to() perche vale solo per i JSON
    //TODO cambia da fields a richiesta su singolo field
    //TODO rivedi in heatmaps.js la catena di return ed elimina i for sui fields

    // res.set('Content-Type', 'image/png');
    // res.send(body);
        // .then(result => {
        //     console.log(result);
        //     return ReS(res, result, 200);
        // })
        // .catch(err => {
			// console.log(err);
        //     return ReE(res, err.message, 400);
        // });
};

const storeHeatMap = async (req, res) => {

    res.setHeader('Content-Type', 'application/json');

    const heatMapRequest = {
        database: req.query.database,
        policy: req.query.policy,
        startInterval: req.query.startInterval,
        endInterval: req.query.endInterval,
        fields: req.query.fields.split(','),
        nMeasurements: req.query.nMeasurements,
        period: req.query.period,
        palette: req.query.palette,
        heatMapType: req.query.heatMapType,
    };

    const imageType = req.query.imageType;

    heatMapsService.heatMapBuildAndStore({
        request: heatMapRequest,
        imageType: imageType,
    });

    return ReS(res, {payload: 'computation started'}, 200);
};

module.exports = {
    getHeatMapTypes: getHeatMapTypes,
    getPalettes: getPalettes,
    setHeatMapZscores: setHeatMapZscores,
    getHeatMapZscore: getHeatMapZscore,
    getHeatMapComputationStatus: getHeatMapComputationStatus,
    stopHeatMapComputation: stopHeatMapComputation,
    getHeatMap: getHeatMap,
    buildResourceUsageHeatMaps: buildResourceUsageHeatMaps,
    storeHeatMap: storeHeatMap,
};