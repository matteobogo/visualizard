/* Redux Root Reducer */

import { combineReducers } from 'redux';
import { datasetInfo } from './datasetInfoReducer';
import { notifications } from './notificationsReducer';
import { computation } from './computationReducer';

export default combineReducers({
    datasetInfo,
    notifications,
    computation,
})