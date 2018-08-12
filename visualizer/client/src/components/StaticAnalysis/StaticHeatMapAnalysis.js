/**
 * Static HeatMap Analysis - Presentational Component
 */
import React, { Component } from 'react';
import PropTypes from 'prop-types';

import * as commonTypes from '../../store/types/commonTypes';

//react-bootstrap
import {
    Panel,
    Grid,
    Row,
    Col
} from 'react-bootstrap'

//animated-number
import AnimatedNumber from 'react-animated-number';

//pretty bytes
import prettyBytes from 'pretty-bytes';

const styles = {

};

export default class StaticHeatMapAnalysis extends Component {

    render() {

        const { datasetStats } = this.props;
        //const {min, max, sum, mean, std, population} = datasetAnalysis;

        console.log(datasetStats);

        return(

            datasetStats !== null ?

            <Panel>
                <Panel.Heading>
                    <Panel.Title componentClass="h3">Stats</Panel.Title>
                </Panel.Heading>
                <Panel.Body>
                    <Grid>
                    {
                        Object.keys(datasetStats).map((key, index) =>(

                            <Row>
                                <Col>
                                    <AnimatedNumber
                                        key={index}
                                        component="text"
                                        initialValue={0}
                                        value={datasetStats[key]}
                                        duration={2000}
                                        style={{
                                            transition: '0.8s ease-out',
                                            fontSize: 20,
                                            transitionProperty:
                                                'background-color, color, opacity'
                                        }}
                                        frameStyle={perc => (
                                            perc === 100 ? {} : {backgroundColor: '#ffffff'}
                                        )}
                                        //formatValue={}
                                    />
                                </Col>
                            </Row>
                        ))
                    }
                    </Grid>

                </Panel.Body>
            </Panel>
                :
                null
        );
    }
}

StaticHeatMapAnalysis.propTypes = {

};