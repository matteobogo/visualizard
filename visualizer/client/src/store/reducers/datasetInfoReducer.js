import * as types from '../types/actionTypes';
//import makeSentinel from "mutation-sentinel";
//const wrapper = makeSentinel(obj)
//import _ from 'lodash';

const initialState = {

    databases: [],
    policies: [],
    fields: [],
    palettes: [],
    periods: [],
    firstInterval: "",
    lastInterval: "",
    hasErrored: "",
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

            if (action.itemType === types._TYPE_DATABASE) {

                return {
                    ...state,
                    databases: action.payload,
                };
            }
            else if (action.itemType === types._TYPE_POLICY) {

                return {
                    ...state,
                    policies: action.payload,
                };
            }
            else if (action.itemType === types._TYPE_FIELD) {

                return {
                    ...state,
                    fields: action.payload,
                };
            }
            else if (action.itemType === types._TYPE_PALETTE) {

                return {
                    ...state,
                    palettes: action.payload,
                };
            }
            else if (action.itemType === types._TYPE_PERIOD) {

                return {
                    ...state,
                    periods: action.payload,
                };
            }
            else if (action.itemType === types._TYPE_INTERVALS) {

                return {
                    ...state,
                    firstInterval: action.payload.firstInterval,
                    lastInterval: action.payload.lastInterval,
                };
            }

            break;

        case types.FETCH_ITEMS_RESET:

            return initialState;

        default:
            return state;
    }
};