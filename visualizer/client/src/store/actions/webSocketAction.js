import * as actionTypes from '../types/actionTypes';

export const setConnection = (connection) => ({

    type: actionTypes.WS_SET_CONNECTION,
    payload: connection
});

export const resetConnection = () => ({

    type: actionTypes.WS_RESET_CONNECTION
});

export const addItem = ({uuid, operation, queueType, data}) => ({

    type: actionTypes.WS_ADD_ITEM,
    queueType: queueType,
    payload: {
        uuid: uuid,
        operation: operation,
        data: data,
    },
});

export const removeItem = ({uuid = null, queueType}) => ({

   type: actionTypes.WS_POP_ITEM,
   queueType: queueType,
   payload: {
       uuid: uuid,
   },
});