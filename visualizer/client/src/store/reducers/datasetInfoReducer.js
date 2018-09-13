import * as types from '../types/actionTypes';
//import makeSentinel from "mutation-sentinel";
//const wrapper = makeSentinel(obj)
//import _ from 'lodash';

const initialState = {

    databases: [],
    policies: [],
    fields: [],
    periods: [],
    heatMapTypes: [],
    palettes: [],
    firstInterval: null,
    lastInterval: null,
    hasErrored: null,
    isLoading: false,
};

export const datasetInfo = (state = initialState, action) => {

    switch(action.type) {

        case types.FETCH_ITEMS_ERROR:

            return {
                ...state,
                hasErrored: action.payload,
            };

        case types.FETCH_ITEMS_LOADING:

            return {
                ...state,
                isLoading: action.payload,
            };

        case types.FETCH_ITEMS_SUCCESS:

            if (action.itemType === types._TYPE_DATABASES) {

                return {
                    ...state,
                    databases: action.payload,
                };
            }
            else if (action.itemType === types._TYPE_POLICIES) {

                return {
                    ...state,
                    policies: action.payload,
                };
            }
            else if (action.itemType === types._TYPE_FIELDS) {

                return {
                    ...state,
                    fields: action.payload,
                };
            }
            else if (action.itemType === types._TYPE_PERIOD) {

                return {
                    ...state,
                    periods: action.payload,
                };
            }
            else if (action.itemType === types._TYPE_HEATMAP_TYPES) {

                return {
                    ...state,
                    heatMapTypes: action.payload,
                }
            }
            else if (action.itemType === types._TYPE_PALETTE) {

                return {
                    ...state,
                    palettes: action.payload,
                };
            }
            else if (action.itemType === types._TYPE_FIRST_INTERVAL) {

                return {
                    ...state,
                    firstInterval: new Date(action.payload),
                }
            }
            else if (action.itemType === types._TYPE_LAST_INTERVAL) {

                return {
                    ...state,
                    lastInterval: new Date(action.payload),
                }
            }

            break;

        case types.FETCH_ITEMS_RESET:

            return initialState;

        default:
            return state;
    }
};