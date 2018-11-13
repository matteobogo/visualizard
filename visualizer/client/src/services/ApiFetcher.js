import * as config from '../config/config';
import * as localConstants from '../utils/constants';

const _URL_DATABASES         = '/influx/databases';
const _URL_POLICIES          = (database) => `/influx/policies?dbname=${database}`;
const _URL_FIELDS            = (database) => `/influx/fields?dbname=${database}`;
const _URL_PERIODS           = '/influx/periods';
const _URL_FIRST_INTERVAL    = (database, policy, field) =>
    `/influx/firstInterval?dbname=${database}&policy=${policy}&field=${field}`;
const _URL_LAST_INTERVAL     = (database, policy, field) =>
    `/influx/lastInterval?dbname=${database}&policy=${policy}&field=${field}`;

const _URL_STATISTICS = `/analysis/statistics`;
const _URL_HEATMAP_TYPES = `/heatmaps/types`;
const _URL_HEATMAP_ZOOMS = (database, policy) =>
    `/heatmaps/zooms?database=${database}&policy=${policy}`;

const _URL_N_MEASUREMENTS = (database) => `/influx/measurements/number?dbname=${database}`;

const _URL_TIMESERIE_DATA = (req) =>
    `/timeseries/` +
    `${req[localConstants._TYPE_SELECTED_HEATMAP_TYPE]}/` +
    `${req[localConstants._TYPE_SELECTED_TIMESERIE_INDEX]}?` +
    `database=${req[localConstants._TYPE_SELECTED_DATABASE]}&` +
    `policy=${req[localConstants._TYPE_SELECTED_POLICY]}&` +
    `startInterval=${req[localConstants._TYPE_SELECTED_START_INTERVAL]}&` +
    `endInterval=${req[localConstants._TYPE_SELECTED_END_INTERVAL]}&` +
    `fields=${req[localConstants._TYPE_SELECTED_FIELDS].toString()}`;

const _URL_ANALYSES = (req) =>
    `/analysis?` +
    `database=${req[localConstants._TYPE_SELECTED_DATABASE]}&` +
    `policy=${req[localConstants._TYPE_SELECTED_POLICY]}&` +
    `startInterval=${req[localConstants._TYPE_SELECTED_START_INTERVAL]}&` +
    `endInterval=${req[localConstants._TYPE_SELECTED_END_INTERVAL]}&` +
    `type=${req[localConstants._TYPE_SELECTED_ANALYSIS]}`;

const fetchResources = (resource_uri) => {

    return fetch(config.API_URL + resource_uri)
        .then(response => {
            if (!response.ok) throw Error(response.statusText);
            return response;
        })
        .then(response => response.json())
        .then(response => {
            if (response.success === false) throw Error(response.error);
            else return response.payload;
        });
};

export const fetchData = ({itemType, args = {}}) => {

    let _URL;
    switch (itemType) {

        case localConstants._TYPE_DATABASES:
            _URL = _URL_DATABASES;
            break;

        case localConstants._TYPE_POLICIES:
            _URL = _URL_POLICIES(args.database);
            break;

        case localConstants._TYPE_FIELDS:
            _URL = _URL_FIELDS(args.database);
            break;

        case localConstants._TYPE_FIRST_INTERVAL:
            _URL = _URL_FIRST_INTERVAL(args.database, args.policy, args.field);
            break;

        case localConstants._TYPE_LAST_INTERVAL:
            _URL = _URL_LAST_INTERVAL(args.database, args.policy, args.field);
            break;

        case localConstants._TYPE_HEATMAP_TYPES:
            _URL = _URL_HEATMAP_TYPES;
            break;

        case localConstants._TYPE_HEATMAP_ZOOMS:
            _URL = _URL_HEATMAP_ZOOMS(args.database, args.policy);
            break;

        case localConstants._TYPE_N_MEASUREMENTS:
            _URL = _URL_N_MEASUREMENTS(args.database);
            break;

        case localConstants._TYPE_STATISTICS:
            _URL = _URL_STATISTICS;
            break;

        case localConstants._TYPE_TIMESERIE_DATA:
            _URL = _URL_TIMESERIE_DATA(args);
            break;

        case localConstants._TYPE_DATASET_ANALYSIS:
            _URL = _URL_ANALYSES(args);
            break;

        case localConstants._TYPE_PSPT_ANALYSIS:
            _URL = _URL_ANALYSES(args);
            break;

        default:
            throw Error(`Failed to fetch ${itemType}`);
    }

    return fetchResources(_URL);
};
