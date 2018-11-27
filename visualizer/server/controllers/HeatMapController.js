const globals = require('../utils/globals');
const heatMapsService = require('../services/HeatMapsService');

const mime = {
    png: 'image/png',
    jpeg: 'image/jpeg',
    json: 'application/json',
};

const getHeatMapBounds = async (req, res) => {

    let bounds, err;
    [err, bounds] = await to(heatMapsService.getHeatMapBounds(req.query));

    if (err) return ReE(res, `heatmap's bounds are not available`);

    res.setHeader('Content-Type', mime.json);
    return ReS(res, {payload: bounds}, 200);
};

const getHeatMapTypes = async (req, res) => {

    const heatMapTypes = heatMapsService.getHeatMapTypes();

    if (!heatMapTypes || heatMapTypes.length === 0) return ReE(res, 'no heatmap types available');

    res.setHeader('Content-Type', mime.json);
    return ReS(res, {payload: heatMapTypes}, 200);
};

const getZoomLevels = async (req, res) => {

    const database = req.query.database;
    const policy = req.query.policy;

    const zoomLevels = await heatMapsService.getZoomLevels({
        database: database,
        policy: policy,
    });

    if (!zoomLevels || zoomLevels.length === 0) return ReE(res, 'no zoom levels available');

    res.setHeader('Content-Type', mime.json);
    return ReS(res, {payload: zoomLevels}, 200);
};

const getPalettes = async (req, res) => {

    const palettes = heatMapsService.getPalettes();

    if (!palettes || palettes.length === 0) return ReE(res, 'no palettes available');

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
        imageType: req.query.imageType,
        mode: req.query.mode,
    };

    heatMapsService.heatMapBuildAndStore({request: heatMapRequest});

    return ReS(res, {payload: 'computation started'}, 200);
};

const getDataByMachineIdxByHeatMapType = async (req, res) => {

    res.setHeader('Content-Type', 'application/json');

    const request = {
        database: req.query.database,
        policy: req.query.policy,
        startInterval: req.query.startInterval,
        endInterval: req.query.endInterval,
        fields: req.query.fields.split(','),
        heatMapType: req.params.heatMapType,
        timeSerieIndex: req.params.timeSerieIndex,
    };

    const data = await
        heatMapsService.getDataByMachineIdxByHeatMapType(request)
            .catch(err => ReE(res, `${err}`, 400));

    if (!data) return ReE(res, `no data available`, 400);

    return ReS(res,{payload: data}, 200);
};

module.exports = {
    getHeatMapBounds: getHeatMapBounds,
    getHeatMapTypes: getHeatMapTypes,
    getZoomLevels: getZoomLevels,
    getPalettes: getPalettes,
    setHeatMapZscores: setHeatMapZscores,
    getHeatMapZscore: getHeatMapZscore,
    getHeatMapComputationStatus: getHeatMapComputationStatus,
    stopHeatMapComputation: stopHeatMapComputation,
    storeHeatMap: storeHeatMap,
    getDataByMachineIdxByHeatMapType: getDataByMachineIdxByHeatMapType,
};