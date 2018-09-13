import * as types from '../types/actionTypes';

export const getConfiguration = (state) => {

    return state.computation.configuration;
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

export const getHeatMapType = (state) => {

    return state.computation.heatMap.heatMapType;
};