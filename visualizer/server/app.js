require('./config/config');
require('./utils/global_functions');

console.log("Environment: ", CONFIG.app);

const express       = require('express')
    , logger        = require('morgan')
    , bodyParser    = require('body-parser')
    , path          = require('path');

const v1 = require('./routes/routes');

const app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

/** CORS Filter */
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, content-type, Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();  //next layer of middleware
});

/** Routes */
app.use('/api', v1);

/** Home */
app.use('/', function(req, res) {
    res.statusCode = 200;
    res.json({status:"success", message:"Visualizard API", data:{}})
});

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