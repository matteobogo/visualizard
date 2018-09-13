/* Redux Root Reducer */

import { combineReducers } from 'redux';
import { datasetInfo } from './datasetInfoReducer';
import { notifications } from './notificationsReducer';
import { computation } from './computationReducer';
import { websocket } from './webSocketReducer';

export default combineReducers({
    datasetInfo,
    notifications,
    computation,
    websocket,
})