import * as actionTypes from '../types/actionTypes';

const initialState = {

    notification: {
        status: "",
        notificationType: ""
    }
};

export const notifications = (state = initialState, action) => {

    switch (action.type) {

        case actionTypes.NOTIFICATION:

            return {
                ...state,
                notification: {
                    status: action.payload,
                    notificationType: action.notificationType,
                }
            };

        default:
            return state;
    }
};