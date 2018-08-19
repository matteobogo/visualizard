const wsTypes = require('../../commons/WebSocketsEvents');
const heatMapService = require('../services/HeatMapsService');
const datasetAnalysisService = require('../services/DatasetAnalysisService');
const uuidv4 = require('uuid/v4');
const _ = require('lodash');

exports = module.exports = (io) => {

    const clientsMap = new Map();
    const clientDataInitialStatus = { //TODO may be cached (redis?)
        uuid: null,
        heatMapRequest: null,
        heatMapAnalysis: null,
        heatMap: null,
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
            socket.on(wsTypes.HEATMAP_VALIDATION_START, (heatMapRequest) => {

                let clientData = clientsMap.get(socket);

                //check request processing in progress
                if (clientDataCheckers(socket, null, 'progress', wsTypes.HEATMAP_VALIDATION_START))
                    return;

                //is there a previous request? is the same?
                if (clientData.uuid != null && clientData.heatMapRequest !== null) { //TODO cached?
                    if (_.isEqual(heatMapRequest, clientData.heatMapRequest)) { //obj equality with lodash
                        socket.emit(wsTypes.HEATMAP_VALIDATION_SUCCESS, heatMapRequest, clientData.uuid);
                        return;
                    }
                }

                //reset previous configurations
                clientData = clientDataInitialStatus;

                clientData.isProcessing = true;
                clientsMap.set(socket, clientData);

                requestLogger(wsTypes.HEATMAP_VALIDATION_START, socket.id);
                console.log(`\nHeatMap Configuration:\n ${JSON.stringify(heatMapRequest)}`);

                //validation
                heatMapService
                    .heatMapConfigurationValidation({
                        heatMapRequest: heatMapRequest,
                    })
                    .then(() => {

                        let uuid = uuidv4();

                        clientData.uuid = uuid;
                        clientData.heatMapRequest = heatMapRequest;
                        clientsMap.set(socket, clientData);

                        socket.emit(wsTypes.HEATMAP_VALIDATION_SUCCESS, heatMapRequest, uuid);
                        console.log(`HeatMap request fetched by [${socket.id}] validated\n UUID assigned [${uuid}]`);
                    })
                    .catch(error => {

                        socket.emit(wsTypes.HEATMAP_VALIDATION_FAIL, heatMapRequest, error.message);
                        console.log(`HeatMap request fetched by [${socket.id}] not valid\n ${error.message}`);
                    })
                    .then(() => {  //finally in ES6 proposal
                        clientData.isProcessing = false;
                        clientsMap.set(socket, clientData);
                    });
            });

            //analysis
            socket.on(wsTypes.HEATMAP_ANALYSIS_START, async (uuid) => {

                let clientData = clientsMap.get(socket);

                //check request processing in progress
                if (clientDataCheckers(socket, null, 'progress', wsTypes.HEATMAP_ANALYSIS_START))
                    return;

                //check uuid (assigned during validation)
                if (clientDataCheckers(socket, uuid, 'uuid', wsTypes.HEATMAP_ANALYSIS_START))
                    return;

                //is there a previous analysis?
                if (clientData.heatMapAnalysis !== null) { //TODO cached?
                    socket.emit(wsTypes.HEATMAP_ANALYSIS_SUCCESS, clientData.heatMapAnalysis);
                    return;
                }

                clientData.isProcessing = true;
                clientsMap.set(socket, clientData);

                requestLogger(wsTypes.HEATMAP_ANALYSIS_START, socket.id, uuid);

                //dataset analysis
                const datasetAnalysis = datasetAnalysisService._ANALYSIS_TYPES.DATASET_ANALYSIS;
                datasetAnalysisService
                    .getAnalysisCached(
                        {
                            database: clientData.heatMapRequest.database,
                            policy: clientData.heatMapRequest.policy,
                            startInterval: clientData.heatMapRequest.startInterval,
                            endInterval: clientData.heatMapRequest.endInterval,
                            analysisType: datasetAnalysis,
                        },
                        (error, analysis) => { //error first callback pattern
                            if (error) {

                                socket.emit(wsTypes.HEATMAP_ANALYSIS_FAIL, error.message);
                                console.log(
                                    `${datasetAnalysis} Analysis started by [${socket.id}] of request [${uuid}] failed\n` +
                                    `Error: \n` +
                                    `${error.message}` );
                            }
                            else {

                                //save analysis
                                clientData.heatMapAnalysis = analysis;

                                socket.emit(wsTypes.HEATMAP_ANALYSIS_SUCCESS, analysis);
                                console.log(`${datasetAnalysis} Analysis started by [${socket.id}] of request [${uuid}] completed`);
                            }

                            clientData.isProcessing = false;
                            clientsMap.set(socket, clientData);
                        }
                    );

                //points stats per timestamp analysis
                const psptAnalysis = datasetAnalysisService._ANALYSIS_TYPES.POINTS_STATS_PER_TIMESTAMP_ANALYSIS;
                datasetAnalysisService
                    .getAnalysisCached(
                        {
                            database: clientData.heatMapRequest.database,
                            policy: clientData.heatMapRequest.policy,
                            startInterval: clientData.heatMapRequest.startInterval,
                            endInterval: clientData.heatMapRequest.endInterval,
                            analysisType: psptAnalysis,
                        },
                        (error, analysis) => { //error first callback pattern
                            if (error) {

                                socket.emit(wsTypes.HEATMAP_ANALYSIS_FAIL, error.message);
                                console.log(
                                    `${psptAnalysis} Analysis started by [${socket.id}] of request [${uuid}] failed\n` +
                                    `Error: \n` +
                                    `${error.message}` );
                            }
                            else {

                                //save analysis
                                clientData.heatMapAnalysis = analysis;

                                socket.emit(wsTypes.HEATMAP_ANALYSIS_SUCCESS, analysis);
                                console.log(`${psptAnalysis} Analysis started by [${socket.id}] of request [${uuid}] completed`);
                            }

                            clientData.isProcessing = false;
                            clientsMap.set(socket, clientData);
                        }
                    );
            });

            //construction
            socket.on(wsTypes.HEATMAP_CONSTRUCTION_START, (uuid) => {

                let clientData = clientsMap.get(socket);

                //check request processing in progress
                if (clientDataCheckers(socket, null, 'progress', wsTypes.HEATMAP_CONSTRUCTION_START))
                    return;

                //check uuid (assigned during validation)
                if (clientDataCheckers(socket, uuid, 'uuid', wsTypes.HEATMAP_CONSTRUCTION_START))
                    return;

                //check if analysis has been made
                if (clientDataCheckers(socket, uuid, 'analysis', wsTypes.HEATMAP_CONSTRUCTION_START))
                    return;

                //is there a previous heatmap?
                if (clientData.heatMap !== null) { //TODO cached?
                    //TODO emit
                    return;
                }

                clientData.isProcessing = true;
                clientsMap.set(socket, clientData);

                requestLogger(wsTypes.HEATMAP_ANALYSIS_START, socket.id, uuid);

                //construction
                heatMapService
                    .heatMapConstruction({
                        uuid: uuid,
                        heatMapRequest: clientData.heatMapRequest,
                        heatMapAnalysis: clientData.heatMapAnalysis,
                    })
                    .then(() => {


                    })
                    .catch(error => {


                    })
                    .then(() => {  //finally in ES6 proposal
                        clientData.isProcessing = false;
                        clientsMap.set(socket, clientData);
                    });
            });
    });

    const emitError = (socket, message, stage) => {

        socket.emit(wsTypes.HEATMAP_PROCESS_ERROR, message);
        console.log(`[${socket.id}] makes a ${stage} request, but another one is in progress`);
    };

    const clientDataCheckers = (socket, parameter, flag, stage) => {

        let clientData = clientsMap.get(socket);

        switch (flag) {

            case 'uuid':

                if (parameter !== clientData.uuid) {

                    emitError(socket, 'invalid uuid', stage);
                    console.log(`[${socket.id}] has provided an invalid UUID during a ${stage} request`);
                    return true;
                }
                return false;

            case 'progress':

                if (clientData.isProcessing) {

                    emitError(socket, 'request processing in progress', stage);
                    return true;
                }
                return false;

            case 'analysis':

                if (clientData.heatMapAnalysis === null)  {

                    emitError(socket, 'analysis is required', stage);
                    return true;
                }
                return false;

            default:
                break;
        }
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
};

