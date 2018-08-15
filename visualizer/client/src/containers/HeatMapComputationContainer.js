/**
 * HeatMapComputationContainer - Container Component
 */
import React, { Component } from 'react';
import StaticHeatMapConfigurator from "../components/StaticAnalysis/StaticHeatMapConfigurator";
import StaticHeatMapAnalysis from "../components/StaticAnalysis/StaticHeatMapAnalysis";
import StaticHeatMap from "../components/StaticAnalysis/StaticHeatMap";
import StaticHeatMapStats from "../components/StaticAnalysis/StaticHeatMapDatasetMean";
import StaticHeatMapRowStats from "../components/StaticAnalysis/StaticHeatMapRowStats";
import StaticHeatMapColumnStats from "../components/StaticAnalysis/StaticHeatMapColumnStats";
import StaticHeatMapPointStats from "../components/StaticAnalysis/StaticHeatMapPointStats";

import {
    Grid,
    Row,
    Col
} from 'react-bootstrap';

//redux
import { connect } from 'react-redux';
import * as actionTypes from '../store/types/actionTypes';
import * as commonTypes from '../store/types/commonTypes';
import { notify } from '../store/actions/notificationsAction';

import {
    computationRequestAccepted,
    computationRequestRejected,
    datasetAnalysisCompleted,
    datasetAnalysisErrored,
} from '../store/actions/heatmapComputationAction';

import {
    getComputationRequest,
    getComputationStage,
    getDatasetStats,
} from '../store/selectors/heatMapComputationSelector';

//websockets - socket.io
import io from 'socket.io-client';
import * as wsTypes from '../../../commons/WebSocketsEvents';

class HeatMapComputationContainer extends Component {

    constructor() {
        super();
        this.state = {
            hasError: false,
        };
    }

    componentDidMount() {

        const {
            notify,
            computationRequestAccepted,
            computationRequestRejected,
            datasetAnalysisCompleted,
            datasetAnalysisErrored,
        } = this.props;

        /* Register Socket Events Handlers */

        //initialize socket
        this.socket = io
            .connect('http://localhost:3000/ws/heatmap',   //endpoint
                {
                    transports: ['websocket'],  //options
                    //secure: true,             //https
                });
                //.of('/ws/heatmap');           //namespace

        //connection/disconnection
        this.socket
            .on('connect', () => {
                notify(
                    'connection established',
                    actionTypes.NOTIFICATION_TYPE_SUCCESS);
            })
            .on('connect_error', () => {
                notify(
                    'connection error',
                    actionTypes.NOTIFICATION_TYPE_ERROR);
            })
            .on('disconnect', () => {
                notify(
                    'disconnected',
                    actionTypes.NOTIFICATION_TYPE_ERROR);
            });

        //validation
        this.socket
            .on(wsTypes.HEATMAP_VALIDATION_SUCCESS, (request, validated) => {

                if (validated) {

                    notify('Computation request validated', actionTypes.NOTIFICATION_TYPE_SUCCESS);
                    computationRequestAccepted(request);
                }

            })
            .on(wsTypes.HEATMAP_VALIDATION_FAIL, (request, error) => {

                notify('Computation request not validated', actionTypes.NOTIFICATION_TYPE_ERROR);
                computationRequestRejected(request, error);
            });

        //analysis
        this.socket
            .on(wsTypes.HEATMAP_ANALYSIS_SUCCESS, (analysis) => {

                //transform {} to [] for easy parsing in charts (meanPointsPerTimestamp)
                let betterMeanPointsPerTimestamp = [];
                Object.keys(analysis.meanPointsPerTimestamp).forEach(key => {
                    betterMeanPointsPerTimestamp.push(analysis.meanPointsPerTimestamp[key]);
                });

                analysis.meanPointsPerTimestamp = betterMeanPointsPerTimestamp;

                //transform { field1 : { .. stats .. }, field2: { .. stats .. }, .. }
                //into { .. stats .. } using the field selected by the user during config
                let field = Object.keys(analysis.datasetStats).pop();
                analysis.datasetStats = analysis.datasetStats[field];

                notify('Dataset analysis completed', actionTypes.NOTIFICATION_TYPE_SUCCESS);
                datasetAnalysisCompleted(analysis);
            });

        this.socket
            .on(wsTypes.HEATMAP_ANALYSIS_FAIL, (error) => {

                notify('Dataset analysis failed', actionTypes.NOTIFICATION_TYPE_ERROR);
                datasetAnalysisErrored(error);
            });
    }

    componentDidUpdate(prevProps, prevState) {

        const {
            computationRequest,
            computationStage,
        } = this.props;

        if (prevProps !== this.props) {

            /* Trigger Socket Events */

            switch (computationStage) {

                case commonTypes.COMPUTATION_STAGE_INIT:

                    this.socket
                        .emit(wsTypes.HEATMAP_VALIDATION_START, computationRequest);

                    break;

                case commonTypes.COMPUTATION_STAGE_ACCEPTED:

                    this.socket
                        .emit(wsTypes.HEATMAP_ANALYSIS_START, computationRequest);

                    break;

                default:
                    break;
            }
        }
    }

    componentWillUnmount() {

        this.socket.close();
    }

    render() {

        const { datasetStats } = this.props;

        return(
            <Grid fluid>
                <Row>
                    <Col xs={12}>
                        <Row>
                            <Col xs={12} md={4}>
                                <StaticHeatMapConfigurator/>
                            </Col>
                            <Col xs={12} md={4}>
                                <StaticHeatMapAnalysis
                                    datasetStats={datasetStats}
                                />
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

const mapStateToProps = state => {

    return {
        computationRequest: getComputationRequest(state),
        computationStage: getComputationStage(state),
        datasetStats: getDatasetStats(state),
    }
};

const mapDispatchToProps = (dispatch) => {

    return {
        notify: (status, msgType) => dispatch(notify(status, msgType)),
        computationRequestAccepted: (request) => dispatch(computationRequestAccepted(request)),
        computationRequestRejected: (request, error) => dispatch(computationRequestRejected(request, error)),
        datasetAnalysisCompleted: (analysis) => dispatch(datasetAnalysisCompleted(analysis)),
        datasetAnalysisErrored: (error) => dispatch(datasetAnalysisErrored(error)),
    }
};

export default connect(mapStateToProps, mapDispatchToProps)(HeatMapComputationContainer);