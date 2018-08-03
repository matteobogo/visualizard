/* Redux Root Reducer */

import { combineReducers } from 'redux';
import { datasetInfo } from './datasetInfoReducer';
import { heatmapConfig } from './heatmapConfigReducer';

export default combineReducers({
    datasetInfo,
    heatmapConfig
})