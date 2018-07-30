const API_PROTOCOL = process.env.API_PROTOCOL || "http"
,     API_HOSTNAME = process.env.API_HOSTNAME || "localhost"
,     API_PORT = process.env.API_PORT || 3000
,     API_ENDPOINT = process.env.API_ENDPOINT || "/api";

export const config = {
    API_URL: API_PROTOCOL + '://' + API_HOSTNAME + ':' + API_PORT + API_ENDPOINT
};