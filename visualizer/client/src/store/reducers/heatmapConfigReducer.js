import * as datasetTypes from '../types/datasetInfoTypes';
import * as heatmapTypes from '../types/heatmapConfigTypes';

const initialState = {

    currentDatabase: "",
    currentPolicy: "",
    currentTimeStart: "",
    currentTimeEnd: "",
    currentField: "",
    currentPalette: "",
};

export const heatmapConfig = (state = initialState, action) => {

    switch (action.type) {

        case heatmapTypes.SET_ITEM_CURRENT_CONFIG:

            if (action.itemType === datasetTypes._TYPE_DATABASE) {

                return {
                    ...state,
                    currentDatabase: action.payload,
                };
            }

            else if (action.itemType === datasetTypes._TYPE_POLICY) {

                return {
                    ...state,
                    currentPolicy: action.payload,
                };
            }

            else if (action.itemType === datasetTypes._TYPE_FIELD) {

                return {
                    ...state,
                    currentField: action.payload,
                };
            }

            else if (action.itemType === datasetTypes._TYPE_PALETTE) {

                return {
                    ...state,
                    currentPalette: action.payload,
                };
            }

            break;

        default:
            return state;
    }
};