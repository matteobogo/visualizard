/**
 * Redux Selector
 *
 * Invoked by mapStateToProps from Components/Containers.
 * It's used to obtain data from the store and eventually to make some filtering or data manipulation
 * without change the state.
 *
 * Note: Reducers can be combined together in the Root Reducer (e.g. /reducers/index), so we need
 * to call the right sub-reducer, e.g. state.SubReducer.parameters.
 *
 * Redux Reselect
 *
 * Selectors can compute derived data, allowing Redux to store the minimal possible state.
 * Selectors are efficient. A selector is not recomputed unless one of its argument changes.
 * Selectors are composable. They can be used as input to other selectors.
 */

import * as types from '../../store/types/datasetInfoTypes';

export const getItems = (state, itemType) => {

    switch (itemType) {

        case types._TYPE_DATABASE:

            return state.datasetInfo.databases;

        case types._TYPE_POLICY:

            return state.datasetInfo.policies;

        case types._TYPE_FIELD:

            return state.datasetInfo.fields;

        case types._TYPE_PALETTE:

            return state.datasetInfo.palettes;
    }
};

export const getHasErrored = (state) => state.datasetInfo.hasErrored;
export const getIsLoading = (state) => state.datasetInfo.isLoading;