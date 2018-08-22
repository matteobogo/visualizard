import * as actionTypes from '../types/actionTypes';
import * as commonTypes from '../types/commonTypes';

const initialState = {

    uuid: null,

    request: {

        database: null,
        policy: null,
        startInterval: null,
        endInterval: null,
        field: null,
        nMeasurements: 0,
        period: null,
        heatMapType: null,
        palette: null,
    },

    analysis: {

        datasetAnalysis: null,
        psptAnalysis: null,
    },

    heatmap: {

        //TODO
    },

    computationStages: [],
    currentStage: commonTypes.COMPUTATION_STAGE_IDLE,
    stagesQueue: [],

    inProgress: false,

    error: "",
};

export const computation = (state = initialState, action) => {

    switch(action.type) {

        case actionTypes.SET_COMPUTATION_REQUEST_ITEM:

            switch (action.itemType) {

                case actionTypes._TYPE_DATABASE:

                    return {

                        ...state,
                        request: {
                            ...state.request,
                            database: action.payload,
                        }
                    };

                case actionTypes._TYPE_POLICY:

                    return {

                        ...state,
                        request: {
                            ...state.request,
                            policy: action.payload,
                        }
                    };

                case actionTypes._TYPE_FIELD:

                    return {

                        ...state,
                        request: {
                            ...state.request,
                            field: action.payload,
                        }
                    };

                case actionTypes._TYPE_PERIOD:

                    return {

                        ...state,
                        request: {
                            ...state.request,
                            period: action.payload,
                        }
                    };

                case actionTypes._TYPE_HEATMAP_TYPE:

                    return {

                        ...state,
                        request: {
                            ...state.request,
                            heatMapType: action.payload,
                        }
                    };

                case actionTypes._TYPE_PALETTE:

                    return {

                        ...state,
                        request: {
                            ...state.request,
                            palette: action.payload,
                        }
                    };

                case actionTypes._TYPE_START_INTERVAL:

                    return {

                        ...state,
                        request: {
                            ...state.request,
                            startInterval: action.payload,
                        }
                    };

                case actionTypes._TYPE_END_INTERVAL:

                    return {

                        ...state,
                        request: {
                            ...state.request,
                            endInterval: action.payload,
                        }
                    };

                case actionTypes._TYPE_COMPUTATION_OPTIONS:

                    return {

                        ...state,
                        computationStages: action.payload,
                    };

                default:
                    return state;
            }

        case actionTypes.COMPUTATION_START:

            return {

                ...state,
                currentStage: commonTypes.COMPUTATION_STAGE_START,
                stagesQueue: state.computationStages,
            };

        case actionTypes.COMPUTATION_CONSUME_STAGE:

            return {

                ...state,
                currentStage: commonTypes.COMPUTATION_STAGE_IDLE,
                stagesQueue: state.stagesQueue.filter(item => item !== action.payload),
            };

        case actionTypes.COMPUTATION_SET_STAGE:

            return {

                ...state,
                currentStage: action.payload,
            };

        case actionTypes.COMPUTATION_IN_PROGRESS:

            return {

                ...state,
                inProgress: action.payload,
            };

        case actionTypes.COMPUTATION_ERRORED:

            return {

                ...state,
                error: action.error,
            };

        case actionTypes.COMPUTATION_VALIDATION_RECEIVED:

            return {

                ...state,
                uuid: action.uuid,
            };

        case actionTypes.COMPUTATION_VALIDATION_FAILED:

            return {

                ...state,
                error: action.error,
            };

        case actionTypes.COMPUTATION_ANALYSIS_RECEIVED:

            return {

                ...state,
                analysis: action.payload,
                uuid: action.uuid,
            };

        case actionTypes.COMPUTATION_ANALYSIS_FAILED:

            return {

                ...state,
                error: action.error,
            };

        default:
            return state;
    }
};