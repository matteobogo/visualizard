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
    return ReS(res, { payload: statistics }, 200);
};

module.exports = {
    getAnalysisStatistics: getAnalysisStatistics,
};