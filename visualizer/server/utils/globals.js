const constants = require('./constants');

let heatMapComputationStatus = false;
let heatMapComputationPercentage = constants.COMPUTATION_PERCENTAGES_INIT;

const setHeatMapComputationStatus = (bool) => {
    heatMapComputationStatus = bool;

    //re-init computation current completation percentage
    if (!bool) heatMapComputationPercentage = constants.COMPUTATION_PERCENTAGES_INIT;
};

const getHeatMapComputationStatus = () => heatMapComputationStatus;

const setHeatMapComputationPercentage = (percentage) => heatMapComputationPercentage = percentage;

const getHeatMapComputationPercentage = () => heatMapComputationPercentage;

module.exports = {

    setHeatMapComputationStatus: setHeatMapComputationStatus,
    getHeatMapComputationStatus: getHeatMapComputationStatus,
    setHeatMapComputationPercentage: setHeatMapComputationPercentage,
    getHeatMapComputationPercentage: getHeatMapComputationPercentage,
};