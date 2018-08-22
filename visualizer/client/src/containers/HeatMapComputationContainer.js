/**
 * HeatMapComputationContainer - Container Component
 */
import React, { Component } from 'react';

import StaticHeatMapConfigurator from "../components/StaticAnalysis/StaticHeatMapConfigurator";
import StaticHeatMapDatasetAnalysis from "../components/StaticAnalysis/StaticHeatMapDatasetAnalysis";
import StaticHeatMap from "../components/StaticAnalysis/StaticHeatMap";
import StaticHeatMapPsptAnalysis from "../components/StaticAnalysis/StaticHeatMapPsptAnalysis";
import StaticHeatMapRowStats from "../components/StaticAnalysis/StaticHeatMapRowStats";
import StaticHeatMapColumnStats from "../components/StaticAnalysis/StaticHeatMapColumnStats";
import StaticHeatMapPointStats from "../components/StaticAnalysis/StaticHeatMapPointStats";

import WebSocketErrorHandler from "../components/ErrorHandlers/WebSocketErrorHandler";

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
    fetchItems,
    resetDatasetItems
} from '../store/actions/datasetInfoAction';

import {
    setComputationRequestItem,
    startComputation,
    consumeComputationStage,
    setComputationInProgress,
    computationReceived,
    computationFailed,
    resetPreviousComputationRequest,
} from '../store/actions/computationAction';

import {
    getRequestUUID,
    getComputationRequest,
    getCurrentComputationStage,
    getPendingComputationStages,
    getComputationInProgress,
    getDatasetAnalysis,
    getPointsStatsPerTimestampAnalysis,
} from '../store/selectors/computationSelector';

//websockets - socket.io
import io from 'socket.io-client';
import * as wsTypes from '../../../commons/WebSocketsEvents';
import {getHasErrored, getIsLoading, getItems} from "../store/selectors/datasetInfoSelector";

const _COMPUTATION_OPTIONS = [

    {type: 'VALIDATION', name: 'Validation', stage: commonTypes.COMPUTATION_STAGE_VALIDATION_REQUEST},
    {type: 'ANALYSIS', name: 'Analysis', stage: commonTypes.COMPUTATION_STAGE_ANALYSIS_REQUEST},
    {type: 'HEATMAP', name: 'HeatMap', stage: commonTypes.COMPUTATION_STAGE_HEATMAP_REQUEST},
];

class HeatMapComputationContainer extends Component {

    constructor() {
        super();
        this.state = {

        };

        this.fetchDataFromApi = this.fetchDataFromApi.bind(this);
        this.setComputationRequestItem = this.setComputationRequestItem.bind(this);
        this.startComputation = this.startComputation.bind(this);
    }

