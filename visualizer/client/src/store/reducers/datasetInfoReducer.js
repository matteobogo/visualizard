import * as types from '../types/datasetInfoTypes';
//import makeSentinel from "mutation-sentinel";
//const wrapper = makeSentinel(obj)
//import _ from 'lodash';

const initialState = {

    databases: [],
    policies: [],
    fields: [],
    palettes: [],
    hasErrored: false,
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

            break;

        default:
            return state;
    }
};