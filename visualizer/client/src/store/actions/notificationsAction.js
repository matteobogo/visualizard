import * as actionTypes from '../types/actionTypes';

export const notify = (notification) => ({

    type: actionTypes.SET_NOTIFICATION,
    payload: {
        enable: notification.enable,
        message: notification.message,
        type: notification.type,
        delay: notification.delay,
    }
});

export const reset = () => ({ type: actionTypes.RESET_NOTIFICATION });