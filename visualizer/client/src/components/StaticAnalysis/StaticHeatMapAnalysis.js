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

                            <Row key={index}>
                                <Col>
                                    <div>
                                        {key}
                                    </div>
                                    <div>
                                        <AnimatedNumber
                                            component="span"
                                            initialValue={0}
                                            value={Math.round(datasetStats[key] * 100) / 100} //approx. 2 decimals
                                            stepPrecision={2}
                                            duration={3000}
                                            style={{
                                                transition: '0.8s ease-out',
                                                fontSize: 20,
                                                transitionProperty:
                                                    'background-color, color, opacity'
                                            }}
                                            frameStyle={perc => (
                                                perc === 100 ? {} : {
                                                    backgroundColor: '#ffffff',
                                                }
                                            )}
                                            //formatValue={}
                                        />
                                    </div>
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