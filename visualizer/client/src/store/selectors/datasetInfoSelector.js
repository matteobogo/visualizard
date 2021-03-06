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

import * as types from '../types/actionTypes';

export const getItems = (state, itemType) => {

    switch (itemType) {

        case types._TYPE_DATABASES:

            return state.datasetInfo.databases;

        case types._TYPE_POLICIES:

            return state.datasetInfo.policies;

        case types._TYPE_FIELDS:

            return state.datasetInfo.fields;

        case types._TYPE_PERIOD:

            return state.datasetInfo.periods;

        case types._TYPE_HEATMAP_TYPES:

            return state.datasetInfo.heatMapTypes;

        case types._TYPE_PALETTE:

            return state.datasetInfo.palettes;

        case types._TYPE_FIRST_INTERVAL:

            return state.datasetInfo.firstInterval;

        case types._TYPE_LAST_INTERVAL:

            return state.datasetInfo.lastInterval;
    }
};

export const getHasErrored = (state) => state.datasetInfo.hasErrored;
export const getIsLoading = (state) => state.datasetInfo.isLoading;