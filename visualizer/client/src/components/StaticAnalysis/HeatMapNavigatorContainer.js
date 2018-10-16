import React, { Component } from 'react';
import { config, TILES_URL } from '../../config/config';

import * as localConstants from '../../utils/constants';

import { Panel, Row, Col, Form } from 'react-bootstrap';
import 'react-widgets/dist/css/react-widgets.css';

import { X } from 'react-feather';

import './HeatMapNavigatorContainer.css';

import { DropdownClassic } from '../common/Dropdown';
import { HeatMapSelectionBox } from './HeatMapSelectionBox';

import ArrowUpSvg from '../../../public/images/arrow-up.svg';
import ArrowRightSvg from '../../../public/images/arrow-right.svg';
import ArrowDownSvg from '../../../public/images/arrow-down.svg';
import ArrowLeftSvg from '../../../public/images/arrow-left.svg';
import Tile from "./Tile.js";

//estimation of pixels gap for the left/right panel's border
//we need to consider the gap during computation of the number of tiles that can be visualized
const _PANEL_GAP = 150;
const _FIXED_TILES_HEIGHT = 2;

const _MENU_NAVIGATION = {

    _UP: 'UP',
    _RIGHT: 'RIGHT',
    _DOWN: 'DOWN',
    _LEFT: 'LEFT',
};

const convertTimestampToID = (genesis, current, period = 300) => {

    let start = Date.parse(genesis);    //converts to unix epoch time (ms)
    let end = Date.parse(current);

    return Math.floor((end - start) / (period * 1000 * config.TILE_SIZE));
};

const convertTileCoordinates = ({ genesis, tileIds, tileCoords, zoom, period = 300 }) => {

    const [tileIdX, tileIdY] = tileIds;             //heatmap ids associated to the tile
    const [tileCoordX, tileCoordY] = tileCoords;    //coordinates of the point within the tile

    let timestamp = new Date(genesis);
    let tileInterval = period * config.TILE_SIZE;

    let timeserieIdx = (config.TILE_SIZE * tileIdY) + tileCoordY;

    if (zoom > 0) {
        tileInterval = tileInterval / zoom;
        timeserieIdx = Math.floor(timeserieIdx / zoom);
    }

    timestamp.setSeconds(
        timestamp.getSeconds() +
        (tileInterval * tileIdX) +      //get the start timestamp of the tile identified by the ID
        (period * tileCoordX));         //get the timestamp associated with the pixel within the tile

    return [timestamp.toISOString(), `${timeserieIdx}`];
};

export default class HeatMapNavigatorContainer extends Component {

    constructor() {
        super();

        this.state = {

            navigation: {   //(x,y)

                nHorizontalTiles: 0,

                tileIdStartInterval: null,      //ids
                tileIdCurrentInterval: null,
                tileIdEndInterval: null,

                timelineStartTimestamp: null,
                timelineEndTimestamp: null,
                timelineStartTimeserieIndex: null,
                timelineEndTimeserieIndex: null,

                tileIdStartMachineIndex: null,
                tileIdCurrentMachineIndex: null,
                tileIdEndMachineIndex: null,

                tileRowsURLs: [],
            },

            selection: {

                timestamp: 'No Data',
                timeserieIdx: 'No Data',
            },

            clientWindowWidth: window.innerWidth,
            clientWindowsHeight: window.innerHeight,

            currentHeatMapContainerWidth: null,
            currentHeatMapContainerHeight: null,

            isLoading: false,
        };

        this.handleDropdownSelection = this.handleDropdownSelection.bind(this);
        this.handleMenuNavigation = this.handleMenuNavigation.bind(this);

        this.handleTileMouseInteraction = this.handleTileMouseInteraction.bind(this);
        this.handleTimeSerieDeselection = this.handleTimeSerieDeselection.bind(this);

        this.updateClientWindowDimensions = this.updateClientWindowDimensions.bind(this);
        this.heatMapContainerElement = React.createRef();
    }

    componentDidMount() {

        window.addEventListener('resize', this.updateClientWindowDimensions);
    }

    componentWillUnmount() {

        window.removeEventListener('resize', this.updateClientWindowDimensions);
    }

