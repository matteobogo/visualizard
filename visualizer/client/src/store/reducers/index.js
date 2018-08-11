/* Redux Root Reducer */

import { combineReducers } from 'redux';
import { datasetInfo } from './datasetInfoReducer';
import { notifications } from './notificationsReducer';
import { heatMapComputation } from './heatMapComputationReducer';

export default combineReducers({
    datasetInfo,
    notifications,
    heatMapComputation,
})