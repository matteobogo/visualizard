/**
 * HeatMapComputation - Container Component
 */
import React, { Component } from 'react';
import StaticHeatMapConfigurator from "../components/StaticAnalysis/StaticHeatMapConfigurator";
import DatabaseStats from "../components/StaticAnalysis/DatabaseStats";
import StaticHeatMap from "../components/StaticAnalysis/StaticHeatMap";
import StaticHeatMapStats from "../components/StaticAnalysis/StaticHeatMapStats";
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
import { getComputationRequest, getComputationStage } from '../store/selectors/heatMapComputationSelector';

//websockets - socket.io
import io from 'socket.io-client';
import * as wsTypes from '../../../commons/WebSocketsEvents';

class HeatMapComputation extends Component {

    constructor() {
        super();

        this.state = {
            connected: false,
        };
    }

    componentDidMount() {

        const { notify } = this.props;

        this.socket = io
            .connect('http://localhost:3000/ws/heatmap',   //endpoint
                {
                    transports: ['websocket'],  //options
                    //secure: true,             //https
                });
        //.of('/ws/heatmap');           //namespace

        this.socket
            .on('connect', () => {
                if (!this.state.connected) {
                    this.setState({connected: true});
                    notify(
                        'connection established', actionTypes.NOTIFICATION_TYPE_SUCCESS);
                }
            })
            .on('connect_error', () => {
                if (this.state.connected) {
                    this.setState({connected: false});
                    notify(
                        'connection error', actionTypes.NOTIFICATION_TYPE_ERROR);
                }
            })
            .on('disconnect', () => {
                if (this.state.connected) {
                    this.setState({connected: false});
                    notify(
                        'disconnected', actionTypes.NOTIFICATION_TYPE_ERROR);
                }
            });
    }

    componentDidUpdate() {

        const {
            notify,
            computationRequest,
            computationRequestAccepted,
            computationRequestRejected,
            datasetAnalysisCompleted,
            datasetAnalysisErrored,
            computationStage,
        } = this.props;

        switch (computationStage) {

            case commonTypes.COMPUTATION_STAGE_INIT:

                this.socket
                    .emit(wsTypes.HEATMAP_VALIDATION_START, computationRequest);

                this.socket
                    .on(wsTypes.HEATMAP_VALIDATION_SUCCESS, (request, validated) => {

                        if (validated) {

                            notify('Computation request validated', actionTypes.NOTIFICATION_TYPE_SUCCESS);
                            computationRequestAccepted(computationRequest);
                        }

                    })
                    .on(wsTypes.HEATMAP_VALIDATION_FAIL, (request, error) => {

                        notify('Computation request not validated', actionTypes.NOTIFICATION_TYPE_ERROR);
                        computationRequestRejected(computationRequest, error);
                    });

                break;

            case commonTypes.COMPUTATION_STAGE_ACCEPTED:

                this.socket
                    .emit(wsTypes.HEATMAP_ANALYSIS_START, computationRequest);

                this.socket
                    .on(wsTypes.HEATMAP_ANALYSIS_SUCCESS, (analysis) => {

                        //transform {} to [] for easy parsing in charts (mean points per timestamps)
                        let betterMeanPointsPerTimestamp = [];
                        Object.keys(analysis.meanPointsPerTimestamp).forEach(key => {
                            betterMeanPointsPerTimestamp.push(analysis.meanPointsPerTimestamp[key]);
                        });

                        analysis.meanPointsPerTimestamp = betterMeanPointsPerTimestamp;

                        notify('Dataset analysis completed', actionTypes.NOTIFICATION_TYPE_SUCCESS);
                        datasetAnalysisCompleted(analysis);
                    });

                this.socket
                    .on(wsTypes.HEATMAP_ANALYSIS_FAIL, (error) => {

                        notify('Dataset analysis failed', actionTypes.NOTIFICATION_TYPE_ERROR);
                        datasetAnalysisErrored(error);
                    });

                break;

            default:

        }
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

const mapStateToProps = state => {

    return {
        computationRequest: getComputationRequest(state),
        computationStage: getComputationStage(state),
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

export default connect(mapStateToProps, mapDispatchToProps)(HeatMapComputation);