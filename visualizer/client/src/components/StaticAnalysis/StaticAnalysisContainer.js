/**
 * StaticAnalysisContainer - Container Component
 */
import React, { Component } from 'react';

import sharedConstants from '../../commons/constants';
import * as localConstants from '../../utils/constants';

const uuidv4 = require('uuid/v4');

import { connect } from 'react-redux';
import { notify } from '../../store/actions/notificationsAction';
import {addItem, removeItem} from '../../store/actions/webSocketAction';

import { getConnectionStatus, getResponsesByUUID } from '../../store/selectors/webSocketSelector';

import { FakePreview } from './FakePreview';
import ConfiguratorContainer from './ConfiguratorContainer';
import AnalysisContainer from './AnalysisContainer';
import HeatMapContainer from './HeatMapContainer';

//TODO change
import StaticHeatMapColumnStats from './StaticHeatMapColumnStats';
import StaticHeatMapPointStats from './StaticHeatMapPointStats';
import StaticHeatMapRowStats from './StaticHeatMapRowStats';

import { Grid, Row, Col, Alert } from 'react-bootstrap';

import { LoadingOverlay, Loader } from 'react-overlay-loader';
import 'react-overlay-loader/styles.css';

import '../../styles/styles.css';

class StaticAnalysisContainer extends Component {

    constructor() {
        super();

        this.state = {

            configuration: {

                [localConstants._TYPE_SELECTED_DATABASE]: null,
                [localConstants._TYPE_SELECTED_POLICY]: null,
                [localConstants._TYPE_SELECTED_START_INTERVAL]: null,
                [localConstants._TYPE_SELECTED_END_INTERVAL]: null,
            },

            options: {

                [localConstants._TYPE_OPTION_ANALYSIS]: false,
                [localConstants._TYPE_OPTION_HEATMAP]: false,
            },

            //analysis
            [sharedConstants.ANALYSIS_DATASET]: null,
            [sharedConstants.ANALYSIS_PSPT]: null,

            pendingRequests: {},    //map of pending requests in process through redux
            pendingDeletion: [],    //uuid list of pending requests consumed (need to be deleted from redux store)

            isLoading: false,
        };

        this.setConfigurationItem = this.setConfigurationItem.bind(this);
        this.setOption = this.setOption.bind(this);
        this.handleError = this.handleError.bind(this);
    }

    componentDidMount() {

    }

    static getDerivedStateFromProps(nextProps, prevState) {

            let changes = {};

            //are there some responses for me? (check with the list of the pending requests)
            Object.keys(prevState.pendingRequests).forEach((uuid, index) => {

                if (prevState.pendingRequests.hasOwnProperty(uuid) &&
                    nextProps.responses(uuid) !== null) {

                    const response = nextProps.responses(uuid);

                    //remove the pending request from the list in the state
                    let pendingRequests = {...prevState.pendingRequests};  //clone the list
                    delete pendingRequests[uuid]; //remove the pending request

                    let pendingDeletion = prevState.pendingDeletion.slice();
                    pendingDeletion.push(uuid);

                    changes = {
                        [response.operation]: response.data,  //assign the new data in the state
                        pendingRequests: pendingRequests,     //update the pending requests list
                        pendingDeletion: pendingDeletion,
                    };
                }
            });

            if (!changes || Object.keys(changes).length > 0) {

                return {
                    ...changes,
                }
            }

        return null;
    }

    componentDidUpdate(prevProps, prevState, prevContext) {

        const {
            [localConstants._TYPE_SELECTED_DATABASE]: database,
            [localConstants._TYPE_SELECTED_POLICY]: policy,
            [localConstants._TYPE_SELECTED_START_INTERVAL]: startInterval,
            [localConstants._TYPE_SELECTED_END_INTERVAL]: endInterval,
        } = this.state.configuration;

        const {
            [localConstants._TYPE_SELECTED_DATABASE]: prevDatabase,
            [localConstants._TYPE_SELECTED_POLICY]: prevPolicy,
            [localConstants._TYPE_SELECTED_START_INTERVAL]: prevStartInterval,
            [localConstants._TYPE_SELECTED_END_INTERVAL]: prevEndInterval,
        } = prevState.configuration;

        const {
            [localConstants._TYPE_OPTION_ANALYSIS]: optionAnalysis,
            [localConstants._TYPE_OPTION_HEATMAP]: optionHeatMap,
        } = this.state.options;

        const {
            [localConstants._TYPE_OPTION_ANALYSIS]: prevOptionAnalysis,
            [localConstants._TYPE_OPTION_HEATMAP]: prevOptionHeatMap,
        } = prevState.options;

        const { addRequest, removeResponse } = this.props;

        //some configuration's item is changed?
        if (prevDatabase !== database || prevPolicy !== policy || prevStartInterval !== startInterval ||
            prevEndInterval !== endInterval || prevOptionAnalysis !== optionAnalysis) {

            //null check
            if (Object.values(this.state.configuration).some(value => (value === null || value === undefined))) return;

            //configuration ready => send requests (dataset + pspt analysis)
            if (optionAnalysis) {

                const uuids = [uuidv4(), uuidv4()];

                const requests = {
                    [uuids[0]]: {operation: sharedConstants.ANALYSIS_DATASET, data: this.state.configuration},
                    [uuids[1]]: {operation: sharedConstants.ANALYSIS_PSPT, data: this.state.configuration},
                };

                addRequest({
                    uuid: uuids[0],
                    ...requests[uuids[0]],
                });

                addRequest({
                    uuid: uuids[1],
                    ...requests[uuids[1]],
                });

                this.setState({
                    pendingRequests: {
                        ...this.state.pendingRequests,
                        ...requests
                    },
                    isLoading: true
                });
            }
        }

        if (this.state.pendingDeletion.length > 0) {

            const uuid = this.state.pendingDeletion.pop();

            removeResponse(uuid);
        }

        if (prevState.isLoading &&
            Object.keys(this.state.pendingRequests).length === 0 &&
            this.state.pendingDeletion.length === 0) {

            this.setState({ isLoading: false });
        }
    }

