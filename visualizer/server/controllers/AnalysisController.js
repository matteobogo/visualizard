const globals = require('../utils/globals');
const analysisService = require('../services/AnalysisService');

const header = {
    contentType: 'Content-Type',
};

const mime = {
    json: 'application/json',
};

const getAnalysisStatistics = async (req, res) => {

    const statistics = analysisService.getStatistics();
    if (!statistics || statistics === undefined || statistics.length === 0) return ReE(res, 'no statistics available');

    res.setHeader(header.contentType, mime.json);
    return ReS(res, {payload: statistics}, 200);
};

const startDatasetAnalysis = async (req, res) => {

    let database = req.query.database;
    let policy = req.query.policy;
    let startInterval = req.query.startInterval;
    let endInterval = req.query.endInterval;
    let period = req.query.period;
    let nMeasurements = req.query.nMeasurements;

    analysisService.analyzeDataset({
        database: database,
        policy: policy,
        startInterval: startInterval,
        endInterval: endInterval,
        period: period,
        nMeasurements: nMeasurements,
    });

    res.setHeader(header.contentType, mime.json);
    return ReS(res, {payload: true}, 200);
};

module.exports = {
    startDatasetAnalysis: startDatasetAnalysis,
    getAnalysisStatistics: getAnalysisStatistics,
};