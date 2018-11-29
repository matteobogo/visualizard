import React, { Component } from 'react';

import sharedConstants from '../../commons/constants';
import * as localConstants from '../../utils/constants';
import * as apiFetcher from "../../services/ApiFetcher";

import { config } from '../../config/config';

import { connect } from 'react-redux';
import { notify } from '../../store/actions/notificationsAction';
import {addItem, removeItem} from '../../store/actions/webSocketAction';

import { getConnectionStatus, getResponsesByUUID } from '../../store/selectors/webSocketSelector';

import FakePreview from './FakePreview';
import ConfiguratorContainer from './ConfiguratorContainer';
import HeatMapNavigatorContainer from './HeatMapNavigatorContainer';
import TimeSeriesChartsContainer from './TimeSeriesChartsContainer';

import { getAvailablePinColors as colors } from './Marker';

import { Grid, Row, Col } from 'react-bootstrap';

import { TimeSeries, TimeRange } from 'pondjs';

import { LoadingOverlay, Loader } from 'react-overlay-loader';
import 'react-overlay-loader/styles.css';


import '../../styles.css';

class StaticAnalysisContainer extends Component {

    constructor() {
        super();

        this.state = {

            colorMap: null,

            [localConstants._TYPE_GROUP_DATASET]: {

                [localConstants._TYPE_DATABASES]: [],
                [localConstants._TYPE_POLICIES]: [],
                [localConstants._TYPE_HEATMAP_TYPES]: [],
                [localConstants._TYPE_FIELDS]: [],
                [localConstants._TYPE_ZSCORES]: [],
                [localConstants._TYPE_PALETTES]: [],
                [localConstants._TYPE_HEATMAP_BOUNDS]: {
                    [localConstants._TYPE_FIRST_INTERVAL]: null,
                    [localConstants._TYPE_LAST_INTERVAL]: null,
                    [localConstants._TYPE_TIMESERIES_START_INDEX]: null,
                    [localConstants._TYPE_TIMESERIES_END_INDEX]: null,
                    [localConstants._TYPE_TILE_IDS_BOUNDS_PER_ZOOM]: null,
                },
                [localConstants._TYPE_HEATMAP_ZOOMS]: [],
            },

            [localConstants._TYPE_GROUP_CONFIGURATION]: {

                [localConstants._TYPE_SELECTED_DATABASE]: null,
                [localConstants._TYPE_SELECTED_POLICY]: null,
                [localConstants._TYPE_SELECTED_HEATMAP_TYPE]: null,
                [localConstants._TYPE_SELECTED_FIELD]: null,
                [localConstants._TYPE_SELECTED_PERIOD]: 300,
                [localConstants._TYPE_SELECTED_ZSCORE]: null,
                [localConstants._TYPE_SELECTED_PALETTE]: null,
                [localConstants._TYPE_SELECTED_START_INTERVAL]: null,
                [localConstants._TYPE_SELECTED_END_INTERVAL]: null,
            },

            [localConstants._TYPE_GROUP_HEATMAP]: {

                [localConstants._TYPE_SELECTED_HEATMAP_ZOOM]: null,
                [localConstants._TYPE_MAPPED_PALETTE]: [],
            },

            [localConstants._TYPE_GROUP_ANALYSES]: {

                [localConstants._TYPE_DATASET_ANALYSIS]: null,
                [localConstants._TYPE_PSPT_ANALYSIS]: null,
            },

            //contains data of points (and their timeseries) clicked in the heatmap
            timeSeriesMap: new Map(),

            //contains the last focus (i.e. the last point/marker clicked)
            currentFocus: {
                timestamp: 'No Data',
                timeSerieIdx: 'No Data',
                zoom: 'No Data',
                color: 'No Data',
            },

            pendingRequests: {},    //map of pending requests in process through redux
            pendingDeletion: [],    //uuid list of pending requests consumed (need to be deleted from redux store)

            isLoading: false,
        };

        this.fetchData = this.fetchData.bind(this);
        this.setItem = this.setItem.bind(this);
        this.handleError = this.handleError.bind(this);
        this.handleTimeSerieSelection = this.handleTimeSerieSelection.bind(this);
        this.handlePointFocus = this.handlePointFocus.bind(this);
    }

