import React, { Component } from 'react';

import NavBar from './components/NavBar';
import IntervalPicker from './components/IntervalPicker';
import HeatMapStats from './components/HeatMapStats';
import StaticHeatMap from './components/StaticHeatMap';

//react-bootstrap
import {
    Grid,
    Row,
    Col
} from 'react-bootstrap';

class App extends Component {

    render() {
        return (
            <div>
                <NavBar/>
                <Grid fluid>
                    <Row className="show-grid">
                        <Col md={4}>
                            <IntervalPicker/>
                        </Col>
                        <Col md={8}>
                            <HeatMapStats/>
                        </Col>
                    </Row>
                    <StaticHeatMap/>
                </Grid>
            </div>
        );
    }
}

export default App;
