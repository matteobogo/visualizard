import * as types from '../types/datasetInfoTypes';
import * as config from '../../config/config';
import * as apiFetcher from '../../services/visualizardApiFetcher';

export const itemsHasErrored = (bool, itemType) =>
    ({ type: types.FETCH_ITEMS_ERROR, payload: bool, itemType: itemType});

export const itemsIsLoading = (bool, itemType) =>
    ({ type: types.FETCH_ITEMS_LOADING, payload: bool, itemType: itemType });

export const itemsFetchDataSuccess = (items, itemType) =>
    ({ type: types.FETCH_ITEMS_SUCCESS, payload: items, itemType: itemType });

export const fetchItems = (itemType, database = "") => {

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
    }

    return (dispatch) => {

        dispatch(itemsIsLoading(true, itemType));

        apiFetcher.fetchResources(_URL)
            .then(data => {
                dispatch(itemsFetchDataSuccess(data, itemType))
            })
            .then(() => dispatch(itemsIsLoading(false, itemType)))
            .catch(() => dispatch(itemsHasErrored(true, itemType)));
    }
};