    componentDidMount() {

        //generate the color map
        this.setState({
            colorMap: colors().map(e => { return {color: e, busy: 0} })
        });

        //fetch databases list
        this.fetchData({
            groupType: localConstants._TYPE_GROUP_DATASET,
            type: localConstants._TYPE_DATABASES,
        });

        //TODO update logic in backend: need heatmap infos (db/policy/..) to get the list of zscores
        //TODO of heatmaps available for a specific config of database/policy/etc...
        //fetch zscores
        this.fetchData({
            groupType: localConstants._TYPE_GROUP_DATASET,
            type: localConstants._TYPE_ZSCORES,
        });

        //TODO as above, but for palettes
        //fetch palettes
        this.fetchData({
            groupType: localConstants._TYPE_GROUP_DATASET,
            type: localConstants._TYPE_PALETTES,
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
            [localConstants._TYPE_FIRST_INTERVAL]: firstInterval,
            [localConstants._TYPE_LAST_INTERVAL]: lastInterval,
        } = this.state[localConstants._TYPE_GROUP_DATASET][localConstants._TYPE_HEATMAP_BOUNDS];

        const {
            [localConstants._TYPE_FIRST_INTERVAL]: prevFirstInterval,
            [localConstants._TYPE_LAST_INTERVAL]: prevLastInterval,
        } = prevState[localConstants._TYPE_GROUP_DATASET][localConstants._TYPE_HEATMAP_BOUNDS];

        const {
            [localConstants._TYPE_SELECTED_DATABASE]: selectedDatabase,
            [localConstants._TYPE_SELECTED_POLICY]: selectedPolicy,
            [localConstants._TYPE_SELECTED_HEATMAP_TYPE]: selectedHeatMapType,
            [localConstants._TYPE_SELECTED_FIELD]: selectedField,
            [localConstants._TYPE_SELECTED_ZSCORE]: selectedZScore,
            [localConstants._TYPE_SELECTED_PALETTE]: selectedPalette,
            [localConstants._TYPE_SELECTED_START_INTERVAL]: selectedStartInterval,
            [localConstants._TYPE_SELECTED_END_INTERVAL]: selectedEndInterval,
        } = this.state[localConstants._TYPE_GROUP_CONFIGURATION];

        const {
            [localConstants._TYPE_SELECTED_HEATMAP_ZOOM]: selectedHeatMapZoom,
        } = this.state[localConstants._TYPE_GROUP_HEATMAP];

        //init start/end intervals when first/last intervals of the heatmap/dataset changes
        //e.g. when first/last intervals are fetched (as heatmap's bound) from the api
        if (firstInterval !== prevFirstInterval || lastInterval !== prevLastInterval) {
            this.setState({
                [localConstants._TYPE_GROUP_CONFIGURATION]: {
                    ...this.state[localConstants._TYPE_GROUP_CONFIGURATION],
                    [localConstants._TYPE_SELECTED_START_INTERVAL]: firstInterval,
                    [localConstants._TYPE_SELECTED_END_INTERVAL]: lastInterval,
                }
            })
        }

        //guard
        if (!selectedDatabase || !selectedPolicy || !selectedHeatMapType || !selectedField
            || !selectedStartInterval || !selectedEndInterval || !selectedZScore || !selectedPalette) return;

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

            //fetch heatmap zooms
            this.fetchData({
                groupType: localConstants._TYPE_GROUP_DATASET,
                type: localConstants._TYPE_HEATMAP_ZOOMS,
                args: {
                    database: selectedDatabase,
                    policy: selectedPolicy,
                }
            });

            //fetch mapped palette
            this.fetchData({
                groupType: localConstants._TYPE_GROUP_HEATMAP,
                type: localConstants._TYPE_MAPPED_PALETTE,
                args: {
                    database: selectedDatabase,
                    policy: selectedPolicy,
                    startInterval: selectedStartInterval,
                    endInterval: selectedEndInterval,
                    field: selectedField,
                    palette: selectedPalette,
                    zScore: selectedZScore,
                }
            });
        }

        //guard
        if (!heatMapZooms || heatMapZooms.length === 0) return;

        //init heatmap configuration
        if (!selectedHeatMapZoom) {

            this.setState({
                [localConstants._TYPE_GROUP_HEATMAP]: {
                    ...this.state[localConstants._TYPE_GROUP_HEATMAP],
                    [localConstants._TYPE_SELECTED_HEATMAP_ZOOM]: heatMapZooms[0],
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

    handlePointFocus(pointData) {

        this.setState({
            currentFocus: {
                ...pointData,
            }
        });
    }

    handleTimeSerieSelection(
        {
            timeSerieIdx,
            timestamp = null,
            heatMapType = null,
            fields = null,
            zoom = null,
            tileIds = null,
            pointCoords = null,
            latLon = null,
            actionType
        }) {

        const {
            [localConstants._TYPE_SELECTED_DATABASE]: selectedDatabase,
            [localConstants._TYPE_SELECTED_POLICY]: selectedPolicy,
            [localConstants._TYPE_SELECTED_START_INTERVAL]: selectedStartInterval,
            [localConstants._TYPE_SELECTED_END_INTERVAL]: selectedEndInterval,
        } = this.state.configuration;

        const { timeSeriesMap } = this.state;

        const { notify } = this.props;

        switch (actionType) {

            case 'selection':

                //check max number of timeseries that can be viewed (notify to the user if exceed)
                if (timeSeriesMap.size === colors().length) {

                    notify({
                        enable: true,
                        message: `Reached the limit of visible timeseries`,
                        type: localConstants.NOTIFICATION_TYPE_ERROR,
                        delay: localConstants.NOTIFICATION_DELAY,
                    });

                    return;
                }

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

                        //add data correlated to the tile and the point within it selected
                        //it will be used for the overlay highlight on the heatmap
                        data["selection"] = {
                            timestamp: timestamp,
                            timeSerieIdx: timeSerieIdx,
                            tileIds: {x: tileIds[0], y: tileIds[1]},
                            pointCoords: {x: pointCoords[0], y: pointCoords[1]},
                            tileZoom: zoom,
                            latLon: latLon,
                        };

                        //assign color to timeserie
                        data["color"] = this.colorMapping();

                        this.setState({
                            [localConstants._TYPE_GROUP_HEATMAP]: {
                                ...this.state[localConstants._TYPE_GROUP_HEATMAP],
                                [localConstants._TYPE_SELECTED_HEATMAP_ZOOM]: zoom,
                            },
                            timeSeriesMap: timeSeriesMap.set(timeSerieIdx, data),
                            currentFocus: {
                                timeSerieIdx: timeSerieIdx,
                                timestamp: timestamp,
                                zoom: zoom,
                                color: data.color,
                            },
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

                if (!timeSeriesMap || !timeSeriesMap.has(timeSerieIdx)) return;

                //unmapping color, remove entry and re-assign the new map
                this.colorUnMapping(timeSeriesMap.get(timeSerieIdx).color);
                timeSeriesMap.delete(timeSerieIdx);
                this.setState({ timeSeriesMap: timeSeriesMap });

                break;
        }
    }

    colorMapping() {

        const { colorMap } = this.state;

        let color = null;
        for (let i = 0; i < colorMap.length; ++i) {
            if (!colorMap[i].busy) {
                colorMap[i].busy = 1;
                color = colorMap[i].color;
                break;
            }
        }
        return color;
    }

    colorUnMapping(color) {

        (this.state.colorMap.find((el) => el.color === color)).busy = 0;
    }

    render() {

        const {
            [localConstants._TYPE_GROUP_DATASET]: dataset,
            [localConstants._TYPE_GROUP_CONFIGURATION]: configuration,
            [localConstants._TYPE_GROUP_HEATMAP]: heatmapConfiguration,
            [localConstants._TYPE_GROUP_ANALYSES]: analyses,
            timeSeriesMap,
            currentFocus,
            isLoading,

        } = this.state;

        const {

            [localConstants._TYPE_SELECTED_DATABASE]: selectedDatabase,
            [localConstants._TYPE_SELECTED_POLICY]: selectedPolicy,
            [localConstants._TYPE_SELECTED_HEATMAP_TYPE]: selectedHeatMapType,
            [localConstants._TYPE_SELECTED_FIELD]: selectedField,
            [localConstants._TYPE_SELECTED_START_INTERVAL]: selectedStartInterval,
            [localConstants._TYPE_SELECTED_END_INTERVAL]: selectedEndInterval,

        } = this.state[localConstants._TYPE_GROUP_CONFIGURATION];

        //get stats of the current selected field from dataset analysis
        let selectedFieldStats;
        if (analyses[localConstants._TYPE_DATASET_ANALYSIS] && selectedField && selectedHeatMapType) {

            selectedFieldStats =
                analyses[localConstants._TYPE_DATASET_ANALYSIS]
                    .fieldsStats
                    .filter(e => e.field === selectedField)
                    .pop();
        }

        let showContainers = false;
        if (selectedDatabase && selectedPolicy && selectedStartInterval && selectedEndInterval) showContainers = true;

        let showTimeSeriesCharts = false;
        if (timeSeriesMap && timeSeriesMap.size > 0) showTimeSeriesCharts = true;

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
                                    isLoading={isLoading}
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
                                    timeSeriesMap={timeSeriesMap}
                                    setItem={this.setItem}
                                    handleTimeSerieSelection={this.handleTimeSerieSelection}
                                    handlePointFocus={this.handlePointFocus}
                                    currentFocus={currentFocus}
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
                                    timeSeriesMap={timeSeriesMap}
                                    currentFocus={currentFocus}
                                    isLoading={isLoading}
                                />
                            </Col>
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