    componentDidUpdate(prevProps, prevState, prevContext) {

        const { onError } = this.props;

        const {
            [localConstants._TYPE_N_MEASUREMENTS]: nMeasurements,
            [localConstants._TYPE_FIRST_INTERVAL]: firstInterval,
            [localConstants._TYPE_LAST_INTERVAL]: lastInterval,
        } = this.props.dataset;

        const {
            [localConstants._TYPE_FIRST_INTERVAL]: prevFirstInterval,
            [localConstants._TYPE_LAST_INTERVAL]: prevLastInterval,
        } = prevProps.dataset;

        const {
            [localConstants._TYPE_SELECTED_DATABASE]: database,
            [localConstants._TYPE_SELECTED_POLICY]: policy,
            [localConstants._TYPE_SELECTED_START_INTERVAL]: startInterval,
            [localConstants._TYPE_SELECTED_END_INTERVAL]: endInterval,
        } = this.props.configuration;

        const {
            [localConstants._TYPE_SELECTED_DATABASE]: prevDatabase,
            [localConstants._TYPE_SELECTED_POLICY]: prevPolicy,
            [localConstants._TYPE_SELECTED_START_INTERVAL]: prevStartInterval,
            [localConstants._TYPE_SELECTED_END_INTERVAL]: prevEndInterval,
        } = prevProps.configuration;

        const {
            [localConstants._TYPE_SELECTED_HEATMAP_TYPE]: heatMapType,
            [localConstants._TYPE_SELECTED_FIELD]: field,
            [localConstants._TYPE_SELECTED_HEATMAP_ZOOM]: heatMapZoom,
        } = this.props.heatMapConfiguration;

        const {
            [localConstants._TYPE_SELECTED_HEATMAP_TYPE]: prevHeatMapType,
            [localConstants._TYPE_SELECTED_FIELD]: prevField,
            [localConstants._TYPE_SELECTED_HEATMAP_ZOOM]: prevHeatMapZoom,
        } = prevProps.heatMapConfiguration;

        const { clientWindowWidth: width, clientWindowsHeight: height } = this.state;
        const { clientWindowsHeight: prevWidth, clientWindowsHeight: prevHeight } = prevState;

        const { tileIdCurrentInterval, tileIdCurrentMachineIndex } = this.state.navigation;
        const {
            tileIdCurrentInterval: prevTileIdCurrentInterval,
            tileIdCurrentMachineIndex: prevTileIdCurrentMachineIndex
        } = prevState.navigation;

        //the configuration fetched from props is changed or a different heatmap configuration is triggered
        if (database && policy && startInterval && endInterval &&
            heatMapType && field && heatMapZoom && nMeasurements > 0 && firstInterval && lastInterval &&
            (
                database !== prevDatabase ||                                //configuration change
                policy !== prevPolicy ||
                firstInterval !== prevFirstInterval ||
                lastInterval !== prevLastInterval ||
                startInterval !== prevStartInterval ||
                endInterval !== prevEndInterval ||
                heatMapType !== prevHeatMapType ||                          //dropdown selection change
                field !== prevField ||
                heatMapZoom !== prevHeatMapZoom
            )) {

            //init the tiles according to configuration fetched from props and heatmap menu selection
            const xIDstart = convertTimestampToID(firstInterval, startInterval, 300);
            const xIDend = convertTimestampToID(firstInterval, endInterval, 300);

            const yIDend = Math.floor(nMeasurements / config.TILE_SIZE);

            this.computeHeatMapTiles({      //TODO change baseURI with selected field (when the tile generation is ok)
                baseURI: `${TILES_URL}/${database}/${policy}/${heatMapType}/mean_cpu_usage_rate`,  //${field}
                zoom: heatMapZoom,
                startX: xIDstart,               //ids timestamps
                currentX: xIDstart,
                endX: xIDend,
                startY: 0,                      //ids timeseries indexes
                currentY: 0,
                endY: yIDend,
            });
        }

        //the window has been resized
        let resized = false;
        // if (prevWidth !== width || prevHeight !== height) {
        //
        //     //window resized
        //     const resizeDiff = Math.abs((width - prevWidth));
        //     if (resizeDiff >= config.TILE_SIZE) resized = true;
        // }

        //user has triggered the heatmap navigation
        if (tileIdCurrentInterval !== null && tileIdCurrentMachineIndex !== null &&
            (resized || tileIdCurrentInterval !== prevTileIdCurrentInterval ||
            tileIdCurrentMachineIndex !== prevTileIdCurrentMachineIndex)) {

            //compute tiles according to heatmap navigation changes or window resizing
            this.computeHeatMapTiles({
                baseURI: `${TILES_URL}/${database}/${policy}/${heatMapType}/mean_cpu_usage_rate`,  //${field}
                zoom: heatMapZoom,
                currentX: tileIdCurrentInterval,
                currentY: tileIdCurrentMachineIndex,
            });
        }
    }

