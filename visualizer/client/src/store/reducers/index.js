/* Redux Root Reducer */

import { combineReducers } from 'redux';
import { datasetInfo } from './datasetInfoReducer';
import { heatmapConfig } from './heatmapConfigReducer';
import { notifications } from './notificationsReducer';

export default combineReducers({
    datasetInfo,
    heatmapConfig,
    notifications
})