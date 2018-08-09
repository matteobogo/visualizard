const express = require('express');
const router = express.Router();

module.exports = (io) => {

    const clientsMap = new Map();
    const customNamespace = io.of('/ws');

    //client connected
    io.on("connection", (socket) => {

        console.info(`Client connected [ID=${socket.id}]`);
        clientsMap.set(socket, 1);

        //client disconnected
        socket.on("disconnect", () => {
            clientsMap.delete(socket);
            console.info(`Client disconnected [ID=${socket.id}`);
        });

        socket.on('test', (data) => {
            console.log(data);
        });

        //heatmap computation
        // socket.on(
        //     "test",
        //     (data) => {
        //
        //         io.emit('test', data);

                // console.log(`HeatMap computation requested by ${socket.id}\n
                //              --- parameters ---
                //              Type:     ${data.type}\n
                //              Database: ${data.dbname}\n
                //              Policy:   ${data.policy}\n
                //              Start:    ${data.start_interval}\n
                //              End:      ${data.end_interval}\n
                //              Field:    ${data.field}\n
                //              Machines: ${data.n_measuraments}\n
                //              Period:   ${data.period}\n`);

                //test


        // });
    });
    return router;
};