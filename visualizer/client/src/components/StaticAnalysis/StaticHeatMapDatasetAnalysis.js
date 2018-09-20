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

export default class StaticHeatMapDatasetAnalysis extends Component {

    render() {

        const { datasetAnalysis, show } = this.props;

        return(

            show === true ?

            <Panel>
                <Panel.Heading>
                    <Panel.Title componentClass="h3">Stats</Panel.Title>
                </Panel.Heading>
                <Panel.Body>
                    <Grid>
                    {
                        Object.keys(datasetAnalysis).map((key, index) =>(

                            <Row key={index}>
                                <Col>
                                    <div>
                                        {key}
                                    </div>
                                    <div>
                                        <AnimatedNumber
                                            component="span"
                                            initialValue={0}
                                            value={Math.round(datasetAnalysis[key] * 100) / 100} //approx. 2 decimals
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

StaticHeatMapDatasetAnalysis.propTypes = {

};