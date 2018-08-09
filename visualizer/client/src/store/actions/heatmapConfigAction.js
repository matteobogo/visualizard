import * as actionTypes from '../types/actionTypes';

export const setItem = (item, itemType) =>
    ({ type: actionTypes.CURRENT_CONFIG_SET_ITEM, payload: item, itemType: itemType});

export const resetItems = () =>
    ({ type: actionTypes.CURRENT_CONFIG_RESET });

export const resetHeatMapConfiguration = () => {

    return (dispatch) => {
        dispatch(resetItems());
    }
};

export const setItemHeatMapConfiguration = (item, itemType) => {

    return (dispatch) => {

        dispatch(setItem(item, itemType));
    }
};