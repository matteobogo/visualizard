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