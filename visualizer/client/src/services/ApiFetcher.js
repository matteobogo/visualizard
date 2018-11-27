import * as config from '../config/config';
import * as localConstants from '../utils/constants';

const _URL_DATABASES         = '/influx/databases';
const _URL_POLICIES          = (req) => `/influx/policies?dbname=${req[localConstants._TYPE_SELECTED_DATABASE]}`;
const _URL_FIELDS            = (req) => `/influx/fields?dbname=${req[localConstants._TYPE_SELECTED_DATABASE]}`;
//TODO URL periods
const _URL_HEATMAP_TYPES     = `/heatmaps/types`;
const _URL_ZSCORES           = `/heatmaps/z-scores`;
const _URL_PALETTES          = `/heatmaps/palettes`;

const _URL_STATISTICS = `/analysis/statistics`;

const _URL_HEATMAP_ZOOMS = (req) =>
    `/heatmaps/zooms?database=${req[localConstants._TYPE_SELECTED_DATABASE]}` +
    `&policy=${req[localConstants._TYPE_SELECTED_POLICY]}`;

const _URL_HEATMAP_BOUNDS = (req) =>
    `/heatmaps/bounds?` +
    `database=${req[localConstants._TYPE_SELECTED_DATABASE]}&` +
    `policy=${req[localConstants._TYPE_SELECTED_POLICY]}&` +
    `field=${req[localConstants._TYPE_SELECTED_FIELD]}&` +
    `heatMapType=${req[localConstants._TYPE_SELECTED_HEATMAP_TYPE]}&` +
    `period=${req[localConstants._TYPE_SELECTED_PERIOD]}&` +
    `zScore=${req[localConstants._TYPE_SELECTED_ZSCORE]}&` +
    `palette=${req[localConstants._TYPE_SELECTED_PALETTE]}`;

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

export const fetchData = ({itemType, args = {}, format = {}}) => {

    let _URL;
    switch (itemType) {

        case localConstants._TYPE_DATABASES:
            _URL = _URL_DATABASES;
            break;

        case localConstants._TYPE_POLICIES:
            _URL = _URL_POLICIES(args);
            break;

        case localConstants._TYPE_HEATMAP_TYPES:
            _URL = _URL_HEATMAP_TYPES;
            break;

        case localConstants._TYPE_FIELDS:
            _URL = _URL_FIELDS(args);
            break;

        case localConstants._TYPE_ZSCORES:
            _URL = _URL_ZSCORES;
            break;

        case localConstants._TYPE_PALETTES:
            _URL = _URL_PALETTES;
            break;

        case localConstants._TYPE_HEATMAP_BOUNDS:
            _URL = _URL_HEATMAP_BOUNDS(args);
            break;

        case localConstants._TYPE_HEATMAP_ZOOMS:
            _URL = _URL_HEATMAP_ZOOMS(args);
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
