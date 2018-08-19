const mongoose = require('mongoose');
const Float = require('mongoose-float').loadType(mongoose, 6);  //number of decimals

const pointsStatsPerTimestamp = new mongoose.Schema({

    database: {
        type: String
    },
    policy: {
        type: String
    },
    timestamp: {
        type: Number
    },
    timeseries: {
        type: Number
    },
    fields: [{
        type: String
    }],
    fieldsStats: [{
        field: {
            type: String
        },
        min: {
            type: Float
        },
        max: {
            type: Float
        },
        sum: {
            type: Float
        },
        mean: {
            type: Float
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },

},{ //options
    collection: 'PointsStatsPerTimestamp'
});

pointsStatsPerTimestamp.set('toJSON', { getters: true, virtuals: false});
pointsStatsPerTimestamp.set('toObject', { getters: true, virtuals: false});

module.exports = mongoose.model('PointsStatsPerTimestamp', pointsStatsPerTimestamp);