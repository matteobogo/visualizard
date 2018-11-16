export const config = {

    MODE:                       process.env.MODE                        || "development",

    API_PROTOCOL:               process.env.API_PROTOCOL                || "http",
    API_HOSTNAME:               process.env.API_HOSTNAME                || "localhost",
    API_PORT:                   process.env.API_PORT                    || 3000,
    API_ENDPOINT:               process.env.API_ENDPOINT                || "/api",
    IMAGE_ENDPOINT:             process.env.IMAGE_ENDPOINT              || "/images/TILES",

    WS_ENABLE_RECONNECTION:     process.env.WS_ENABLE_RECONNECTION      || true,
    WS_RECONNECTION_ATTEMPTS:   process.env.WS_CONNECTION_ATTEMPTS      || 10,
    WS_RECONNECTION_DELAY:      process.env.WS_RECONNECTION_DELAY       || 4000,
    WS_RECONNECTION_MAX_DELAY:  process.env.WS_RECONNECTION_MAX_DELAY   || 25000,

    TILE_SIZE:                  process.env.TILE_SIZE                   || 256,

    MAX_TIMESERIES:             process.env.MAX_TIMESERIES              || 5,

    COLOR_SCALE:                process.env.COLOR_SCALE                 || ['orange', 'red', 'blue'],
    INTERPOLATION_TYPE:         process.env.INTERPOLATION_TYPE          || 'lch'
};

export const API_URL = config.API_PROTOCOL + '://' + config.API_HOSTNAME + ':' + config.API_PORT + config.API_ENDPOINT;
export const TILES_URL = `${config.API_PROTOCOL}://${config.API_HOSTNAME}:${config.API_PORT }${config.IMAGE_ENDPOINT}`;