export const getRequestUUID = (state) => {

    return state.computation.uuid;
};

export const getComputationRequest = (state) => {

    return state.computation.request;
};

export const getCurrentComputationStage = (state) => {

    return state.computation.currentStage;
};

export const getPendingComputationStages = (state) => {

    return state.computation.stagesQueue;
};

export const getComputationInProgress = (state) => {

    return state.computation.inProgress;
};

export const getDatasetAnalysis = (state) => {

    return state.computation.analysis.datasetAnalysis;
};

export const getPointsStatsPerTimestampAnalysis = (state) => {

    return state.computation.analysis.psptAnalysis;
};