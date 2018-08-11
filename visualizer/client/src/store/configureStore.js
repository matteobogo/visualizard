import { config } from '../config/config';

if (config.APP.mode === 'development') {
    module.exports = require('./configureStore.prod');
}

else if (config.APP.mode === 'production') {

    module.exports = require('./configureStore.dev');
}