    computeHeatMapTiles({
        baseURI, zoom,
        startX = null, currentX, endX = null,
        startTs = null, currentTs, endTs = null,
        startY = null, currentY, endY = null,
    }) {

        const { clientWindowWidth, clientWindowsHeight } = this.state;

        //compute the number of tiles according to window size
        //we "virtually" remove a tile to fill the gap of left/right navigators and bootstrap panel
        const nHorizontalTiles = Math.floor((clientWindowWidth) / (config.TILE_SIZE)) - 1;

        //computes tiles URLs
        let tileRows = [];

        let timestampID = currentX;
        for (let i = 0; i < nHorizontalTiles; ++i) {

            let cols = [];

            let machineIndexID = currentY;
            for (let j = 0; j < _FIXED_TILES_HEIGHT; ++j) {

                //URI + zoom level (z) + timestamp (x) + machine index (y)
                cols.push(
                    `${baseURI}/` +
                    `${zoom}/` +
                    `${timestampID}/` +
                    `${machineIndexID}/` +
                    `tile.png`);

                ++machineIndexID;
            }

            tileRows.push(cols);
            ++timestampID;
        }

        //compute heatmap timeline
        const { startInterval } = this.props.configuration;

        //start timestamp + start timeserie index of the current heatmap view
        const [startTimestamp, startTimeserieIndex] = convertTileCoordinates({
            genesis: startInterval,
            tileIds: [currentX, currentY],
            tileCoords: [0,0],
            zoom: zoom,
        });

        //end timestamp + end timeserie index of the current heatmap view
        let [endTimestamp, endTimeserieIndex] = convertTileCoordinates({
            genesis: startInterval,
            tileIds: [currentX + nHorizontalTiles - 1, currentY],
            tileCoords: [config.TILE_SIZE, config.TILE_SIZE],
            zoom: zoom,
        });

        // endTimeserieIndex = endTimeserieIndex * (_FIXED_TILES_HEIGHT);

        const {
            tileIdStartInterval, tileIdEndInterval,
            tileIdStartMachineIndex, tileIdEndMachineIndex
        } = this.state.navigation;

        this.setState({

            navigation: {
                ...this.state.navigation,

                nHorizontalTiles: nHorizontalTiles,

                tileIdStartInterval: startX !== null ? startX : tileIdStartInterval,
                tileIdCurrentInterval: currentX,
                tileIdEndInterval: endX !== null ? endX : tileIdEndInterval,

                timelineStartTimestamp: startTimestamp,
                timelineEndTimestamp: endTimestamp,
                //timelineStartTimeserieIndex: startTimeserieIndex,
                //timelineEndTimeserieIndex: endTimeserieIndex - 1,

                tileIdStartMachineIndex: startY !== null ? startY : tileIdStartMachineIndex,
                tileIdCurrentMachineIndex: currentY,
                tileIdEndMachineIndex: endY !== null ? endY : tileIdEndMachineIndex,

                tileRowsURLs: tileRows,
            },
        });
    }

    updateClientWindowDimensions() {

        this.setState({
            clientWindowWidth: window.innerWidth,
            clientWindowsHeight: window.innerHeight
        });
    }

    handleDropdownSelection({value, type}) {

        this.setState({
            configuration: {
                ...this.state.configuration,
                [type]: value,
            },
        });
    }

    handleMenuNavigation({type}) {

        const {
            nHorizontalTiles,
            tileIdStartInterval,
            tileIdCurrentInterval,
            tileIdEndInterval,
            tileIdStartMachineIndex,
            tileIdCurrentMachineIndex,
            tileIdEndMachineIndex,
        } = this.state.navigation;

        let value, result;

        switch (type) {

            case _MENU_NAVIGATION._UP:

                value = tileIdCurrentMachineIndex - 1;
                result = (value < 0 || value < tileIdStartMachineIndex) ? tileIdStartMachineIndex : value;

                this.setState({
                    navigation: {
                        ...this.state.navigation,
                        tileIdCurrentMachineIndex: result,
                    }
                });

                break;

            case _MENU_NAVIGATION._RIGHT:

                value = tileIdCurrentInterval + nHorizontalTiles + 1;
                result = value > tileIdEndInterval ? tileIdCurrentInterval : (tileIdCurrentInterval + 1);

                this.setState({
                    navigation: {
                        ...this.state.navigation,
                        tileIdCurrentInterval: result,
                    }
                });

                break;

            case _MENU_NAVIGATION._DOWN:

                value = tileIdCurrentMachineIndex + _FIXED_TILES_HEIGHT;
                result = value > tileIdEndMachineIndex ? tileIdCurrentMachineIndex : (tileIdCurrentMachineIndex + 1);

                this.setState({
                    navigation: {
                        ...this.state.navigation,
                        tileIdCurrentMachineIndex: result,
                    }
                });

                break;

            case _MENU_NAVIGATION._LEFT:

                value = tileIdCurrentInterval - 1;
                result = (value < 0 || value < tileIdStartInterval) ? tileIdStartInterval : value;

                this.setState({
                    navigation: {
                        ...this.state.navigation,
                        tileIdCurrentInterval: result,
                    }
                });

                break;
        }
    }

