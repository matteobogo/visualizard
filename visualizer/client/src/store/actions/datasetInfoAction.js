import * as types from '../types/actionTypes';
import * as config from '../../config/config';
import * as apiFetcher from '../../services/visualizardApiFetcher';

export const itemsHasErrored = (error, itemType) =>
    ({ type: types.FETCH_ITEMS_ERROR, payload: error, itemType: itemType});

export const itemsIsLoading = (bool, itemType) =>
    ({ type: types.FETCH_ITEMS_LOADING, payload: bool, itemType: itemType });

export const itemsFetchDataSuccess = (items, itemType) =>
    ({ type: types.FETCH_ITEMS_SUCCESS, payload: items, itemType: itemType });

export const resetItems = () =>
    ({ type: types.FETCH_ITEMS_RESET });

export const fetchItems = (itemType, database = "", policy = "", field = "") => {

    let _URL;
    switch (itemType) {

        case types._TYPE_DATABASE:
            _URL = apiFetcher._URL_DATABASES;
            break;

        case types._TYPE_POLICY:
            _URL = apiFetcher._URL_POLICIES(database);
            break;

        case types._TYPE_FIELD:
            _URL = apiFetcher._URL_FIELDS(database);
            break;

        case types._TYPE_PALETTE:
            _URL = apiFetcher._URL_PALETTES;
            break;

        case types._TYPE_PERIOD:
            _URL = apiFetcher._URL_PERIODS;
            break;

        case types._TYPE_FIRST_INTERVAL:
            _URL = apiFetcher._URL_FIRST_INTERVAL(database, policy, field);
            break;

        case types._TYPE_LAST_INTERVAL:
            _URL = apiFetcher._URL_LAST_INTERVAL(database, policy, field);
            break;
    }

    return (dispatch) => {

        dispatch(itemsIsLoading(true, itemType));

        apiFetcher.fetchResources(_URL)
            .then(data => {
                dispatch(itemsFetchDataSuccess(data, itemType))
            })
            .then(() => dispatch(itemsIsLoading(false, itemType)))
            .catch((err) => dispatch(itemsHasErrored(err.message, itemType)));
    }
};

export const resetDatasetItems = () => {

    return (dispatch) => {
        dispatch(resetItems());
    }
};