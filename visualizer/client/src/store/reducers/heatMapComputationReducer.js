import * as actionTypes from '../types/actionTypes';
import * as commonTypes from '../types/commonTypes';

const initialState = {

    uuid: null,

    computationRequest: {

        database: null,
        policy: null,
        startInterval: null,
        endInterval: null,
        field: null,
        nMeasurements: -1,
        period: -1,
        palette: null,
        heatMapType: null,
    },

    analysis: {

        datasetStats: null,
        meanPointsPerTimestamp: [],
    },

    update: {

        measurementName: "",
        measurementId: -1,
        points: [],
    },

    stage: commonTypes.COMPUTATION_STAGE_IDLE,
    error: "",
};

export const heatMapComputation = (state = initialState, action) => {

    switch(action.type) {

        case actionTypes.HEATMAP_COMPUTATION_REQUEST:

            return {

                ...state,
                computationRequest: action.payload,
                stage: commonTypes.COMPUTATION_STAGE_INIT,
            };

        case actionTypes.HEATMAP_COMPUTATION_RESET:

            return initialState;

        case actionTypes.HEATMAP_COMPUTATION_ACCEPTED:

            return {

                ...state,
                uuid: action.uuid,
                computationRequest: action.payload,
                stage: commonTypes.COMPUTATION_STAGE_ACCEPTED,
            };

        case actionTypes.HEATMAP_COMPUTATION_REJECTED:

            return {

                ...state,
                computationRequest: action.payload,
                stage: commonTypes.COMPUTATION_STAGE_REJECTED,
                error: action.error,
            };

        case actionTypes.HEATMAP_COMPUTATION_ANALYZED:

            return {

                ...state,
                analysis: action.payload,
                stage: commonTypes.COMPUTATION_STAGE_ANALYZED,
            };

        case actionTypes.HEATMAP_COMPUTATION_ERRORED:

            return {

                ...state,
                stage: commonTypes.COMPUTATION_STAGE_ERRORED,
                error: action.error,
            };

        default:
            return state;
    }
};