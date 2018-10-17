import React, { Component } from 'react';

import sharedConstants from '../../commons/constants';
import * as localConstants from '../../utils/constants';
import * as apiFetcher from "../../services/ApiFetcher";

const uuidv4 = require('uuid/v4');

import { connect } from 'react-redux';
import { notify } from '../../store/actions/notificationsAction';
import {addItem, removeItem} from '../../store/actions/webSocketAction';

import { getConnectionStatus, getResponsesByUUID } from '../../store/selectors/webSocketSelector';

import { FakePreview } from './FakePreview';
import ConfiguratorContainer from './ConfiguratorContainer';
import AnalysisContainer from './AnalysisContainer';
import HeatMapNavigatorContainer from './HeatMapNavigatorContainer';
import TimeSeriesChartsContainer from './TimeSeriesChartsContainer';

import { Grid, Row, Col } from 'react-bootstrap';

import { TimeSeries, TimeRange } from 'pondjs';

import { LoadingOverlay, Loader } from 'react-overlay-loader';
import 'react-overlay-loader/styles.css';

import '../../styles.css';

class StaticAnalysisContainer extends Component {

    constructor() {
        super();

        this.state = {

            [localConstants._TYPE_GROUP_DATASET]: {

                [localConstants._TYPE_DATABASES]: [],
                [localConstants._TYPE_POLICIES]: [],
                [localConstants._TYPE_FIELDS]: null,
                [localConstants._TYPE_N_MEASUREMENTS]: null,
                [localConstants._TYPE_FIRST_INTERVAL]: null,
                [localConstants._TYPE_LAST_INTERVAL]: null,
                [localConstants._TYPE_HEATMAP_TYPES]: [],
                [localConstants._TYPE_HEATMAP_ZOOMS]: [],
            },

            [localConstants._TYPE_GROUP_CONFIGURATION]: {

                [localConstants._TYPE_SELECTED_DATABASE]: null,
                [localConstants._TYPE_SELECTED_POLICY]: null,
                [localConstants._TYPE_SELECTED_START_INTERVAL]: null,
                [localConstants._TYPE_SELECTED_END_INTERVAL]: null,
            },

            [localConstants._TYPE_GROUP_HEATMAP]: {

                [localConstants._TYPE_SELECTED_HEATMAP_TYPE]: null,
                [localConstants._TYPE_SELECTED_FIELD]: null,
                [localConstants._TYPE_SELECTED_HEATMAP_ZOOM]: null,
            },

            [localConstants._TYPE_GROUP_ANALYSES]: {

                [localConstants._TYPE_DATASET_ANALYSIS]: null,
                [localConstants._TYPE_PSPT_ANALYSIS]: null,
            },

            timeSerieSelection: null,
            timeSerieTimestampSelection: null,

            pendingRequests: {},    //map of pending requests in process through redux
            pendingDeletion: [],    //uuid list of pending requests consumed (need to be deleted from redux store)

            isLoading: false,
        };

        this.fetchData = this.fetchData.bind(this);
        this.setItem = this.setItem.bind(this);
        this.handleError = this.handleError.bind(this);
        this.handleTimeSerieSelection = this.handleTimeSerieSelection.bind(this);
    }

    componentDidMount() {

        this.fetchData({
            groupType: localConstants._TYPE_GROUP_DATASET,
            type: localConstants._TYPE_DATABASES,
        });
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
            [localConstants._TYPE_HEATMAP_TYPES]: heatMapTypes,
            [localConstants._TYPE_FIELDS]: fields,
            [localConstants._TYPE_HEATMAP_ZOOMS]: heatMapZooms,
        } = this.state[localConstants._TYPE_GROUP_DATASET];

        const {
            [localConstants._TYPE_SELECTED_DATABASE]: selectedDatabase,
            [localConstants._TYPE_SELECTED_POLICY]: selectedPolicy,
            [localConstants._TYPE_SELECTED_START_INTERVAL]: selectedStartInterval,
            [localConstants._TYPE_SELECTED_END_INTERVAL]: selectedEndInterval,
        } = this.state[localConstants._TYPE_GROUP_CONFIGURATION];

        const {
            [localConstants._TYPE_SELECTED_HEATMAP_TYPE]: selectedHeatMapType,
            [localConstants._TYPE_SELECTED_FIELD]: selectedField,
            [localConstants._TYPE_SELECTED_HEATMAP_ZOOM]: selectedHeatMapZoom,
        } = this.state[localConstants._TYPE_GROUP_HEATMAP];

        //guard
        if (!selectedDatabase || !selectedPolicy || !selectedStartInterval || !selectedEndInterval) return;

