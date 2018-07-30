import React from 'react';
import ReactDOM from 'react-dom';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/css/bootstrap-theme.min.css';

//localization with Moment
import Moment from 'moment'
import momentLocalizer from 'react-widgets-moment';

import App from './app';

//localization - required for react-widgets DateTimePicker
Moment.locale('en');
momentLocalizer();

ReactDOM.render(<App/>, document.getElementById('app'));