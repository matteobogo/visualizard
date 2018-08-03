import * as datasetTypes from '../types/datasetInfoTypes';

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
    }
};