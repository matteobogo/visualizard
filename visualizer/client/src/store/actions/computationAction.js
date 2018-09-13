import * as actionTypes from '../types/actionTypes';

export const setRequestItem = (item, itemType) => {

    return (dispatch) => {

        dispatch({
            type: actionTypes.SET_REQUEST_ITEM,
            payload: item,
            itemType: itemType
        });
    };
};

export const setComputationInProgress = (bool) => {

    return (dispatch) => {

        dispatch({
            type: actionTypes.COMPUTATION_IN_PROGRESS,
            payload: bool
        });
    }
};

export const computationReceived = (response, computationType) => {

    switch(computationType) {

        case actionTypes._TYPE_COMPUTATION_ANALYSIS_DATASET:

            return (dispatch) => {

                dispatch({
                    type: actionTypes.COMPUTATION_SUCCESS,
                    payload: response,
                    computationType: actionTypes._TYPE_COMPUTATION_ANALYSIS_DATASET,
                })
            };

        case actionTypes._TYPE_COMPUTATION_ANALYSIS_PSPT:

            return (dispatch) => {

                dispatch({
                    type: actionTypes.COMPUTATION_SUCCESS,
                    payload: response,
                    computationType: actionTypes._TYPE_COMPUTATION_ANALYSIS_PSPT,
                })
            }
    }
};

export const computationFailed = (error, errorType) => {

    return (dispatch) => {

        dispatch({
            type: actionTypes.COMPUTATION_ERRORED,
            error: error,
            errorType: errorType
        })
    }
};