        //configuration (from configurator) is changed
        if (JSON.stringify(this.state[localConstants._TYPE_GROUP_CONFIGURATION]) !==
            JSON.stringify(prevState[localConstants._TYPE_GROUP_CONFIGURATION])) {

            //fetch dataset analysis
            this.fetchData({
                groupType: localConstants._TYPE_GROUP_ANALYSES,
                type: localConstants._TYPE_DATASET_ANALYSIS,
                args: {
                    ...this.state[localConstants._TYPE_GROUP_CONFIGURATION],
                    [localConstants._TYPE_SELECTED_ANALYSIS]: sharedConstants.ANALYSIS_DATASET,
                }
            });

            //fetch heatmap types
            this.fetchData({
                groupType: localConstants._TYPE_GROUP_DATASET,
                type: localConstants._TYPE_HEATMAP_TYPES,
                args: {}
            });

            //fetch heatmap zooms
            this.fetchData({
                groupType: localConstants._TYPE_GROUP_DATASET,
                type: localConstants._TYPE_HEATMAP_ZOOMS,
                args: {}
            });
        }

        //guard
        if (!heatMapTypes || !heatMapZooms || !fields ||
            heatMapTypes.length === 0 || heatMapZooms.length === 0 || fields.length === 0) return;

        //init heatmap configuration
        if (!selectedHeatMapType && !selectedHeatMapZoom && !selectedField) {

            this.setState({
                [localConstants._TYPE_GROUP_HEATMAP]: {
                    ...this.state[localConstants._TYPE_GROUP_HEATMAP],
                    [localConstants._TYPE_SELECTED_HEATMAP_TYPE]: heatMapTypes[0],
                    [localConstants._TYPE_SELECTED_HEATMAP_ZOOM]: heatMapZooms[0],
                    [localConstants._TYPE_SELECTED_FIELD]: fields[0],
                }
            });
        }
    }

    componentWillUnmount() {

        //close ws socket
        this.socket.close();
    }

    fetchData({groupType, type, args = {}}) {

        const { notify } = this.props;

        this.setState({isLoading: true});

        apiFetcher.fetchData({
            itemType: type,
            args: args,
        })
            .then(result => {

                this.setState({
                    [groupType]: {
                        ...this.state[groupType],
                        [type]: result,
                    }
                });
            })
            .catch(() => {

                notify({
                    enable: true,
                    message: `Failing to fetch ${type}`,
                    type: localConstants.NOTIFICATION_TYPE_ERROR,
                    delay: localConstants.NOTIFICATION_DELAY,
                });
            })
            .then(() => this.setState({isLoading: false}));
    }

    setItem({groupType, item, type}) {

        if (item instanceof Date) item = item.toISOString();

        this.setState({
            [groupType]: {
                ...this.state[groupType],
                [type]: item,
            }
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

    handleTimeSerieSelection(
        {
            timeSerieIdx,
            timestamp = null,
            heatMapType = null,
            fields = null,
            zoom = null,
            actionType
        }) {

        const {
            [localConstants._TYPE_SELECTED_DATABASE]: selectedDatabase,
            [localConstants._TYPE_SELECTED_POLICY]: selectedPolicy,
            [localConstants._TYPE_SELECTED_START_INTERVAL]: selectedStartInterval,
            [localConstants._TYPE_SELECTED_END_INTERVAL]: selectedEndInterval,
        } = this.state.configuration;

        switch (actionType) {

            case 'selection':

                if (!selectedDatabase || !selectedPolicy || !selectedStartInterval || !selectedEndInterval ||
                    !heatMapType || !fields || fields.length === 0 ||
                    timestamp < 0 || timestamp === undefined || timestamp === null ||
                    timeSerieIdx < 0 || timeSerieIdx === undefined || timeSerieIdx === null)
                    return;

                //request data of timeserie selected
                this.setState({isLoading: true});

                apiFetcher.fetchData({
                    itemType: localConstants._TYPE_TIMESERIE_DATA,
                    args: {
                        ...this.state.configuration,
                        [localConstants._TYPE_SELECTED_TIMESERIE_INDEX]: timeSerieIdx,
                        [localConstants._TYPE_SELECTED_HEATMAP_TYPE]: heatMapType,
                        [localConstants._TYPE_SELECTED_FIELDS]: fields,
                    }
                })
                    .then(data => {

                        this.setState({
                            [localConstants._TYPE_GROUP_HEATMAP]: {
                                [localConstants._TYPE_SELECTED_HEATMAP_TYPE]: heatMapType,
                                [localConstants._TYPE_SELECTED_FIELD]: fields[0],
                                [localConstants._TYPE_SELECTED_HEATMAP_ZOOM]: zoom,
                            },
                            timeSerieSelection: {
                                ...this.state.timeSerieSelection,
                                [timeSerieIdx]: data,
                            },
                            timeSerieTimestampSelection: timestamp,
                            isLoading: false,
                        });
                    })
                    .catch(() => {
                        this.setState({isLoading: false});
                        this.handleError({
                            message: "an error occurred while fetching data",
                            type: localConstants._ERROR_FETCH_FAILED,
                        });
                    });

                break;

            case 'deselection':

                const timeseries = this.state.timeSerieSelection;

                if (!timeseries || !(timeSerieIdx in timeseries)) return;

                delete timeseries[timeSerieIdx];

                this.setState({
                   timeSerieSelection: timeseries,
                });

                break;
        }
    }

    render() {

        console.log(this.state)

        const {
            [localConstants._TYPE_GROUP_DATASET]: dataset,
            [localConstants._TYPE_GROUP_CONFIGURATION]: configuration,
            [localConstants._TYPE_GROUP_HEATMAP]: heatmapConfiguration,
            [localConstants._TYPE_GROUP_ANALYSES]: analyses,
            timeSerieSelection,
            timeSerieTimestampSelection,
            isLoading,

        } = this.state;

        const {

            [localConstants._TYPE_SELECTED_DATABASE]: selectedDatabase,
            [localConstants._TYPE_SELECTED_POLICY]: selectedPolicy,
            [localConstants._TYPE_SELECTED_START_INTERVAL]: selectedStartInterval,
            [localConstants._TYPE_SELECTED_END_INTERVAL]: selectedEndInterval,

        } = this.state[localConstants._TYPE_GROUP_CONFIGURATION];

        const {

            [localConstants._TYPE_SELECTED_HEATMAP_TYPE]: selectedHeatMapType,
            [localConstants._TYPE_SELECTED_FIELD]: selectedField,

        } = this.state[localConstants._TYPE_GROUP_HEATMAP];

        //get stats of the current selected field from dataset analysis
        let selectedFieldStats;
        if (analyses[localConstants._TYPE_DATASET_ANALYSIS] && selectedField && selectedHeatMapType) {

            selectedFieldStats =
                analyses[localConstants._TYPE_DATASET_ANALYSIS]
                    .fieldsStats
                    .filter(e => e.field === selectedField)
                    .pop();
        }

        //get only the index in the heatmap and the name of the timeseries selected
        let selectedTimeSeries = [];
        if (timeSerieSelection) {
            Object.keys(timeSerieSelection).forEach((k, idx) => {
                if (timeSerieSelection.hasOwnProperty(k))
                    selectedTimeSeries.push({
                        index: k,
                        name: timeSerieSelection[k].name
                    });
            });
        }

        let showContainers = false;
        if (selectedDatabase && selectedPolicy && selectedStartInterval && selectedEndInterval) showContainers = true;

        let showTimeSeriesCharts = false;
        if (timeSerieSelection && Object.keys(timeSerieSelection).length > 0) showTimeSeriesCharts = true;

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
                                    dataset={dataset}
                                    configuration={configuration}
                                    fetchData={this.fetchData}
                                    setItem={this.setItem}
                                    onError={this.handleError}
                                />
                            </Col>
                        </Row>
                        <Row>
                            <Col xs={12}>
                                <HeatMapNavigatorContainer
                                    disabled={!showContainers}
                                    dataset={dataset}
                                    configuration={configuration}
                                    heatMapConfiguration={heatmapConfiguration}
                                    timeSeries={timeSerieSelection}
                                    setItem={this.setItem}
                                    handleTimeSerieSelection={this.handleTimeSerieSelection}
                                    onError={this.handleError}
                                />
                            </Col>
                        </Row>
                        <Row>
                            <Col xs={12}>
                                <TimeSeriesChartsContainer
                                    disabled={!showTimeSeriesCharts}
                                    configuration={configuration}
                                    mainField={selectedField}
                                    sideFields={['n_jobs', 'n_tasks']}
                                    fieldStats={selectedFieldStats}
                                    timeSeriesData={timeSerieSelection}
                                    timestampFocus={timeSerieTimestampSelection}
                                    isLoading={isLoading}
                                />
                            </Col>
                        </Row>
                        <Row>
                            {/*<Col xs={12}>*/}
                                {/*<AnalysisContainer*/}
                                    {/*disabled={!showContainers}*/}
                                    {/*datasetAnalysis={datasetAnalysis}*/}
                                    {/*psptAnalysis={psptAnalysis}*/}
                                {/*/>*/}
                            {/*</Col>*/}
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