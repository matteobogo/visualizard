import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Link } from 'react-router-dom';

import HeatMapComputation from './containers/HeatMapComputation';
import NavBar from './components/NavBar';

export default class App extends Component {

    render() {
        return (
            <div>
                <NavBar/>
                <HeatMapComputation/>
            </div>
        );
    }
}