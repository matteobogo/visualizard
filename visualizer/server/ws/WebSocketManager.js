const wsTypes = require('../../commons/WebSocketsEvents');
const heatMapService = require('../services/HeatMaps');
const uuidv4 = require('uuid/v4');

exports = module.exports = (io) => {

    const clientsMap = new Map();
    const clientDataInitialStatus = {
        uuid: null,
        heatMapRequest: null,
        heatMapAnalysis: null,
        isProcessing: false,
    };

    /* WebSocket Management */

    const socket = io.of('/ws/heatmap');    //namespace

    socket
        .on("connection", (socket) => {

            /* Client Connections Management */
            console.info(`Client connected [ID=${socket.id}]`);
            clientsMap.set(socket, clientDataInitialStatus);

            socket.on("disconnect", () => {
                clientsMap.delete(socket);
                console.info(`Client disconnected [ID=${socket.id}`);
            });

            /* HeatMap Computation */

            //initialization + validation
            socket.on(wsTypes.HEATMAP_VALIDATION_START, (request) => {

                let clientData = clientsMap.get(socket);

                //check request processing in progress
                if (checkInProgressProcessing(clientData, wsTypes.HEATMAP_VALIDATION_START))
                    return;

                //reset previous configurations
                clientData = clientDataInitialStatus;

                clientData.isProcessing = true;
                clientsMap.set(socket, clientData);

                requestLogger(wsTypes.HEATMAP_VALIDATION_START, socket.id);
                console.log(`\nHeatMap Configuration:\n ${JSON.stringify(request)}`);

                //validation
                heatMapService
                    .heatMapConfigurationValidation({
                        database: request.database,
                        policy: request.policy,
                        startInterval: request.startInterval,
                        endInterval: request.endInterval,
                        fields: request.fields,
                        nMeasurements: request.nMeasurements,
                        period: request.period,
                        palette: request.palette,
                        heatMapType: request.heatMapType,
                    })
                    .then(() => {

                        let uuid = uuidv4();

                        clientData.uuid = uuid;
                        clientData.heatMapRequest = request;
                        clientsMap.set(socket, clientData);

                        socket.emit(wsTypes.HEATMAP_VALIDATION_SUCCESS, request, uuid);
                        console.log(`HeatMap request fetched by [${socket.id}] validated\n UUID assigned [${uuid}]`);
                    })
                    .catch(error => {

                        socket.emit(wsTypes.HEATMAP_VALIDATION_FAIL, request, error.message);
                        console.log(`HeatMap request fetched by [${socket.id}] not valid\n ${error.message}`);
                    })
                    .then(() => {  //finally in ES6 proposal
                        clientData.isProcessing = false;
                        clientsMap.set(socket, clientData);
                    });
            });

            //analysis
            socket.on(wsTypes.HEATMAP_ANALYSIS_START, (uuid) => {

                let clientData = clientsMap.get(socket);

                //check request processing in progress
                if (checkInProgressProcessing(clientData, wsTypes.HEATMAP_ANALYSIS_START))
                    return;

                //check uuid (assigned during validation)
                if (!checkUUID(uuid, clientData.uuid, socket, wsTypes.HEATMAP_ANALYSIS_START))
                    return;

                clientData.isProcessing = true;
                clientsMap.set(socket, clientData);

                requestLogger(wsTypes.HEATMAP_ANALYSIS_START, socket.id, uuid);

                //analysis
                heatMapService
                    .heatMapAnalysis({
                        database: clientData.heatMapRequest.database,
                        policy: clientData.heatMapRequest.policy,
                        startInterval: clientData.heatMapRequest.startInterval,
                        endInterval: clientData.heatMapRequest.endInterval,
                        fields: clientData.heatMapRequest.fields,
                        nMeasurements: clientData.heatMapRequest.nMeasurements,
                        period: clientData.heatMapRequest.period,
                        palette: clientData.heatMapRequest.palette,
                    })
                    .then(analysis => {

                        //save analysis
                        clientData.heatMapAnalysis = analysis;

                        socket.emit(wsTypes.HEATMAP_ANALYSIS_SUCCESS, analysis);
                        console.log(`Analysis started by [${socket.id}] of request [${uuid}] completed`);
                    })
                    .catch(error => {

                        socket.emit(wsTypes.HEATMAP_ANALYSIS_FAIL, error.message);
                        console.log(
                            `Analysis started by [${socket.id}] of request [${uuid}] failed\n` +
                            `Error: \n` +
                            `${error.message}` );
                    })
                    .then(() => {  //finally in ES6 proposal
                        clientData.isProcessing = false;
                        clientsMap.set(socket, clientData);
                    });
            });

            //construction
            socket.on(wsTypes.HEATMAP_CONSTRUCTION_START, (uuid) => {

                let clientData = clientsMap.get(socket);

                //check request processing in progress
                if (checkInProgressProcessing(clientData, wsTypes.HEATMAP_CONSTRUCTION_START))
                    return;

                //check uuid (assigned during validation)
                if (!checkUUID(uuid, clientData.uuid, socket, wsTypes.HEATMAP_CONSTRUCTION_START))
                    return;

                //check if analysis has been made
                if (clientData.heatMapAnalysis == null) {

                }

                clientData.isProcessing = true;
                clientsMap.set(socket, clientData);

                requestLogger(wsTypes.HEATMAP_ANALYSIS_START, socket.id, uuid);


            });
    });
};

const checkUUID = (uuidRequest, uuidStored, socket, stage) => {

    if (uuidRequest !== uuidStored) {

        console.log(`[${socket.id}] has provided an invalid UUID during a ${stage} request`);
        socket.emit(wsTypes.HEATMAP_PROCESS_ERROR, 'UUID request mismatch');
        return false;
    }
    else return true;
};

const handleInProgressProcessing = (socket, stage) => {

    console.log(`[${socket.id}] makes a ${stage} request, but another one is in progress`);
    socket.emit(wsTypes.HEATMAP_PROCESS_ERROR, 'HeatMap request processing in progress');
};

const checkInProgressProcessing = (clientData, type) => {

    if (clientData.isProcessing) {
        handleInProgressProcessing(socket, type);
        return true;
    }
    else return false;
};

const requestLogger = (stage, clientId, uuid = 'None') => {

    console.log(
        '\n------------------------------\n' +
        `Received an ${stage} request    \n` +
        '------------------------------  \n' +
        `CLIENT_ID: ${clientId}          \n` +
        '------------------------------  \n' +
        `UUID: ${uuid}                   \n` +
        '------------------------------  \n' );
};