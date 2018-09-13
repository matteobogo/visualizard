import * as actionTypes from '../types/actionTypes';
import * as localConstants from '../../utils/constants';
import _ from 'underscore';

const initialState = {

    connected: false,

    connection: {

    },

    requests: [],
    responses: {},
};

export const websocket = (state = initialState, action) => {

    switch (action.type) {

        case actionTypes.WS_SET_CONNECTION:

            return {
                ...state,
                connected: action.payload.connected,
            };

        case actionTypes.WS_RESET_CONNECTION:

            return initialState;

        case actionTypes.WS_ADD_ITEM:

            switch (action.queueType) {

                case localConstants._TYPE_REQUESTS_QUEUE:

                    return {
                        ...state,
                        requests: [action.payload, ...state.requests]
                    };

                case localConstants._TYPE_RESPONSES_QUEUE:

                    return {
                        ...state,
                        responses: {
                            ...state.responses,
                            [action.payload.uuid]: { operation: action.payload.operation, data: action.payload.data }
                        }
                    };


                default:
                    return state;
            }

        case actionTypes.WS_POP_ITEM:

            switch (action.queueType) {

                case localConstants._TYPE_REQUESTS_QUEUE:

                    return {
                        ...state,
                        requests: [
                            ...state.requests.slice(1, state.requests.length)
                        ],
                    };

                case localConstants._TYPE_RESPONSES_QUEUE:

                    delete state.responses[action.payload.uuid];

                    return {
                        ...state,
                        responses: state.responses,
                    };

                default:
                    return state;
            }

        default:
            return state;
    }
};