    componentWillUnmount() {

        //close ws socket
        this.socket.close();
    }

    setConfigurationItem({item, itemType}) {

        if (item instanceof Date) item = item.toISOString();

        this.setState({
            configuration: {
                ...this.state.configuration,
                [itemType]: item,
            }
        });
    }

    setOption({bool, type}) {

        this.setState({
            options: {
                ...this.state.options,
                [type]: bool,
            },
        });
    }

    handleError({message, type, ...options}) {

        const { notify } = this.props;

        switch (type) {

            case localConstants._ERROR_FETCH_FAILED:

                notify({
                    enable: true,
                    message: message,
                    type: localConstants.NOTIFICATION_TYPE_ERROR,
                    delay: localConstants.NOTIFICATION_DELAY,
                });

                break;

            default:

                notify({
                    enable: true,
                    message: `Unexpected Error occurred`,
                    type: localConstants.NOTIFICATION_TYPE_ERROR,
                    delay: localConstants.NOTIFICATION_DELAY,
                });
        }
    }

    render() {

        const {
            configuration,
            options,
            [sharedConstants.ANALYSIS_DATASET]: datasetAnalysis,
            [sharedConstants.ANALYSIS_PSPT]: psptAnalysis,
            isLoading,
        } = this.state;

        const { connectionStatus } = this.props;

        if (!connectionStatus)

            return (
                <FakePreview/>
            );

        return(
                <Grid fluid>
                    <LoadingOverlay>
                        <Row>
                            <Col xs={12}>
                                <ConfiguratorContainer
                                    configuration={configuration}
                                    options={options}
                                    setConfigurationItem={this.setConfigurationItem}
                                    setOption={this.setOption}
                                    onError={this.handleError}
                                />
                            </Col>
                        </Row>
                        <Row>
                            <Col xs={12}>
                                <AnalysisContainer
                                    disabled={!options[localConstants._TYPE_OPTION_ANALYSIS]}
                                    datasetAnalysis={datasetAnalysis}
                                    psptAnalysis={psptAnalysis}
                                />
                            </Col>
                        </Row>
                        <Row>
                            <Col xs={12}>
                                <HeatMapContainer
                                    disabled={!options[localConstants._TYPE_OPTION_HEATMAP]}
                                    configuration={configuration}
                                    onError={this.handleError}
                                />
                            </Col>
                        </Row>
                        <Row>
                            {
                                options[localConstants._TYPE_OPTION_HEATMAP] ?

                                    <div>
                                        <Col xs={12} sm={6} md={4}>
                                            <StaticHeatMapRowStats/>
                                        </Col>
                                        < Col xs={12} sm={6} md={4}>
                                        <StaticHeatMapColumnStats/>
                                        </Col>
                                        <Col xs={12} md={4}>
                                        <StaticHeatMapPointStats/>
                                        </Col>
                                    </div>

                                : null
                            }
                        </Row>
                    </LoadingOverlay>
                    <Loader loading={isLoading}/>
                </Grid>
        );
    }
}

const mapStateToProps = (state) => {

    return {

        connectionStatus: getConnectionStatus(state),
        responses: (uuid) => getResponsesByUUID(state, uuid),
    }
};

const mapDispatchToProps = (dispatch) => {

    return {

        notify: (notification) => dispatch(notify(notification)),
        addRequest: (request) => dispatch(addItem({...request, queueType: localConstants._TYPE_REQUESTS_QUEUE})),
        removeResponse: (uuid) => dispatch(removeItem({uuid: uuid, queueType: localConstants._TYPE_RESPONSES_QUEUE})),
    }
};

export default connect(mapStateToProps, mapDispatchToProps)(StaticAnalysisContainer);