    componentDidMount() {

        const {
            notify,
            computationReceived,
            computationFailed,
            setComputationInProgress,
        } = this.props;

        /* Fetch Databases List from API */
        this.fetchDataFromApi(actionTypes._TYPE_DATABASE);

        /* Initialize Computation Options */
        this.setComputationRequestItem(_COMPUTATION_OPTIONS.map(v => v.stage), actionTypes._TYPE_COMPUTATION_OPTIONS);

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

        //errors
        this.socket
            .on(wsTypes.COMPUTATION_ERROR, (error, stage) => {

                notify(`ERROR: ${error}`, actionTypes.NOTIFICATION_TYPE_ERROR);
                computationFailed(error, actionTypes.COMPUTATION_ERRORED);
                setComputationInProgress(false);
            })

        //validation
            .on(wsTypes.COMPUTATION_VALIDATION_SUCCESS, (uuid) => {

                notify('Computation request validated', actionTypes.NOTIFICATION_TYPE_SUCCESS);
                computationReceived({uuid: uuid}, actionTypes.COMPUTATION_VALIDATION_RECEIVED);
                setComputationInProgress(false);
            })
            .on(wsTypes.COMPUTATION_VALIDATION_FAIL, (error) => {

                notify('Computation request not valid', actionTypes.NOTIFICATION_TYPE_ERROR);
                computationFailed(error, actionTypes.COMPUTATION_VALIDATION_FAILED);
                setComputationInProgress(false);
            })

        //dataset analysis
            .on(wsTypes.COMPUTATION_ANALYSIS_SUCCESS, (analysis, uuid) => {

                //transform { field1 : { .. stats .. }, field2: { .. stats .. }, .. }
                //into { .. stats .. } using the field selected by the user during config
                let field = Object.keys(analysis.datasetAnalysis).pop();
                analysis.datasetAnalysis = analysis.datasetAnalysis[field];

                notify('Analysis completed', actionTypes.NOTIFICATION_TYPE_SUCCESS);
                computationReceived({response: analysis, uuid: uuid}, actionTypes.COMPUTATION_ANALYSIS_RECEIVED);
                setComputationInProgress(false);
            })
            .on(wsTypes.COMPUTATION_ANALYSIS_FAILED, (error, uuid) => {

                notify('Analysis failed', actionTypes.NOTIFICATION_TYPE_ERROR);
                computationFailed(error, actionTypes.COMPUTATION_ANALYSIS_FAILED, {uuid: uuid});
                setComputationInProgress(false);
            });
    }

    componentDidUpdate(prevProps, prevState) {

        const { notify, uuid, computationRequest, currentComputationStage,
                pendingComputationStages, consumeComputationStage, computationInProgress, setComputationInProgress,
        } = this.props;

        if (prevProps !== this.props && !computationInProgress) {

            /* Trigger Socket Events */

            switch (currentComputationStage) {

                case commonTypes.COMPUTATION_STAGE_VALIDATION_REQUEST:

                    setComputationInProgress(true);

                    this.socket
                        .emit(wsTypes.COMPUTATION_VALIDATION_START, computationRequest);

                    //notify('Request Validation in progress', actionTypes.NOTIFICATION_TYPE_SUCCESS);

                    //consume stage
                    consumeComputationStage(commonTypes.COMPUTATION_STAGE_VALIDATION_REQUEST);

                    break;

                case commonTypes.COMPUTATION_STAGE_ANALYSIS_REQUEST:

                    setComputationInProgress(true);

                    this.socket
                        .emit(wsTypes.COMPUTATION_ANALYSIS_START, uuid);

                    //notify('Analysis in progress', actionTypes.NOTIFICATION_TYPE_SUCCESS);

                    //consume stage
                    consumeComputationStage(commonTypes.COMPUTATION_STAGE_ANALYSIS_REQUEST);

                    break;

                case commonTypes.COMPUTATION_STAGE_HEATMAP_REQUEST:

                    setComputationInProgress(true);

                    this.socket
                        .emit(wsTypes.COMPUTATION_HEATMAP_START, uuid);

                    notify('HeatMap generation in progress', actionTypes.NOTIFICATION_TYPE_SUCCESS);

                    //consume stage
                    consumeComputationStage(commonTypes.COMPUTATION_STAGE_HEATMAP_REQUEST);

                    break;

                default:
                    break;
            }
        }
    }

    componentWillUnmount() {

        this.socket.close();
    }

    fetchDataFromApi(itemType, {database, policy, field} = {}) {

        const { fetchItems } = this.props;

        fetchItems(
            itemType,
            {
                database: database,
                policy: policy,
                field: field,
            });
    }

    setComputationRequestItem(item, itemType) {

        const { setComputationRequestItem } = this.props;

        setComputationRequestItem(item, itemType);
    }

    startComputation() {

        const { startComputation } = this.props;

        startComputation();
    }

