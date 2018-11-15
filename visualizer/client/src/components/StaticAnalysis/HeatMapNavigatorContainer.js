import React, { Component } from 'react';
import { config, TILES_URL } from '../../config/config';

import * as localConstants from '../../utils/constants';

import { Panel, Row, Col, Form } from 'react-bootstrap';
import 'react-widgets/dist/css/react-widgets.css';

import { X } from 'react-feather';

const chroma = require('chroma-js');

import './HeatMapNavigatorContainer.css';

import { TimeLine } from './TimeLine';

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

const convertTimestampToID = (genesis, current, period = 300, zoom) => {

    //TODO need to be re-thinked, strange behaviour when used to compute the id end of interval
    //TODO probably something wrong in the time interval computation, consider to use the last interval data

    let start = Date.parse(genesis);    //converts to unix epoch time (ms)
    let end = Date.parse(current);

    let interval = period * 1000 * config.TILE_SIZE;
    if (zoom < 0) interval *= Math.abs(zoom);
    if (zoom > 0) interval /= Math.abs(zoom);

    return Math.floor((end - start) / interval);
};

const convertMeasurementIdxToID = (value, zoom) => {

    let interval = config.TILE_SIZE;
    if (zoom < 0) interval *= Math.abs(zoom);
    if (zoom > 0) interval /= Math.abs(zoom);

    return Math.floor(value / interval);
};

const getTilePointCoordinates = (
    tileStartTimestamp,
    tileStartTimeSerieIdx,
    timestamp,
    timeSerieIdx,
    period = 300,
    zoom) => {

    let start = Date.parse(tileStartTimestamp); //unix epoch in ms
    let end = Date.parse(timestamp);

    let timeInterval = period * 1000;   //period is in sec
    let idxInterval = 1;

    if (zoom < 0) {
        timeInterval *= Math.abs(zoom);
        idxInterval *= Math.abs(zoom);
    }
    if (zoom > 0) {
        timeInterval /= Math.abs(zoom);
        idxInterval /= Math.abs(zoom);
    }

    return [
        Math.floor((end - start) / timeInterval),
        Math.floor((timeSerieIdx - tileStartTimeSerieIdx) / idxInterval)
    ];
};

const convertTileCoordinates = ({ genesis, tileIds, tileCoords, zoom, period = 300 }) => {

    const [tileIdX, tileIdY] = tileIds;             //heatmap ids associated to the tile
    const [tileCoordX, tileCoordY] = tileCoords;    //coordinates of the point within the tile

    let timestamp = new Date(genesis);
    let tileInterval = period * config.TILE_SIZE;
    let pixelInterval = period * tileCoordX;

    let timeserieIdx = (config.TILE_SIZE * tileIdY) + tileCoordY;

    if (zoom > 0) {
        tileInterval /= Math.abs(zoom);
        timeserieIdx = Math.floor(timeserieIdx / Math.abs(zoom));
        pixelInterval /= Math.abs(zoom);
    }
    if (zoom < 0) {
        tileInterval *= Math.abs(zoom);
        timeserieIdx = Math.floor(timeserieIdx * Math.abs(zoom));
        pixelInterval *= Math.abs(zoom);
    }

    timestamp.setSeconds(
        timestamp.getSeconds() +        //get the genesis timestamp
        (tileInterval * tileIdX) +      //get the start timestamp of the tile identified by the ID
        pixelInterval                   //get the timestamp associated with the pixel within the tile
    );

    return [timestamp.toISOString(), `${timeserieIdx}`];
};

