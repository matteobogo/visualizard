const logger = require('../config/winston');

const config = require('../config/config');
const constants = require('../utils/constants');
const sharedConstants = require('../commons/constants');

const wsTypes = require('../commons/wsEvents');

const analysisService = require('../services/AnalysisService');

const _ = require('lodash');

exports = module.exports = (io) => {

    /* WebSocket Management */

    const socket = io.of('/ws/static');    //namespace

    socket
        .on("connection", (socket) => {

            /* Client Connections Management */
            logger.log('info', `Client connected [ID=${socket.id}]`);

            socket.on("disconnect", () => {
                logger.log('info',`Client disconnected [ID=${socket.id}`);
            });

            //analysis
            socket.on(wsTypes.COMPUTATION_REQUEST, async (request) => {

                //add visualization flag (request from client, need for better format of data)
                request['visualizationFlag'] = 'client';

                const datasetAnalysisType = sharedConstants.ANALYSIS_DATASET;
                const psptAnalysisType = sharedConstants.ANALYSIS_PSPT;

                let errMsg = `${request.type} not available`;
                let analysis = null;

                switch(request.type) {

                    case datasetAnalysisType:

                        analysis = await analysisService.getAnalysisCached(request)
                            .then(result => {

                                logger.log('info', `${datasetAnalysisType} Analysis started by [${socket.id}] completed`);
                                return result;
                            })
                            .catch(err => {

                                socket.emit(wsTypes.COMPUTATION_ERROR, {
                                    message: errMsg
                                });
                                logger.log(
                                    'error',
                                    `${datasetAnalysisType} Analysis started by [${socket.id}] failed ` +
                                    `Error: ${err.message}`);
                            });

                        break;

                    case psptAnalysisType:

                        analysis = await analysisService.getAnalysisCached(request)
                            .then(result => {

                                logger.log('info',`${psptAnalysisType} Analysis started by [${socket.id}] completed`);
                                return result;
                            })
                            .catch(err => {

                                socket.emit(wsTypes.COMPUTATION_ERROR, {
                                    message: errMsg,
                                });
                                logger.log(
                                    'error',
                                    `${psptAnalysisType} Analysis started by [${socket.id}] failed ` +
                                    `Error: ${err.message}`);
                            });

                        break;

                    default:
                        errMsg = `${request.type} not supported`;
                        socket.emit(wsTypes.COMPUTATION_ERROR, {
                            message: errMsg,
                        });
                        break;
                }

                if (analysis) {

                    const response = {
                        data: analysis,
                        type: request.type,
                        uuid: request.uuid
                    };

                    socket.emit(wsTypes.COMPUTATION_SUCCESS, response);
                }
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
};