    handleTileMouseInteraction({
        coordinates: {tileX, tileY, imgX, imgY} = {},
        zoomTick = null,
        type,
    }) {

        const { setItem } = this.props;
        const { startInterval } = this.props.configuration;

        const {
            [localConstants._TYPE_HEATMAP_ZOOMS]: zooms,
        } = this.props.dataset;

        const { handleTimeSerieSelection } = this.props;
        const {
            [localConstants._TYPE_SELECTED_HEATMAP_TYPE]: selectedHeatMapType,
            [localConstants._TYPE_SELECTED_FIELD]: selectedField,
            [localConstants._TYPE_SELECTED_HEATMAP_ZOOM]: selectedZoom,
        } = this.props.heatMapConfiguration;

        if (type === localConstants._TYPE_MOUSE_WHEEL) {

            let oldZoomIdx = zooms.indexOf(selectedZoom);
            let newZoomIdx;

            //out
            if (zoomTick > 0 && oldZoomIdx > 0) newZoomIdx = --oldZoomIdx;
            else if (zoomTick < 0 && oldZoomIdx < zooms.length - 1) newZoomIdx = ++oldZoomIdx;
            else return;

            setItem({
                groupType: localConstants._TYPE_GROUP_HEATMAP,
                item: zooms[newZoomIdx],
                type: [localConstants._TYPE_SELECTED_HEATMAP_ZOOM],
            });
        }
        else if (type === localConstants._TYPE_MOUSE_HOOVER) {

            const [ timestamp, timeSerieIdx ] = convertTileCoordinates({
                genesis: startInterval,
                tileIds: [tileX, tileY],
                tileCoords: [imgX, imgY],
                zoom: selectedZoom,
            });

            this.setState({
                selection: {
                    ...this.state.selection,
                    timestamp: timestamp,
                    timeserieIdx: timeSerieIdx,
                }
            });
        }
        else if (type === localConstants._TYPE_MOUSE_CLICK) {

            const [ timestamp, timeSerieIdx ] = convertTileCoordinates({
                genesis: startInterval,
                tileIds: [tileX, tileY],
                tileCoords: [imgX, imgY],
                zoom: selectedZoom,
            });

            //send back the selection
            handleTimeSerieSelection({
                timeSerieIdx: timeSerieIdx,
                timestamp: timestamp,
                heatMapType: selectedHeatMapType,
                fields: [selectedField, 'n_jobs', 'n_tasks'], //TODO make other fields selectable
                zoom: selectedZoom,
                actionType: 'selection',
            });
        }
    }

    handleTimeSerieDeselection(timeserieIdx) {

        this.props.handleTimeSerieSelection({timeSerieIdx: timeserieIdx, actionType: 'deselection'});
    }

