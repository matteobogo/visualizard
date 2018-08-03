import React from 'react';

import {
    Grid,
    Row,
    Col
} from 'react-bootstrap';

import StaticHeatMapConfigurator from "./StaticHeatMapConfigurator";
import DatabaseStats from "./DatabaseStats";
import StaticHeatMap from "./StaticHeatMap";
import StaticHeatMapStats from "./StaticHeatMapStats";
import StaticHeatMapRowStats from "./StaticHeatMapRowStats";
import StaticHeatMapColumnStats from "./StaticHeatMapColumnStats";
import StaticHeatMapPointStats from "./StaticHeatMapPointStats";

export default class StaticAnalysis extends React.Component {

    constructor(props) {
        super(props);

        this.state = {

        };
    }

    render() {
        return(
            <Grid fluid>
                <Row>
                    <Col xs={12}>
                        <Row>
                            <Col xs={12} md={4}>
                                <StaticHeatMapConfigurator/>
                            </Col>
                            <Col xs={12} md={4}>
                                <DatabaseStats/>
                            </Col>
                            <Col xs={12} md={4}>
                            </Col>
                        </Row>
                    </Col>
                </Row>
                <Row>
                    <Col xs={12}>
                        <StaticHeatMap/>
                    </Col>
                </Row>
                <Row>
                    <Col xs={12}>
                        <StaticHeatMapStats/>
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