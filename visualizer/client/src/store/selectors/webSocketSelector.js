export const getConnectionStatus = (state) => state.websocket.connected;

export const getRequestsQueue = (state) => state.websocket.requests;

export const getResponsesByUUID = (state, uuid) =>
    Object.keys(state.websocket.responses).includes(uuid) ? state.websocket.responses[uuid] : null;