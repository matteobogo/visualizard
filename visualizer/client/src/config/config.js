export const config = {

    MODE:               process.env.MODE                || "development",

    API_PROTOCOL:       process.env.API_PROTOCOL        || "http",
    API_HOSTNAME:       process.env.API_HOSTNAME        || "localhost",
    API_PORT:           process.env.API_PORT            || 3000,
    API_ENDPOINT:       process.env.API_ENDPOINT        || "/api",
    IMAGE_ENDPOINT:     process.env.IMAGE_ENDPOINT      || "/images/TILES",

    TILE_SIZE:          process.env.TILE_SIZE     || 256
};

export const API_URL = config.API_PROTOCOL + '://' + config.API_HOSTNAME + ':' + config.API_PORT + config.API_ENDPOINT;
export const TILES_URL = `${config.API_PROTOCOL}://${config.API_HOSTNAME}:${config.API_PORT }${config.IMAGE_ENDPOINT}`;