    render() {

        const {
            notify,
            isLoading,
            hasErrored,
            databases,
            policies,
            fields,
            periods,
            heatMapTypes,
            palettes,
            firstInterval,
            lastInterval,
            computationRequest,
            datasetAnalysis,
            psptAnalysis,
            heatMapImage,
        } = this.props;

        if (hasErrored !== null) {

            notify(hasErrored, actionTypes.NOTIFICATION_TYPE_ERROR);

            return(
              <div>
                  <img src='../../public/images/connection-error.png'/>  //TODO Test with influx down
              </div>
            );
        }

        return(
            <WebSocketErrorHandler>
                <Grid fluid>
                    <Row>
                        <Col xs={12}>
                            <Row>
                                <Col xs={12} md={4}>
                                    <StaticHeatMapConfigurator
                                        isLoading={isLoading}
                                        databases={databases}
                                        policies={policies}
                                        fields={fields}
                                        periods={periods}
                                        heatMapTypes={heatMapTypes}
                                        palettes={palettes}
                                        firstInterval={firstInterval}
                                        lastInterval={lastInterval}
                                        computationOptions={_COMPUTATION_OPTIONS}
                                        fetchDataFromApi={this.fetchDataFromApi}
                                        setComputationRequestItem={this.setComputationRequestItem}
                                        computationRequest={computationRequest}
                                        startComputation={this.startComputation}
                                    />
                                </Col>
                                <Col xs={12} md={4}>
                                    {
                                        datasetAnalysis ?
                                            <StaticHeatMapDatasetAnalysis
                                                datasetAnalysis={datasetAnalysis}
                                            />
                                            : null
                                    }
                                </Col>
                                <Col xs={12} md={4}>
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                    <Row>
                        <Col xs={12}>
                            <StaticHeatMap
                                heatMapImage={heatMapImage}
                            />
                        </Col>
                    </Row>
                    <Row>
                        <Col xs={12}>
                            {
                                psptAnalysis && datasetAnalysis ?
                                    <StaticHeatMapPsptAnalysis
                                        datasetAnalysis={datasetAnalysis}
                                        psptAnalysis={psptAnalysis}
                                    />
                                    : null
                            }
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
            </WebSocketErrorHandler>
        );
    }
}

const mapStateToProps = state => {

    return {
        hasErrored: getHasErrored(state),
        isLoading: getIsLoading(state),
        databases: getItems(state, actionTypes._TYPE_DATABASE),
        policies: getItems(state, actionTypes._TYPE_POLICY),
        fields: getItems(state, actionTypes._TYPE_FIELD),
        periods: getItems(state, actionTypes._TYPE_PERIOD),
        heatMapTypes: getItems(state, actionTypes._TYPE_HEATMAP_TYPE),
        palettes: getItems(state, actionTypes._TYPE_PALETTE),
        firstInterval: getItems(state, actionTypes._TYPE_FIRST_INTERVAL),
        lastInterval: getItems(state, actionTypes._TYPE_LAST_INTERVAL),
        uuid: getRequestUUID(state),
        computationRequest: getComputationRequest(state),
        currentComputationStage: getCurrentComputationStage(state),
        pendingComputationStages: getPendingComputationStages(state),
        computationInProgress: getComputationInProgress(state),
        datasetAnalysis: getDatasetAnalysis(state),
        psptAnalysis: getPointsStatsPerTimestampAnalysis(state),
    }
};

const mapDispatchToProps = (dispatch) => {

    return {
        notify: (status, msgType) => dispatch(notify(status, msgType)),
        fetchItems: (itemType, ...options) => dispatch(fetchItems(itemType, ...options)),
        setComputationRequestItem: (item, itemType) => dispatch(setComputationRequestItem(item, itemType)),
        startComputation: (type) => dispatch(startComputation(type)),
        consumeComputationStage: (stage) => dispatch(consumeComputationStage(stage)),
        setComputationInProgress: (bool) => dispatch(setComputationInProgress(bool)),
        computationReceived: (type, ...options) => dispatch(computationReceived(type, ...options)),
        computationFailed: (error, type, ...options) => dispatch(computationFailed(error, type, ...options)),
    }
};

export default connect(mapStateToProps, mapDispatchToProps)(HeatMapComputationContainer);