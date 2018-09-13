import React from 'react';
import ReactDOM from 'react-dom';

import App from './app';

import { createStore, applyMiddleware } from 'redux';
import { createLogger } from 'redux-logger'
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import rootReducer from './store/reducers'

//localization with Moment
//required for react-widgets DateTimePicker
import Moment from 'moment'
import momentLocalizer from 'react-widgets-moment';
Moment.locale('en');
momentLocalizer();

const loggerMiddleware = createLogger();
const store = createStore(
    rootReducer,
    applyMiddleware(
        thunk,
        loggerMiddleware
    ));

ReactDOM.render(
    <Provider store={store}>
        <App />
    </Provider>,
    document.getElementById('app'));