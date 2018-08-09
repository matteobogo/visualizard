import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Link } from 'react-router-dom';

import WebSocketManager from './containers/HeatMapComputationManager';
import NavBar from './components/NavBar';
import StaticAnalysis from './components/StaticAnalysis/index'

export default class App extends Component {

    render() {
        return (
            <div>
                <WebSocketManager/>
                <NavBar/>
                <StaticAnalysis/>
            </div>
        );
    }
}