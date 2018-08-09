import * as actionTypes from '../types/actionTypes';

const initialState = {

    currentDatabase: "",
    currentPolicy: "",
    currentField: "",
    currentPalette: "",
    currentPeriod: "",
    currentTimeStart: "",
    currentTimeEnd: "",
};

export const heatmapConfig = (state = initialState, action) => {

    switch (action.type) {

        case actionTypes.CURRENT_CONFIG_SET_ITEM:

            if (action.itemType === actionTypes._TYPE_DATABASE) {

                return {
                    ...state,
                    currentDatabase: action.payload,
                };
            }

            else if (action.itemType === actionTypes._TYPE_POLICY) {

                return {
                    ...state,
                    currentPolicy: action.payload,
                };
            }

            else if (action.itemType === actionTypes._TYPE_FIELD) {

                return {
                    ...state,
                    currentField: action.payload,
                };
            }

            else if (action.itemType === actionTypes._TYPE_PALETTE) {

                return {
                    ...state,
                    currentPalette: action.payload,
                };
            }

            else if (action.itemType === actionTypes._TYPE_PERIOD) {

                return {
                    ...state,
                    currentPeriod: action.payload,
                }
            }

            else if (action.itemType === actionTypes._TYPE_FIRST_INTERVAL) {

                return {
                    ...state,
                    currentTimeStart: action.payload,
                };
            }

            else if (action.itemType === actionTypes._TYPE_LAST_INTERVAL) {

                return {
                    ...state,
                    currentTimeEnd: action.payload,
                };
            }

            break;

        case actionTypes.CURRENT_CONFIG_RESET:

            return initialState;

        default:
            return state;
    }
};