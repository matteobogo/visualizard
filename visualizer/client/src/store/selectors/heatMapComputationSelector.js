import * as types from '../types/actionTypes';

export const getComputationRequest = (state) => {

    return state.heatMapComputation.computationRequest;
};

export const getComputationStage = (state) => {

    return state.heatMapComputation.stage;
};

export const getMeanPointsPerTimestamp = (state) => {

    return state.heatMapComputation.analysis.meanPointsPerTimestamp;
};