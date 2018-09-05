import * as config from '../config/config';

export const _URL_DATABASES         = '/influx/databases';
export const _URL_POLICIES          = (database) => `/influx/policies?dbname=${database}`;
export const _URL_FIELDS            = (database) => `/influx/fields?dbname=${database}`;
export const _URL_PERIODS           = '/influx/periods';
export const _URL_FIRST_INTERVAL    = (database, policy, field) =>
    `/influx/firstInterval?dbname=${database}&policy=${policy}&field=${field}`;
export const _URL_LAST_INTERVAL     = (database, policy, field) =>
    `/influx/lastInterval?dbname=${database}&policy=${policy}&field=${field}`;

export const _URL_HEATMAP_TYPES = `/heatmaps/types`;
export const _URL_PALETTES  = `/heatmaps/palettes`;

export const fetchResources = (resource_uri) => {

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
