const timeSerieService = require('../services/TimeSerieService');

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
        timeSerieService.getDataByMachineIdxByHeatMapType(request)
            .catch(err => ReE(res, `${err}`, 400));

    if (!data) return ReE(res, `no data available`, 400);

    return ReS(res,{payload: data}, 200);
};

module.exports = {
    getDataByMachineIdxByHeatMapType: getDataByMachineIdxByHeatMapType,
};