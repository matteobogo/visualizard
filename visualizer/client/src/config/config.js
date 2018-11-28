export const config = {

    MODE:                       process.env.MODE                        || "development",

    API_PROTOCOL:               process.env.API_PROTOCOL                || "http",
    API_HOSTNAME:               process.env.API_HOSTNAME                || "localhost",
    API_PORT:                   process.env.API_PORT                    || 3000,
    API_ENDPOINT:               process.env.API_ENDPOINT                || "/api",
    IMAGE_ENDPOINT:             process.env.IMAGE_ENDPOINT              || "/images/TILES",
    FAKE_TILE_ENDPOINT:         process.env.FAKE_TILE_ENDPOINT          || "/images/faketile.png",

    WS_ENABLE_RECONNECTION:     process.env.WS_ENABLE_RECONNECTION      || true,
    WS_RECONNECTION_ATTEMPTS:   process.env.WS_CONNECTION_ATTEMPTS      || 10,
    WS_RECONNECTION_DELAY:      process.env.WS_RECONNECTION_DELAY       || 4000,
    WS_RECONNECTION_MAX_DELAY:  process.env.WS_RECONNECTION_MAX_DELAY   || 25000,

    TILE_SIZE:                  process.env.TILE_SIZE                   || 256,
};

export const API_URL = config.API_PROTOCOL + '://' + config.API_HOSTNAME + ':' + config.API_PORT + config.API_ENDPOINT;
export const TILES_URL = `${config.API_PROTOCOL}://${config.API_HOSTNAME}:${config.API_PORT }${config.IMAGE_ENDPOINT}`;
export const FAKE_TILE_URL = `${config.API_PROTOCOL}://${config.API_HOSTNAME}:${config.API_PORT }${config.FAKE_TILE_ENDPOINT}`;