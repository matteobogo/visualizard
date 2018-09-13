import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Link } from 'react-router-dom';

import NavBar from './components/NavBar';
import NotificationArea from './components/NotificationArea';
import StaticAnalysisContainer from './components/StaticAnalysis/StaticAnalysisContainer';
import WebSocketManager from './components/WebSocketManager';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/css/bootstrap-theme.min.css';

import './styles/styles.css';

export default class App extends Component {

    render() {
        return (
            <div>
                <NavBar/>
                <NotificationArea/>
                <StaticAnalysisContainer/>
                <WebSocketManager/>
            </div>
        );
    }
}