import * as actionTypes from '../types/actionTypes';
import * as localConstants from '../../utils/constants';

const initialState = {

    notification: {

        enable: false,
        message: null,
        type: null,
        delay: null,
    }
};

export const notifications = (state = initialState, action) => {

    switch (action.type) {

        case actionTypes.SET_NOTIFICATION:

            return {
                ...state,
                notification: {
                    ...state.notification,
                    enable: action.payload.enable,
                    message: action.payload.message,
                    type: action.payload.type,
                    delay: action.payload.delay,
                }
            };

        case actionTypes.RESET_NOTIFICATION:

            return initialState;

        default:
            return state;
    }
};