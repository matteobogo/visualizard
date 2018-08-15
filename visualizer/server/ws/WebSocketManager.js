const wsTypes = require('../../commons/WebSocketsEvents');
const heatMapService = require('../services/HeatMaps');
const uuidv4 = require('uuid/v4');

exports = module.exports = (io) => {

    const clientsMap = new Map();
    const clientData = {
        uuid: null,
        heatMapRequest: null,
        heatMapAnalysis: null,
        isProcessing: false,
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

    /* WebSocket Management */

    const socket = io.of('/ws/heatmap');    //namespace

    socket
        .on("connection", (socket) => {

            /* Client Connections Management */
            console.info(`Client connected [ID=${socket.id}]`);
            clientsMap.set(socket, clientData);

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

                clientData.isProcessing = true;
                clientsMap.set(socket, clientData);

                console.log(
                    '\n------------------------------\n' +
                    'Received a computation request\n' +
                    '------------------------------\n' +
                    `CLIENT_ID: ${socket.id}       \n` +
                    '------------------------------\n' +
                    'HeatMap Configuration:        \n');

                console.log(`${JSON.stringify(request)}`);
                console.log('------------------------------\n');

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
                    .then(validated => {

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

                let userData = clientsMap.get(socket);

                //check uuid (assigned during validation)
                if (!checkUUID(uuid, userData.uuid, socket, wsTypes.HEATMAP_ANALYSIS_START)) return;

                //check request processing in progress
                if (userData.isProcessing) {
                    handleInProgressProcessing(socket, wsTypes.HEATMAP_ANALYSIS_START);
                    return;
                }
                else {
                    userData.isProcessing = true;
                    clientsMap.set(socket, userData);
                }

                //analysis
                heatMapService
                    .heatMapAnalysis({
                        database: userData.heatMapRequest.database,
                        policy: userData.heatMapRequest.policy,
                        startInterval: userData.heatMapRequest.startInterval,
                        endInterval: userData.heatMapRequest.endInterval,
                        fields: userData.heatMapRequest.fields,
                        nMeasurements: userData.heatMapRequest.nMeasurements,
                        period: userData.heatMapRequest.period,
                        palette: userData.heatMapRequest.palette,
                    })
                    .then(analysis => {

                        //save analysis
                        userData.heatMapAnalysis = analysis;

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
                        userData.isProcessing = false;
                        clientsMap.set(socket, userData);
                    });
            });

            //construction
            socket.on(wsTypes.HEATMAP_CONSTRUCTION_START, (uuid) => {

            });
    });
};



