    render() {

        const { disabled, timeSeries } = this.props;
        const { isLoading } = this.state;

        const {
            [localConstants._TYPE_HEATMAP_TYPES]: heatMapTypes,
            [localConstants._TYPE_FIELDS]: fields,
        } = this.props.dataset;

        const {
            [localConstants._TYPE_SELECTED_HEATMAP_TYPE]: heatMapType,
            [localConstants._TYPE_SELECTED_FIELD]: field,
        } = this.props.heatMapConfiguration;

        const {
            tileIdCurrentInterval,
            tileIdCurrentMachineIndex,
            tileRowsURLs,
            timelineStartTimestamp,
            timelineEndTimestamp,
            timelineStartTimeserieIndex,
            timelineEndTimeserieIndex,
        } = this.state.navigation;

        const { timestamp, timeserieIdx } = this.state.selection;

        if (disabled) return null;

        return (

            <Panel bsStyle="primary" defaultExpanded>
                <Panel.Heading>
                    <Panel.Title toggle>
                        Heat Map
                    </Panel.Title>
                </Panel.Heading>
                <Panel.Collapse>
                    <Panel.Body>
                        <div className="main-container">
                            <div className="heatmap-menu-container">
                                <Form>
                                    <Col xs={12} sm={6} md={3}>
                                        <DropdownClassic
                                            label="Heat Map Type"
                                            id="heatmap-types-dropdown"
                                            placeholder="select heatmap type.."
                                            loading={isLoading}
                                            data={heatMapTypes}
                                            value={heatMapType}
                                            type={localConstants._TYPE_SELECTED_HEATMAP_TYPE}
                                            onChange={this.handleDropdownSelection}
                                            disabled={false}/>
                                    </Col>
                                    <Col xs={12} sm={6} md={3}>
                                        <DropdownClassic
                                            label="Field"
                                            id="fields-dropdown"
                                            placeholder="select field.."
                                            loading={isLoading}
                                            data={fields}
                                            value={field}
                                            type={localConstants._TYPE_SELECTED_FIELD}
                                            onChange={this.handleDropdownSelection}
                                            disabled={false}/>
                                    </Col>
                                    <Col xs={12} sm={9} md={6}>
                                        <HeatMapSelectionBox
                                            label="Selection"
                                            timestamp={timestamp}
                                            machine={timeserieIdx}
                                        />
                                    </Col>
                                </Form>
                            </div>

                            <div className="heatmap-container">
                                <div className="wrapper">
                                    <div className="header">
                                        <button className="menu-area-clickable btn-up"
                                           onClick={() => this.handleMenuNavigation({type: _MENU_NAVIGATION._UP})}>
                                            <img id="arrow-up-svg" src={ArrowUpSvg}/>
                                        </button>
                                    </div>
                                    <div className="left-sidebar">
                                        <button className="menu-area-clickable btn-left"
                                            onClick={() => this.handleMenuNavigation({type: _MENU_NAVIGATION._LEFT})}>
                                            <img id="arrow-left-svg" src={ArrowLeftSvg}/>
                                        </button>
                                    </div>

                                    <div className="tiles-container-bordering">
                                        <div className="tiles-container" ref={this.heatMapContainerElement}>

                                            {
                                                tileRowsURLs.length > 0 &&

                                                tileRowsURLs.map((row, indexRow) => (
                                                    <div
                                                        style={{gridRow: `1 / span ${row.length}`}}
                                                        className="tiles-col"
                                                        key={`${indexRow}`}>

                                                        {
                                                            row.map((col, indexCol) => (

                                                                <Tile
                                                                    key={`${indexRow},${indexCol}`}
                                                                    tileID={[
                                                                        tileIdCurrentInterval + indexRow,
                                                                        tileIdCurrentMachineIndex + indexCol
                                                                    ]}
                                                                    tileURL={col}
                                                                    handleTileMouseInteraction={this.handleTileMouseInteraction}
                                                                />

                                                            ))
                                                        }
                                                    </div>
                                                ))
                                            }

                                            <div className="timeline-horizontal-overlay">
                                                <div className="timeline-horizontal-label timeline-top-left-label">
                                                    <svg height="15" width="5">
                                                        <line x1="0" y1="0" x2="0" y2="13"/>
                                                    </svg>
                                                    <p>{timelineStartTimestamp && timelineStartTimestamp}</p>
                                                </div>
                                                <div className="timeline-horizontal-label timeline-top-right-label">
                                                    <svg height="15" width="5">
                                                        <line x1="5" y1="0" x2="5" y2="13"/>
                                                    </svg>
                                                    <p>{timelineEndTimestamp && timelineEndTimestamp}</p>
                                                </div>
                                            </div>

                                        </div>
                                    </div>

                                    <div className="right-sidebar">
                                        <button className="menu-area-clickable btn-right"
                                           onClick={() => this.handleMenuNavigation({type: _MENU_NAVIGATION._RIGHT})}>
                                            <img id="arrow-right-svg" src={ArrowRightSvg}/>
                                        </button>
                                    </div>
                                    <div className="footer">
                                        <button className="menu-area-clickable btn-down"
                                           onClick={() => this.handleMenuNavigation({type: _MENU_NAVIGATION._DOWN})}>
                                            <img id="arrow-down-svg" src={ArrowDownSvg}/>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="timeserie-closable-area">
                            {
                                timeSeries &&
                                Object.keys(timeSeries).map((k, idx) => (
                                    <div className="timeserie-closable-box" key={idx}>
                                        <div className="timeserie-closable-icon">
                                            <button onClick={() => this.handleTimeSerieDeselection(k)}>
                                                <X size={15}/>
                                            </button>
                                        </div>
                                        <div className="timeserie-closable-content">
                                            <p>{timeSeries[k].name}</p>
                                        </div>
                                    </div>
                                ))
                            }
                            </div>

                        </div>
                    </Panel.Body>
                </Panel.Collapse>
            </Panel>
        );
    }
}