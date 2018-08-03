import * as datasetTypes from '../types/datasetInfoTypes';
import * as heatMapTypes from '../types/heatmapConfigTypes';

export const setItem = (item, itemType) =>
    ({ type: heatMapTypes.SET_ITEM_CURRENT_CONFIG, payload: item, itemType: itemType});

export const setItemHeatMapConfiguration = (item, itemType) => {

    return (dispatch) => {

        dispatch(setItem(item, itemType));
    }
};