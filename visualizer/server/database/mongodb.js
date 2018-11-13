const config = require('../config/config');
const mongoose = require('mongoose');

exports.moongoseConfig = () => {

    const options = {
        useNewUrlParser: true,
    };

    let uri = `mongodb://`;

    if (config.MONGO.db_authentication) {

        uri = uri +
            `${config.MONGO.db_user}:` +
            `${config.MONGO.db_password}@`;
    }

    uri = uri +
        `${config.MONGO.db_host}:` +
        `${config.MONGO.db_port}/` +
        `${config.MONGO.db_name}`;

    mongoose.connect(uri, options)
        .then(() => {
            console.log(`${uri} connected`);
        })
        .catch((err) => {
            console.log(`Failed to connect: ${err.message}`);
        });
    //mongoose.set('debug', true);

    //using promises instead of callbacks
    mongoose.Promise = Promise;

    /* Moongose - Schema registration */
    require('../models/DatasetAnalysis');
    require('../models/MeasurementsStats');
    require('../models/PointsStatsPerTimestamp');
    require('../models/Configurations');
};