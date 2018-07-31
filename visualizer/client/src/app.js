import React, { Component } from 'react';

import NavBar from './components/NavBar';
import StaticHeatMapConfigurator from './components/StaticAnalysis/StaticHeatMapConfigurator';
import StaticHeatMapStats from './components/StaticAnalysis/StaticHeatMapStats';
import StaticHeatMap from './components/StaticAnalysis/StaticHeatMap';
import StaticHeatMapRowStats from './components/StaticAnalysis/StaticHeatMapRowStats';
import StaticHeatMapColumnStats from './components/StaticAnalysis/StaticHeatMapColumnStats';
import StaticHeatMapPointStats from './components/StaticAnalysis/StaticHeatMapPointStats';

//react-bootstrap
import {
    Grid,
    Row,
    Col
} from 'react-bootstrap';

const styles = {

};

class App extends Component {

    render() {
        return (
            <Grid fluid>
                <Row>
                    <Col>
                        <NavBar/>
                    </Col>
                </Row>
                <Row>
                    <Col xs={12} sm={5} lg={4}>
                        <StaticHeatMapConfigurator/>
                    </Col>
                    <Col xs={12} sm={7} lg={8}>
                        <StaticHeatMapStats/>
                    </Col>
                </Row>
                <Row>
                    <Col xs={12}>
                        <StaticHeatMap/>
                    </Col>
                </Row>
                <Row>
                    <Col xs={12} sm={6} md={4}>
                        <StaticHeatMapRowStats/>
                    </Col>
                    <Col xs={12} sm={6} md={4}>
                        <StaticHeatMapColumnStats/>
                    </Col>
                    <Col xs={12} md={4}>
                        <StaticHeatMapPointStats/>
                    </Col>
                </Row>
            </Grid>
        );
    }
}

export default App;


{/*<div>*/}
{/*<NavBar/>*/}
{/*<div style={{width: "100%", display: "flex"}}>*/}
{/*<div style={{width: "300px"}}>*/}
{/*<StaticHeatMapConfigurator/>*/}
{/*</div>*/}
{/*<div style={{width: "100%"}}>*/}
{/*<StaticHeatMapStats/>*/}
{/*</div>*/}
{/*</div>*/}
{/*<StaticHeatMap/>*/}
{/*</div>*/}