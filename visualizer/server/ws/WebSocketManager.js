const wsTypes = require('../../commons/WebSocketsEvents');
const heatMapService = require('../services/HeatMaps');

exports = module.exports = (io) => {

    const clientsMap = new Map();

    const socket = io.of('/ws/heatmap');    //namespace

    socket
        .on("connection", (socket) => {

            /* Client Connections Management */
            console.info(`Client connected [ID=${socket.id}]`);
            clientsMap.set(socket, 1);

            socket.on("disconnect", () => {
                clientsMap.delete(socket);
                console.info(`Client disconnected [ID=${socket.id}`);
            });

            /* HeatMap Computation */

            //initialization + validation
            socket.on(wsTypes.HEATMAP_VALIDATION_START, (request) => {

                console.log(
                    '------------------------------\n' +
                    'Received a computation request\n' +
                    '------------------------------\n' +
                    `CLIENT_ID: ${socket.id}       \n` +
                    '------------------------------\n' +
                    'HeatMap Configuration:        \n');

                console.log(`${JSON.stringify(request)}`);
                console.log('------------------------------\n');

                //console.log(typeof request);

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

                        socket.emit(wsTypes.HEATMAP_VALIDATION_SUCCESS, request, validated);
                    })
                    .catch(error => {

                        socket.emit(wsTypes.HEATMAP_VALIDATION_FAIL, request, error.message);
                    });
            });

            //start processing
            socket.on(wsTypes.HEATMAP_ANALYSIS_START, (request) => {

                console.log(
                    '------------------------------\n' +
                    'Analysis Start                \n' +
                    '------------------------------\n' +
                    `CLIENT_ID: ${socket.id}       \n` +
                    '------------------------------\n' +
                    'HeatMap Configuration:        \n');

                console.log(`${JSON.stringify(request)}`);
                console.log('------------------------------\n');

                //analysis
                heatMapService
                    .heatMapAnalysis({
                        database: request.database,
                        policy: request.policy,
                        startInterval: request.startInterval,
                        endInterval: request.endInterval,
                        fields: request.fields,
                        nMeasurements: request.nMeasurements,
                        period: request.period,
                        palette: request.palette,
                    })
                    .then(analysis => {

                        socket.emit(wsTypes.HEATMAP_ANALYSIS_SUCCESS, analysis);
                    })
                    .catch(error => {

                        console.log(
                            `Analysis started by [CLIENT_ID]: ${socket.id} failed\n` +
                            `Error: \n` +
                            `${error.message}` );

                        socket.emit(wsTypes.HEATMAP_ANALYSIS_FAIL, error.message);
                    })
            });
    });
};



















