import * as actionTypes from '../types/actionTypes';

const initialState = {

    configuration: {

        database: null,
        policy: null,
        startInterval: null,
        endInterval: null,
        field: null,
        period: null,

        options: {

            analysis: false,
            heatmap: false,
        },
    },

    analysis: {

        datasetAnalysis: null,
        psptAnalysis: null,
    },

    heatMap: {

        heatMapType: null,
        palette: null,
    },

    inProgress: false,

    error: {
        message: null,
        type: null,
    },
};

export const computation = (state = initialState, action) => {

    switch(action.type) {

        case actionTypes.SET_REQUEST_ITEM:

            switch (action.itemType) {

                case actionTypes._TYPE_DATABASES:

                    return {

                        ...state,
                        configuration: {
                            ...state.configuration,
                            database: action.payload,
                        }
                    };

                case actionTypes._TYPE_POLICIES:

                    return {

                        ...state,
                        configuration: {
                            ...state.configuration,
                            policy: action.payload,
                        }
                    };

                case actionTypes._TYPE_FIELDS:

                    return {

                        ...state,
                        configuration: {
                            ...state.configuration,
                            field: action.payload,
                        }
                    };

                case actionTypes._TYPE_PERIOD:

                    return {

                        ...state,
                        configuration: {
                            ...state.configuration,
                            period: action.payload,
                        }
                    };

                case actionTypes._TYPE_HEATMAP_TYPES:

                    return {

                        ...state,
                        heatMap: {
                            ...state.heatMap,
                            heatMapType: action.payload,
                        }
                    };

                case actionTypes._TYPE_PALETTE:

                    return {

                        ...state,
                        heatMap: {
                            ...state.heatMap,
                            palette: action.payload,
                        }
                    };

                case actionTypes._TYPE_SELECTED_START_INTERVAL:

                    return {

                        ...state,
                        configuration: {
                            ...state.configuration,
                            startInterval: action.payload,
                        }
                    };

                case actionTypes._TYPE_SELECTED_END_INTERVAL:

                    return {

                        ...state,
                        configuration: {
                            ...state.configuration,
                            endInterval: action.payload,
                        }
                    };

                case actionTypes._TYPE_OPTION_ANALYSIS:

                    return {

                        ...state,
                        configuration: {
                            ...state.configuration,
                            options: {
                                ...state.configuration.options,
                                analysis: action.payload,
                            }
                        }
                    };

                case actionTypes._TYPE_OPTION_HEATMAP:

                    return {

                        ...state,
                        configuration: {
                            ...state.configuration,
                            options: {
                                ...state.configuration.options,
                                heatmap: action.payload,
                            }
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

        case actionTypes.COMPUTATION_SUCCESS:

            switch(action.computationType) {

                case actionTypes._TYPE_COMPUTATION_ANALYSIS_DATASET:

                    return {

                        ...state,
                        analysis: {
                            ...state.analysis,
                            datasetAnalysis: action.payload,
                        }
                    };

                case actionTypes._TYPE_COMPUTATION_ANALYSIS_PSPT:

                    return {

                        ...state,
                        analysis: {
                            ...state.analysis,
                            psptAnalysis: action.payload,
                        }
                    };

                default:
                    return state;
            }

        case actionTypes.COMPUTATION_IN_PROGRESS:

            return {

                ...state,
                inProgress: action.payload,
            };

        case actionTypes.COMPUTATION_ERRORED:

            return {

                ...state,
                error: {
                    ...state.error,
                    message: action.error,
                    type: action.errorType,
                }

            };

        default:
            return state;
    }
};