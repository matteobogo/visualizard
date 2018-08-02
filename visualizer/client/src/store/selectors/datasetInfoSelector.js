/**
 * Redux Selector
 *
 * Invoked by mapStateToProps from Components/Containers.
 * It's used to obtain data from the store and eventually to make some filtering or data manipulation
 * without change the state.
 *
 * Note: Reducers can be combined together in the Root Reducer (e.g. /reducers/index), so we need
 * to call the right sub-reducer, e.g. state.SubReducer.parameters.
 */
import * as types from '../../store/types/datasetInfoTypes';

export const getItems = (state, itemType) => {

    if (itemType === types._TYPE_DATABASE) {

        return state.datasetInfo.databases;
    }
};

export const getHasErrored = (state) => {

    return state.datasetInfo.hasErrored;
};

export const getIsLoading = (state) => {

    return state.datasetInfo.isLoading;
};