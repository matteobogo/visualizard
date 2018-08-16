import * as actionTypes from '../types/actionTypes';

export const sendComputationRequest = (request) => {

    return (dispatch) => {

        dispatch({ type: actionTypes.HEATMAP_COMPUTATION_REQUEST, payload: request});
    }
};

export const resetPreviousComputationRequest = () => {

    return (dispatch) => {

        dispatch({ type: actionTypes.HEATMAP_COMPUTATION_RESET })
    }
};

export const computationRequestAccepted = (request, uuid) => {

    return (dispatch) => {

        dispatch({ type: actionTypes.HEATMAP_COMPUTATION_ACCEPTED, payload: request, uuid: uuid});
    }
};

export const computationRequestRejected = (request, error) => {

    return (dispatch) => {

        dispatch({ type: actionTypes.HEATMAP_COMPUTATION_REJECTED, payload: request, error: error});
    }
};

export const datasetAnalysisCompleted = (analysis) => {

    return (dispatch) => {

        dispatch({ type: actionTypes.HEATMAP_COMPUTATION_ANALYZED, payload: analysis});
    }
};

export const datasetAnalysisErrored = (error) => {

    return (dispatch) => {

        dispatch({ type: actionTypes.HEATMAP_COMPUTATION_ERRORED, error: error});
    }
};