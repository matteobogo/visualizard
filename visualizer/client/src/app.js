import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Link } from 'react-router-dom';

import NavBar from './components/NavBar';
import StaticAnalysis from './components/StaticAnalysis/index'

class App extends Component {

    render() {
        return (
            <div>
                <NavBar/>
                <StaticAnalysis/>
            </div>
        );
    }
}

export default App;