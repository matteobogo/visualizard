export const getRequestUUID = (state) => {

    return state.heatMapComputation.uuid;
};

export const getComputationRequest = (state) => {

    return state.heatMapComputation.computationRequest;
};

export const getComputationStage = (state) => {

    return state.heatMapComputation.stage;
};

export const getDatasetStats = (state) => {

    return state.heatMapComputation.analysis.datasetStats;
};

export const getMeanPointsPerTimestamp = (state) => {

    return state.heatMapComputation.analysis.meanPointsPerTimestamp;
};