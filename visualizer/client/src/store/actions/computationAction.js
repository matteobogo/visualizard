import * as actionTypes from '../types/actionTypes';

export const setComputationRequestItem = (item, itemType) => {

    return (dispatch) => {

        dispatch({ type: actionTypes.SET_COMPUTATION_REQUEST_ITEM, payload: item, itemType: itemType});
    };
};

export const startComputation = () => {

    return (dispatch) => {

        dispatch({ type: actionTypes.COMPUTATION_START });
    };
};

export const consumeComputationStage = (stage) => {

    return (dispatch) => {

        dispatch({ type: actionTypes.COMPUTATION_CONSUME_STAGE, payload: stage });
    };
};

export const setCurrentComputationStage = (stage) => {

    return (dispatch) => {

        dispatch({ type: actionTypes.COMPUTATION_SET_STAGE, payload: stage });
    };
};

export const setComputationInProgress = (bool) => {

    return (dispatch) => {

        dispatch({ type: actionTypes.COMPUTATION_IN_PROGRESS, payload: bool });
    }
};

export const computationReceived = ({response, uuid}={}, type) => {

    switch(type) {

        case actionTypes.COMPUTATION_VALIDATION_RECEIVED:

            return (dispatch) => {

                dispatch({ type: actionTypes.COMPUTATION_VALIDATION_RECEIVED, uuid: uuid })
            };

        case actionTypes.COMPUTATION_ANALYSIS_RECEIVED:

            return (dispatch) => {

                dispatch({ type: actionTypes.COMPUTATION_ANALYSIS_RECEIVED, payload: response, uuid: uuid })
            };
    }
};

export const computationFailed = (error, type, {uuid} = {}) => {

    switch(type) {

        case actionTypes.COMPUTATION_ERRORED:

            return (dispatch) => {

                dispatch({ type: actionTypes.COMPUTATION_ERRORED, error: error});
            };

        case actionTypes.COMPUTATION_VALIDATION_FAILED:

            return (dispatch) => {

                dispatch({ type: actionTypes.COMPUTATION_VALIDATION_FAILED, error: error});
            };

        case actionTypes.COMPUTATION_ANALYSIS_FAILED:

            return (dispatch) => {

                dispatch({ type: actionTypes.COMPUTATION_ANALYSIS_FAILED, error: error});
            };
    }
};

export const resetPreviousComputationRequest = () => {

    return (dispatch) => {

        dispatch({ type: actionTypes.HEATMAP_COMPUTATION_RESET })
    };
};