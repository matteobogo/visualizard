const mongoose = require('mongoose');
const Float = require('mongoose-float').loadType(mongoose, 6);  //number of decimals

const datasetAnalysisSchema = new mongoose.Schema({

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
        min_ts: {
            type: Number
        },
        max_ts: {
            type: Number
        },
        sum: {
            type: Float
        },
        mean: {
            type: Float
        },
        std: {
            type: Float
        }
    }],
},{ //options
    collection: 'DatasetsAnalysis'
});

datasetAnalysisSchema.set('toJSON', { getters: true, virtuals: false});
datasetAnalysisSchema.set('toObject', { getters: true, virtuals: false});

/* Validations */
//TODO

/* Methods */

module.exports = mongoose.model('DatasetAnalysis', datasetAnalysisSchema);