const mongoose = require('mongoose');
const Float = require('mongoose-float').loadType(mongoose, 6);  //number of decimals

const measurementsStatsAnalysisSchema = new mongoose.Schema({

    database: {
        type: String
    },
    policy: {
        type: String
    },
    startInterval: {
        type: Number
    },
    endInterval: {
        type: Number
    },
    period: {
        type: Number
    },
    intervals: {
        type: Number
    },
    fields: [{
        type: String
    }],
    measurement: {
        type: String
    },
    fieldsStats: [{
        field: {
            type: String
        },
        fieldIndex: {
            type: Number
        },
        min: {
            type: Float
        },
        max: {
            type: Float
        },
        min_ts: {
            type: Number
        },
        max_ts: {
            type: Number
        },
        sum: {
            type: Float
        },
        population: {
            type: Number
        },
        mean: {
            type: Float
        },
        std: {
            type: Float
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
},{ //options
    collection: 'MeasurementsStats'
});

measurementsStatsAnalysisSchema.set('toJSON', { getters: true, virtuals: false});
measurementsStatsAnalysisSchema.set('toObject', { getters: true, virtuals: false});

/* Validations */
//TODO

/* Methods */

module.exports = mongoose.model('MeasurementsStatsAnalysis', measurementsStatsAnalysisSchema);