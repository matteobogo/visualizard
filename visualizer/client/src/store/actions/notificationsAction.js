import * as actionTypes from '../types/actionTypes';

export const notify = (status, notificationType) =>
    ({ type: actionTypes.NOTIFICATION, payload: status, notificationType: notificationType });