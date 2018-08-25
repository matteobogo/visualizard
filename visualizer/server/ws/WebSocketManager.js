const logger = require('../config/winston');

const config = require('../config/config');
const constants = require('../utils/constants');

const wsTypes = require('../../commons/WebSocketsEvents');

const heatMapService = require('../services/HeatMapsService');
const analysisService = require('../services/AnalysisService');

const uuidv4 = require('uuid/v4');
const _ = require('lodash');

exports = module.exports = (io) => {

    const clientsMap = new Map();
    const clientDataInitialStatus = { //TODO may be cached (redis?)
        uuid: null,
        request: null,
        analysis: null,
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
            socket.on(wsTypes.COMPUTATION_VALIDATION_START, (computationRequest) => {

                let clientData = clientsMap.get(socket);

                //check request processing in progress
                if (clientDataCheckers(socket, null, 'progress', wsTypes.COMPUTATION_VALIDATION_START))
                    return;

                //reset previous configurations
                clientData = clientDataInitialStatus;

                clientData.isProcessing = true;
                clientsMap.set(socket, clientData);

                requestLogger(wsTypes.COMPUTATION_VALIDATION_START, socket.id);
                console.log(`\nHeatMap Configuration:\n ${JSON.stringify(computationRequest)}`);

                //validation
                heatMapService
                    .heatMapConfigurationValidation(computationRequest)
                    .then(() => {

                        let uuid = uuidv4();

                        clientData.uuid = uuid;
                        clientData.request = computationRequest;
                        clientsMap.set(socket, clientData);

                        socket.emit(wsTypes.COMPUTATION_VALIDATION_SUCCESS, uuid);
                        console.log(`HeatMap request fetched by [${socket.id}] validated\n UUID assigned [${uuid}]`);
                    })
                    .catch(error => {

                        socket.emit(wsTypes.COMPUTATION_VALIDATION_FAIL, error.message);
                        console.log(`HeatMap request fetched by [${socket.id}] not valid\n ${error.message}`);
                    })
                    .then(() => {  //finally in ES6 proposal
                        clientData.isProcessing = false;
                        clientsMap.set(socket, clientData);
                    });
            });

            //analysis
            socket.on(wsTypes.COMPUTATION_ANALYSIS_START, async (uuid) => {

                let clientData = clientsMap.get(socket);

                //check request processing in progress
                if (clientDataCheckers(socket, null, 'progress', wsTypes.COMPUTATION_ANALYSIS_START))
                    return;

                //check uuid (assigned during validation)
                if (clientDataCheckers(socket, uuid, 'uuid', wsTypes.COMPUTATION_ANALYSIS_START))
                    return;

                clientData.isProcessing = true;
                clientsMap.set(socket, clientData);

                requestLogger(wsTypes.COMPUTATION_ANALYSIS_START, socket.id, uuid);

                //analysis
                const datasetAnalysisType = constants.ANALYSIS.TYPES.DATASET;
                const psptAnalysisType = constants.ANALYSIS.TYPES.POINTS_PER_TIMESTAMP;

                let request = {
                        database: clientData.request.database,
                        policy: clientData.request.policy,
                        startInterval: clientData.request.startInterval,
                        endInterval: clientData.request.endInterval,
                        analysisType: datasetAnalysisType,
                        visualizationFlag: 'client',     //better visualization for clients (changes the response)
                };

                //dataset analysis
                const datasetAnalysis = await analysisService.getAnalysisCached(request)
                    .catch(err => {

                        socket.emit(wsTypes.COMPUTATION_ANALYSIS_FAILED, error.message, uuid);
                        console.log(
                            `${datasetAnalysisType} Analysis started by [${socket.id}] of request [${uuid}] failed\n` +
                            `Error: \n` +
                            `${err.message}`);
                    })
                    .then(result => {

                        console.log(`${datasetAnalysisType} Analysis started by [${socket.id}] of request [${uuid}] completed`);
                        return result;
                    });

                //pspt analysis
                request.analysisType = psptAnalysisType;
                const psptAnalysis = await analysisService.getAnalysisCached(request)
                    .catch(err => {

                        socket.emit(wsTypes.COMPUTATION_ANALYSIS_FAILED, error.message, uuid);
                        console.log(
                            `${psptAnalysisType} Analysis started by [${socket.id}] of request [${uuid}] failed\n` +
                            `Error: \n` +
                            `${err.message}`);
                    })
                    .then(result => {

                        console.log(`${psptAnalysisType} Analysis started by [${socket.id}] of request [${uuid}] completed`);
                        return result;
                    });

                clientData.isProcessing = false;
                clientsMap.set(socket, clientData);

                if (!datasetAnalysis || !psptAnalysis) {

                    const errMsg = 'analysis not available';
                    logger.log('error', errMsg);
                    socket.emit(wsTypes.COMPUTATION_ERROR, errMsg);
                }

                const analysis = {
                    datasetAnalysis: datasetAnalysis,
                    psptAnalysis: psptAnalysis,
                };

                socket.emit(wsTypes.COMPUTATION_ANALYSIS_SUCCESS, analysis, uuid);

            });

            // //construction
            // socket.on(wsTypes.HEATMAP_CONSTRUCTION_START, (uuid) => {
            //
            //     let clientData = clientsMap.get(socket);
            //
            //     //check request processing in progress
            //     if (clientDataCheckers(socket, null, 'progress', wsTypes.HEATMAP_CONSTRUCTION_START))
            //         return;
            //
            //     //check uuid (assigned during validation)
            //     if (clientDataCheckers(socket, uuid, 'uuid', wsTypes.HEATMAP_CONSTRUCTION_START))
            //         return;
            //
            //     //check if analysis has been made
            //     if (clientDataCheckers(socket, uuid, 'analysis', wsTypes.HEATMAP_CONSTRUCTION_START))
            //         return;
            //
            //     //is there a previous heatmap?
            //     if (clientData.heatMap !== null) { //TODO cached?
            //         //TODO emit
            //         return;
            //     }
            //
            //     clientData.isProcessing = true;
            //     clientsMap.set(socket, clientData);
            //
            //     requestLogger(wsTypes.HEATMAP_DATASET_ANALYSIS_START, socket.id, uuid);
            //
            //     //construction
            //     heatMapService
            //         .heatMapConstruction({
            //             uuid: uuid,
            //             request: clientData.request,
            //             analysis: clientData.analysis,
            //         })
            //         .then(() => {
            //
            //
            //         })
            //         .catch(error => {
            //
            //
            //         })
            //         .then(() => {  //finally in ES6 proposal
            //             clientData.isProcessing = false;
            //             clientsMap.set(socket, clientData);
            //         });
            // });
    });

    const clientDataCheckers = (socket, parameter, flag, stage) => {

        const emitError = (socket, message, stage) => {

            socket.emit(wsTypes.COMPUTATION_ERROR, message, stage);
        };

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

                if (clientData.analysis === null)  {

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

