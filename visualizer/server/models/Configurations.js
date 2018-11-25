const moongose = require('mongoose');

const configurationsSchema = new moongose.Schema({

    database: {
        type: String
    },
    policy: {
        type: String
    },
    field: {
        type: String
    },
    heatMapType: {
        type: String
    },
    heatMapZooms: [{
        type: String
    }],
    bounds: {
        intervals: {
            firstInterval: {
                type: String,
            },
            lastInterval: {
                type: String,
            },
            period: {
                type: Number,
            }
        },
        timeSeriesIndexes: {
            startIndex: {
                type: Number,
            },
            endIndex: {
                type: Number,
            }
        },
        tileIdsBoundsPerZoom: [{
            zoom: { type: String },
            xIDStart: { type: Number },
            xIDEnd: { type: Number },
            yIDStart: { type: Number },
            yIDEnd: { type: Number },
        }],
    },
    startInterval: {
        type: String
    },
    endInterval: {
        type: String
    },
    period: {
        type: Number
    },
    createdAt: {
        type: Date,
        default: Date.now
    },

},{ //options
    collection: 'Configurations'
});

configurationsSchema.set('toJSON', { getters: true, virtuals: false});
configurationsSchema.set('toObject', { getters: true, virtuals: false});

//validations
//TODO

//methods
//TODO

module.exports = moongose.model('Configurations', configurationsSchema);