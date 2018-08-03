export const API_PROTOCOL   = process.env.API_PROTOCOL  || "http";
export const API_HOSTNAME   = process.env.API_HOSTNAME  || "localhost";
export const API_PORT       = process.env.API_PORT      || 3000;
export const API_ENDPOINT   = process.env.API_ENDPOINT  || "/api";

export const API_URL        = API_PROTOCOL + '://' + API_HOSTNAME + ':' + API_PORT + API_ENDPOINT;