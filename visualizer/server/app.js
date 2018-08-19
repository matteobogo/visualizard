const config = require('./config/config');
require('./utils/global_functions');

console.log("Environment: ", config.APP.mode);

const express           = require('express')
    , bodyParser        = require('body-parser')
    , path              = require('path')
    , socketIo          = require('socket.io');

/* MongoDB - Moongose */
const mongoose = require('mongoose');
if (config.APP.mode === 'development') {

    const mongodbURL = `mongodb://${config.MONGO.db_host}/${config.MONGO.db_name}`;
    mongoose.connect(mongodbURL)
        .then(() => {
            console.log(`${mongodbURL} connected`);
        })
        .catch((err) => {
            console.log(`Failed to connect: ${err.message}`);
        });
    mongoose.set('debug', true);
}

/* Moongose - Schema registration */
require('./models/DatasetAnalysis');
require('./models/PointsStatsPerTimestamp');

const app = express();

/* Winston - Logging */
const winston = require('./config/winston');
const morgan = require('morgan');

app.use(morgan('combined', { stream: winston.stream }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

/* CORS Filter */
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, content-type, Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();  //next layer of middleware
});

/* WebSockets - Socket.io */
let io = socketIo();
app.io = io;

/** Routes - classic */
const api = require('./routes/routes');
app.use('/api', api);

/** WebSockets */
const webSocketEvents = require('./ws/WebSocketManager')(io);

// /** Home */
// app.use('/', function(req, res) {
//     res.statusCode = 200;
//     res.json({status:"success", message:"Visualizard API", data:{}})
// });

/** Handling Errors */
app.use(function(req, res, next) {
    let err = new Error('Not found');
    err.status = 404;
    next(err);  //forward to error handler
});

/** Error Handler */
app.use(function(err, req, res, next) {
    res.locals.message = err.message;   //only providing error in dev
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    /** Rendering the error page */
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;