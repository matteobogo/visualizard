const config = require('../config/config');
const mongoose = require('mongoose');

exports.moongoseConfig = () => {

    const mongodbURL = `mongodb://${config.MONGO.db_host}/${config.MONGO.db_name}`;
    mongoose.connect(mongodbURL)
        .then(() => {
            console.log(`${mongodbURL} connected`);
        })
        .catch((err) => {
            console.log(`Failed to connect: ${err.message}`);
        });
    mongoose.set('debug', true);

    /* Moongose - Schema registration */
    require('../models/DatasetAnalysis');
    require('../models/PointsStatsPerTimestamp')
};