import * as datasetTypes from '../types/actionTypes';

export const getItemsHeatmapConfiguration = (state, itemType) => {

    switch (itemType) {

        case datasetTypes._TYPE_DATABASE:

            return state.heatmapConfig.currentDatabase;

        case datasetTypes._TYPE_POLICY:

            return state.heatmapConfig.currentPolicy;

        case datasetTypes._TYPE_FIELD:

            return state.heatmapConfig.currentField;

        case datasetTypes._TYPE_PALETTE:

            return state.heatmapConfig.currentPalette;

        case datasetTypes._TYPE_PERIOD:

            return state.heatmapConfig.currentPeriod;

        case datasetTypes._TYPE_FIRST_INTERVAL:

            return state.heatmapConfig.currentTimeStart;

        case datasetTypes._TYPE_LAST_INTERVAL:

            return state.heatmapConfig.currentTimeEnd;
    }
};