const computeTimelineData = (startTimestamp, endTimestamp, period, zoom) => {

    let start = Date.parse(startTimestamp); //unix epoch time
    let end = Date.parse(endTimestamp);

    let tileInterval = period * 1000 * config.TILE_SIZE;    //s => ms
    if (zoom > 0) tileInterval /= Math.abs(zoom);
    if (zoom < 0) tileInterval *= Math.abs(zoom);

    let timestamps = [];

    while (start < end) {
        timestamps.push(new Date(start));
        start += tileInterval;
    }
    timestamps.push(new Date(end));

    return timestamps.map(e => e.toISOString());
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

                timelineData: null,

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

        const { clientWindowWidth, clientWindowsHeight } = this.state;
        const {
            clientWindowsHeight: prevClientWindowWidth,
            clientWindowsHeight: prevClientWindowsHeight
        } = prevState;

        const { tileIdCurrentInterval, tileIdCurrentMachineIndex } = this.state.navigation;

        const {
            tileIdCurrentInterval: prevTileIdCurrentInterval,
            tileIdCurrentMachineIndex: prevTileIdCurrentMachineIndex
        } = prevState.navigation;

        //the configuration fetched from props is changed or a different heatmap configuration is triggered
        if (database && policy && startInterval && endInterval &&
            heatMapType && field && nMeasurements > 0 && firstInterval && lastInterval &&
            heatMapZoom !== null && heatMapZoom !== undefined &&
            (
                database !== prevDatabase                               //configuration change
                || policy !== prevPolicy
                || firstInterval !== prevFirstInterval
                || lastInterval !== prevLastInterval
                || startInterval !== prevStartInterval
                || endInterval !== prevEndInterval
                || heatMapType !== prevHeatMapType                      //dropdown selection change
                || field !== prevField
            )) {

            this.computeHeatMapTiles({      //TODO change baseURI with selected field (when the tile generation is ok)
                baseURI: `${TILES_URL}/${database}/${policy}/${heatMapType}/mean_cpu_usage_rate`,  //${field}
                zoom: heatMapZoom,
                isUpdate: false,
            });
        }

        //guard
        if (tileIdCurrentInterval === null || tileIdCurrentMachineIndex === null) return;

        //user has triggered the heatmap navigation, resizing or zooming
        if (heatMapZoom !== null && heatMapZoom !== undefined &&
            heatMapZoom !== prevHeatMapZoom ||
            tileIdCurrentInterval !== prevTileIdCurrentInterval ||
            tileIdCurrentMachineIndex !== prevTileIdCurrentMachineIndex) {

            //note: start/end ids (both interval and machineIdx) are already updated here
            //e.g. in case of zooming the logic of mouse wheel will update them according to the new zoom and
            //heatmap is re-computed with the zoomed tile in top-left corner
            this.computeHeatMapTiles({
                baseURI: `${TILES_URL}/${database}/${policy}/${heatMapType}/mean_cpu_usage_rate`,  //${field}
                zoom: heatMapZoom,
                isUpdate: true,
            });
        }
    }

    computeHeatMapTiles({ baseURI, zoom, isUpdate }) {

        const {
            [localConstants._TYPE_N_MEASUREMENTS]: nMeasurements,
            [localConstants._TYPE_FIRST_INTERVAL]: firstInterval,
        } = this.props.dataset;

        const {
            [localConstants._TYPE_SELECTED_START_INTERVAL]: startInterval,
            [localConstants._TYPE_SELECTED_END_INTERVAL]: endInterval,
        } = this.props.configuration;

        const {
            tileIdCurrentInterval,
            tileIdCurrentMachineIndex,
        } = this.state.navigation;

        /* COMPUTE NR. TILES ACCORDING TO CLIENT WINDOW */
        const { clientWindowWidth, clientWindowsHeight } = this.state;

        //compute the number of tiles according to window size
        //we "virtually" remove a tile to fill the gap of left/right navigators and bootstrap panel
        const nHorizontalTiles = Math.floor((clientWindowWidth) / (config.TILE_SIZE)) - 1;

        /* TILES IDs INTERVALS (BOUNDARIES ACCORDING TO CURRENT ZOOM */
        const xIDstart = convertTimestampToID(firstInterval, startInterval, 300, zoom);
        const xIDend = convertTimestampToID(firstInterval, endInterval, 300, zoom);

        const yIDstart = 0;
        const yIDend = convertMeasurementIdxToID(nMeasurements, zoom);

        //current view (top-left corner)
        let xIDcurrent = tileIdCurrentInterval;
        let yIDcurrent = tileIdCurrentMachineIndex;

        //when the heatmap is built for the first time, the top-left corner starts from tile (0,0)
        if (!isUpdate) {
            xIDcurrent = xIDstart;
            yIDcurrent = yIDstart;
        }

        /* COMPUTE TILES URLS */
        let tileRows = [];

        let timestampID = xIDcurrent;
        for (let i = 0; i < nHorizontalTiles; ++i) {

            let cols = [];

            let machineIndexID = yIDcurrent;
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

        /* COMPUTE THE TIMELINE */

        //start timestamp + start timeserie index of the current heatmap view
        const [startTimestamp, startTimeserieIndex] = convertTileCoordinates({
            genesis: startInterval,
            tileIds: [xIDcurrent, yIDcurrent],
            tileCoords: [0,0],
            zoom: zoom,
        });

        //end timestamp + end timeserie index of the current heatmap view
        let [endTimestamp, endTimeserieIndex] = convertTileCoordinates({
            genesis: startInterval,
            tileIds: [xIDcurrent + nHorizontalTiles - 1, yIDcurrent],
            tileCoords: [config.TILE_SIZE, config.TILE_SIZE],
            zoom: zoom,
        });

        const timelineData = computeTimelineData(startTimestamp, endTimestamp, 300, zoom);

        this.setState({

            navigation: {
                ...this.state.navigation,

                nHorizontalTiles: nHorizontalTiles,

                tileIdStartInterval: xIDstart,
                tileIdCurrentInterval: xIDcurrent,
                tileIdEndInterval: xIDend,

                tileIdStartMachineIndex: yIDstart,
                tileIdCurrentMachineIndex: yIDcurrent,
                tileIdEndMachineIndex: yIDend,

                timelineStartTimestamp: startTimestamp,
                timelineEndTimestamp: endTimestamp,
                //timelineStartTimeserieIndex: startTimeserieIndex, //TODO may be useful when limiting the vertical sel.
                //timelineEndTimeserieIndex: endTimeserieIndex - 1,

                timelineData: timelineData,

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
                result = (value < 0) ? tileIdStartMachineIndex : value;

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
        const { [localConstants._TYPE_HEATMAP_ZOOMS]: zooms } = this.props.dataset;
        const { handleTimeSerieSelection } = this.props;

        const {
            [localConstants._TYPE_SELECTED_HEATMAP_TYPE]: selectedHeatMapType,
            [localConstants._TYPE_SELECTED_FIELD]: selectedField,
            [localConstants._TYPE_SELECTED_HEATMAP_ZOOM]: selectedZoom,
        } = this.props.heatMapConfiguration;

        //
        const [ tileTimestamp, timeSerieIdx ] = convertTileCoordinates({
            genesis: startInterval,
            tileIds: [tileX, tileY],
            tileCoords: [imgX, imgY],
            zoom: selectedZoom,
        });

        if (type === localConstants._TYPE_MOUSE_WHEEL) {

            let oldZoomIdx = zooms.indexOf(selectedZoom);
            let newZoomIdx = oldZoomIdx;

            //out
            if (zoomTick > 0 && oldZoomIdx > 0) --newZoomIdx;
            else if (zoomTick < 0 && oldZoomIdx < zooms.length - 1) ++newZoomIdx;
            else return;

            //zoomed tile coordinates
            //we will put the next zoom level tiles in the top-left corner of the heatmap
            let xIDcurrent = tileX;
            let yIDcurrent = tileY;

            if (newZoomIdx < oldZoomIdx) { //we have a zoom out or we are at max out zoom
                xIDcurrent = Math.floor(tileX / 2);
                yIDcurrent = Math.floor(tileY / 2);
            }
            else if (newZoomIdx > oldZoomIdx) {
                xIDcurrent *= 2;
                yIDcurrent *= 2;
            }

            //change the zoom level
            setItem({
                groupType: localConstants._TYPE_GROUP_HEATMAP,
                item: zooms[newZoomIdx],
                type: [localConstants._TYPE_SELECTED_HEATMAP_ZOOM],
            });

            //update the heatmap, focusing on the zoomed tile
            //the tiles fetched for the next/previous zoom level will be placed starting on top-left corner
            this.setState({
                navigation: {
                    ...this.state.navigation,

                    tileIdCurrentInterval: xIDcurrent,
                    tileIdCurrentMachineIndex: yIDcurrent,
                }
            });
        }
        else if (type === localConstants._TYPE_MOUSE_HOOVER) {

            this.setState({
                selection: {
                    ...this.state.selection,
                    timestamp: tileTimestamp,
                    timeserieIdx: timeSerieIdx,
                }
            });
        }
        else if (type === localConstants._TYPE_MOUSE_CLICK) {

            //send back the selection
            handleTimeSerieSelection({
                timeSerieIdx: timeSerieIdx,
                timestamp: tileTimestamp,
                heatMapType: selectedHeatMapType,
                fields: [selectedField, 'n_jobs', 'n_tasks'], //TODO make other fields selectable
                zoom: selectedZoom,
                tileIds: [tileX, tileY],
                pointCoords: [imgX, imgY],
                actionType: 'selection',
            });
        }
    }

    handleTimeSerieDeselection(timeserieIdx) {

        this.props.handleTimeSerieSelection({timeSerieIdx: timeserieIdx, actionType: 'deselection'});
    }

    renderHighlights() {

        const { timeSeries } = this.props;
        const { [localConstants._TYPE_FIRST_INTERVAL]: firstInterval } = this.props.dataset;
        const { [localConstants._TYPE_SELECTED_START_INTERVAL]: startInterval } = this.props.configuration;
        const { [localConstants._TYPE_SELECTED_HEATMAP_ZOOM]: selectedHeatMapZoom } = this.props.heatMapConfiguration;

        const { nHorizontalTiles, tileIdCurrentInterval, tileIdCurrentMachineIndex } = this.state.navigation;

        let data = [];

        for (let i = 0; i < Object.keys(timeSeries).length; ++i) {
            if (timeSeries.hasOwnProperty(Object.keys(timeSeries)[i])) {

                const selection = timeSeries[Object.keys(timeSeries)[i]].selection;

                //compute or re-compute highlight lines (vertical + horizontal) according to current zoom level

                //get new tile ids according with the new zoom
                const newTileIdX = convertTimestampToID(firstInterval, selection.timestamp, 300, selectedHeatMapZoom);
                const newTileIdY = convertMeasurementIdxToID(selection.timeSerieIdx, selectedHeatMapZoom);

                //get start timestamp and start timeserie idx of new tile
                const [startTimestamp, startTimeserieIdx] = convertTileCoordinates({
                    genesis: startInterval,
                    tileIds: [newTileIdX, newTileIdY],
                    tileCoords: [0,0],
                    zoom: selectedHeatMapZoom,
                });

                //get new point coords within the tile
                const [newPosX, newPosY] = getTilePointCoordinates(
                    startTimestamp,
                    startTimeserieIdx,
                    selection.timestamp,
                    selection.timeSerieIdx,
                    300,
                    selectedHeatMapZoom
                );

                const coords = {x: null, y: null};

                //check if the VERTICAL line is in the current heatmap view (using tile ids)
                if (newTileIdX >= tileIdCurrentInterval || newTileIdX < tileIdCurrentInterval + nHorizontalTiles) {

                    coords.x =
                        (newTileIdX - tileIdCurrentInterval) * config.TILE_SIZE       //x start coordinate of tile
                        + newPosX                                                     //x point coordinate within tile
                    ;
                }

                //check if the HORIZONTAL line is in the current heatmap view (using tile ids)
                if (newTileIdY >= tileIdCurrentMachineIndex ||
                    newTileIdY < tileIdCurrentMachineIndex + _FIXED_TILES_HEIGHT) {

                    coords.y =
                        (newTileIdY - tileIdCurrentMachineIndex) * config.TILE_SIZE   //y start coordinate of tile
                        + newPosY                                                     //y point coordinate within tile
                    ;
                }

                data.push(coords);
            }
        }

        //assign colors to lines
        const colors = chroma
            .scale(['orange', 'red', 'black'])   //TODO make configurable externally
            .mode('lch')
            .colors(data.length);

        //generate svg paths (horizontal + vertical lines)
        //https://css-tricks.com/svg-path-syntax-illustrated-guide/
        let paths = [];
        data.forEach((k,idx) => {

            if (k.x)
                paths.push(
                    <path
                        key={`vert_${k.x}`}
                        d={`M ${k.x},0 V ${_FIXED_TILES_HEIGHT * config.TILE_SIZE}`}
                        stroke={colors[idx]}
                    />
                );

            if (k.y)
                paths.push(
                    <path
                        key={`horiz_${k.y}`}
                        d={`M 0,${k.y} H ${nHorizontalTiles * config.TILE_SIZE}`}
                        stroke={colors[idx]}
                    />
                );
        });

        return paths;
    }

    render() {

        console.log(this.state)
        console.log(this.props)

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
            nHorizontalTiles,
            tileIdCurrentInterval,
            tileIdCurrentMachineIndex,
            tileRowsURLs,
            timelineData,
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

                                            <div className="timeline-overlay">
                                                <svg
                                                    height={config.TILE_SIZE * _FIXED_TILES_HEIGHT}
                                                    width={config.TILE_SIZE * nHorizontalTiles}
                                                >

                                                    {
                                                        timeSeries &&
                                                        this.renderHighlights().map((k) => k)
                                                    }

                                                </svg>
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
                                    <div className="timeline">

                                        {
                                            timelineData &&

                                            <TimeLine
                                                width={nHorizontalTiles * config.TILE_SIZE}
                                                nTiles={nHorizontalTiles}
                                                data={timelineData}
                                            />
                                        }

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
                                            <p>{timeSeries[k].name} ({k})</p>
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