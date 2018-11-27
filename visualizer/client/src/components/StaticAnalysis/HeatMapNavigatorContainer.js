//HeatMap Requirements:
//Tiles are 256 × 256 pixel PNG files
//Each zoom level is a directory, each column is a subdirectory, and each tile in that column is a file
//Filename(url) format is /zoom/x/y.png

import React, { Component } from 'react';
import { config, TILES_URL, FAKE_TILE_URL } from '../../config/config';

import * as localConstants from '../../utils/constants';
import * as globals from '../../utils/globals';

import {default as PigeonMap} from 'pigeon-maps';
import Marker from 'pigeon-marker';
import Overlay from 'pigeon-overlay';

import { Panel, Row, Col, Form } from 'react-bootstrap';
import 'react-widgets/dist/css/react-widgets.css';

import { X } from 'react-feather';

import './HeatMapNavigatorContainer.css';

import { TimeLine } from './TimeLine';

import { HeatMapSelectionBox } from './HeatMapSelectionBox';

import ArrowUpSvg from '../../../public/images/arrow-up.svg';
import ArrowRightSvg from '../../../public/images/arrow-right.svg';
import ArrowDownSvg from '../../../public/images/arrow-down.svg';
import ArrowLeftSvg from '../../../public/images/arrow-left.svg';
import Tile from "./Tile.js";

const _FIXED_N_TILES = 2;
const _FIXED_TILES_WIDTH = 2;
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

/* TILE's Conversion Functions */
//https://gis.stackexchange.com/questions/133205/wmts-convert-geolocation-lat-long-to-tile-index-at-a-given-zoom-level
//https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames

const long2tile = (lon,zoom) => {
    return ((lon+180)/360*Math.pow(2,zoom));
};

const lat2tile = (lat,zoom) => {
    return ((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom));
};

const tile2long = (x,z) => {
    return (x/Math.pow(2,z)*360-180);
};

const tile2lat = (y,z) => {
    const n = Math.PI-2*Math.PI*y/Math.pow(2,z);
    return (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
};

//https://help.openstreetmap.org/questions/747/given-a-latlon-how-do-i-find-the-precise-position-on-the-tile
//When you calulate the tile number according to the wiki you will actually get a floating point number.
//The integer part indicates which tile you are (or should be) looking at.
//The fractional part indicates the position within the tile. As a tile is 256 pixel wide,
//multiplying the fractional part with 256 will give you the pixel position from the top left.

//convert lon/lat/zoom to tile ids and internal (tile) pixels coords
const lonLat2TileIdsPixels = (lon, lat, zoom) => {

    const xRes = long2tile(lon, zoom);
    const yRes = lat2tile(lat, zoom);

    //integer part indicates tile's ids
    const xTileID = Math.trunc(xRes);
    const yTileID = Math.trunc(yRes);

    //fractional part indicates the position within the tile
    const xPoint = Math.floor((xRes % 1) * config.TILE_SIZE);
    const yPoint = Math.floor((yRes % 1) * config.TILE_SIZE);

    console.log(lon,lat)
    console.log(xRes, yRes)
    console.log(xTileID, yTileID)
    console.log(xPoint, yPoint)

    return {
        xTileID: xTileID,
        yTileID: yTileID,
        xPoint: xPoint,
        yPoint: yPoint,
    }
};

const mapOptions = {    //TODO fetch from config externally or from API

    minZoom: 1,
    center: [0,0],
    zoom: 1,
    defaultZoom: 1,
    bounds: null,
    initial: null,
};

export default class HeatMapNavigatorContainer extends Component {

    constructor() {
        super();

        this.state = {

            map: {
                ...mapOptions,
                zoomsMap: null,
                marksMap: null,
            },

            zooms: null,

            navigation: {   //(x,y)

                nHorizontalTiles: 0,

                //intervals ids
                tileIdStartInterval: null,
                tileIdCurrentInterval: null,
                tileIdEndInterval: null,

                //timeseries indexes ids
                tileIdStartMachineIndex: null,
                tileIdCurrentMachineIndex: null,
                tileIdEndMachineIndex: null,

                //timeline
                timelineStartTimestamp: null,
                timelineEndTimestamp: null,
                timelineStartTimeserieIndex: null,
                timelineEndTimeserieIndex: null,

                timelineData: null,

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

        this.fetchTileByTmsURL = this.fetchTileByTmsURL.bind(this);
        this.handleBoundsChange = this.handleBoundsChange.bind(this);
        this.handleClick = this.handleClick.bind(this);

        this.handleMarkerClick = this.handleMarkerClick.bind(this);
    }

    componentDidMount() {

        window.addEventListener('resize', this.updateClientWindowDimensions);
    }

    componentWillUnmount() {

        window.removeEventListener('resize', this.updateClientWindowDimensions);
    }

    componentDidUpdate(prevProps, prevState, prevContext) {

        const {
            [localConstants._TYPE_HEATMAP_ZOOMS]: zooms,
        } = this.props.dataset;

        const {
            [localConstants._TYPE_HEATMAP_ZOOMS]: prevZooms,
        } = prevProps.dataset;

        const {
            [localConstants._TYPE_SELECTED_DATABASE]: database,
            [localConstants._TYPE_SELECTED_POLICY]: policy,
            [localConstants._TYPE_SELECTED_START_INTERVAL]: startInterval,
            [localConstants._TYPE_SELECTED_END_INTERVAL]: endInterval,
            [localConstants._TYPE_SELECTED_HEATMAP_TYPE]: heatMapType,
            [localConstants._TYPE_SELECTED_FIELD]: field,
            [localConstants._TYPE_SELECTED_PERIOD]: period,
        } = this.props.configuration;

        const {
            [localConstants._TYPE_SELECTED_HEATMAP_ZOOM]: heatMapZoom,
        } = this.props.heatMapConfiguration;

        const {
            [localConstants._TYPE_SELECTED_HEATMAP_ZOOM]: prevHeatMapZoom,
        } = prevProps.heatMapConfiguration;

        const {
            tileIdCurrentInterval,
            tileIdCurrentMachineIndex
        } = this.state.navigation;

        const {
            tileIdCurrentInterval: prevTileIdCurrentInterval,
            tileIdCurrentMachineIndex: prevTileIdCurrentMachineIndex
        } = prevState.navigation;

        //guard
        if (!globals.checkValuesExistanceOfObject(this.props.dataset) ||
            !globals.checkValuesExistanceOfObject(this.props.configuration) ||
            !globals.checkValuesExistanceOfObject(this.props.heatMapConfiguration))
            return;

        //zooms mapping when the component is loaded and anytime the zoom list from props changes
        if (!this.state.map.zoomsMap || JSON.stringify(zooms) !== JSON.stringify(prevZooms)) {

            this.zoomsMapping();
        }

        // //guard
        // if (!this.state.map.zoomsMap) return;
        //
        // //the configuration fetched from props is changed or a different heatmap configuration is triggered
        // if (JSON.stringify(this.props.configuration) !== JSON.stringify(prevProps.configuration) ||
        //     heatMapZoom !== prevHeatMapZoom) {
        //
        //     this.computeHeatMapTiles({
        //         baseURI: `${TILES_URL}/${database}/${policy}/${heatMapType}/${field}`,
        //         zoom: heatMapZoom,
        //         isUpdate: false,
        //     });
        // }
        //
        // //guard
        // if (tileIdCurrentInterval === null || tileIdCurrentMachineIndex === null) return;
        //
        // //user has triggered the heatmap navigation, resizing or zooming
        // if (heatMapZoom !== null && heatMapZoom !== undefined &&
        //     heatMapZoom !== prevHeatMapZoom ||
        //     tileIdCurrentInterval !== prevTileIdCurrentInterval ||
        //     tileIdCurrentMachineIndex !== prevTileIdCurrentMachineIndex) {
        //
        //     //note: start/end ids (both interval and machineIdx) are already updated here
        //     //e.g. in case of zooming the logic of mouse wheel will update them according to the new zoom and
        //     //heatmap is re-computed with the zoomed tile in top-left corner
        //     this.computeHeatMapTiles({
        //         baseURI: `${TILES_URL}/${database}/${policy}/${heatMapType}/mean_cpu_usage_rate`,  //${field}
        //         zoom: heatMapZoom,
        //         isUpdate: true,
        //     });
        // }
    }

    // computeHeatMapTiles({ baseURI, zoom, isUpdate }) {
    //
    //     const {
    //         [localConstants._TYPE_FIRST_INTERVAL]: firstInterval,
    //         [localConstants._TYPE_LAST_INTERVAL]: lastInterval,
    //         [localConstants._TYPE_TIMESERIES_START_INDEX]: startIndex,
    //         [localConstants._TYPE_TIMESERIES_END_INDEX]: endIndex,
    //     } = this.props.dataset.heatMapBounds;
    //
    //     const {
    //         [localConstants._TYPE_SELECTED_START_INTERVAL]: startInterval,
    //         [localConstants._TYPE_SELECTED_END_INTERVAL]: endInterval,
    //     } = this.props.configuration;
    //
    //     const { tileIdCurrentInterval, tileIdCurrentMachineIndex } = this.state.navigation;
    //
    //     /* COMPUTE NR. TILES ACCORDING TO CLIENT WINDOW */
    //     const { clientWindowWidth, clientWindowsHeight } = this.state;
    //
    //     //compute the number of tiles according to window size
    //     //we "virtually" remove a tile to fill the gap of left/right navigators and bootstrap panel
    //     //const nHorizontalTiles = Math.floor((clientWindowWidth) / (config.TILE_SIZE)) - 1;
    //
    //     //get the tiles ids bounds for the current zoom
    //     const tileIdsBounds = this.getTileIdsBoundsByZoom(zoom);
    //
    //     //current view (top-left corner)
    //     //when the heatmap is built for the first time, the top-left corner starts from tile (0,0)
    //     let xIDcurrent = isUpdate ? tileIdCurrentInterval : tileIdsBounds.xIDStart;
    //     let yIDcurrent = isUpdate ? tileIdCurrentMachineIndex : tileIdsBounds.yIDStart;
    //
    //     /* COMPUTE TILES URLS */
    //     let tileRows = [];
    //
    //     let timestampID = xIDcurrent;
    //     for (let i = 0; i < _FIXED_TILES_WIDTH; ++i) {
    //
    //         let cols = [];
    //
    //         let timeserieIndexID = yIDcurrent;
    //         for (let j = 0; j < _FIXED_TILES_HEIGHT; ++j) {
    //
    //             //URI + zoom level (z) + timestamp (x) + machine index (y)
    //             const _URL =
    //                 `${baseURI}/` +
    //                 `${zoom}/` +
    //                 `${timestampID}/` +
    //                 `${timeserieIndexID}/` +
    //                 `tile.png`;
    //
    //             //check tiles ids bounds, if we are out of bounds a fake tile is fetched
    //             cols.push((this.boundsCheck(timestampID, timeserieIndexID, zoom)) ? _URL : FAKE_TILE_URL);
    //
    //             ++timeserieIndexID;
    //         }
    //
    //         tileRows.push(cols);
    //         ++timestampID;
    //     }
    //
    //     /* COMPUTE THE TIMELINE */
    //     //TODO revisiona usando i bounds fetchati nei props (dataset)
    //
    //     //start timestamp + start timeserie index of the current heatmap view
    //     const [startTimestamp, startTimeserieIndex] = convertTileCoordinates({
    //         genesis: startInterval,
    //         tileIds: [xIDcurrent, yIDcurrent],
    //         tileCoords: [0,0],
    //         zoom: zoom,
    //     });
    //
    //     //end timestamp + end timeserie index of the current heatmap view
    //     let [endTimestamp, endTimeserieIndex] = convertTileCoordinates({
    //         genesis: startInterval,
    //         tileIds: [xIDcurrent + _FIXED_TILES_WIDTH - 1, yIDcurrent],
    //         tileCoords: [config.TILE_SIZE, config.TILE_SIZE],
    //         zoom: zoom,
    //     });
    //
    //     const timelineData = computeTimelineData(startTimestamp, endTimestamp, 300, zoom);
    //
    //     this.setState({
    //
    //         navigation: {
    //             ...this.state.navigation,
    //
    //             nHorizontalTiles: _FIXED_TILES_WIDTH,
    //
    //             tileIdStartInterval: tileIdsBounds.xIDStart,
    //             tileIdCurrentInterval: xIDcurrent,
    //             tileIdEndInterval: tileIdsBounds.xIDEnd,
    //
    //             tileIdStartMachineIndex: tileIdsBounds.yIDStart,
    //             tileIdCurrentMachineIndex: yIDcurrent,
    //             tileIdEndMachineIndex: tileIdsBounds.yIDEnd,
    //
    //             timelineStartTimestamp: startTimestamp,
    //             timelineEndTimestamp: endTimestamp,
    //             //timelineStartTimeserieIndex: startTimeserieIndex, //TODO may be useful when limiting the vertical sel.
    //             //timelineEndTimeserieIndex: endTimeserieIndex - 1,
    //
    //             timelineData: timelineData,
    //
    //             tileRowsURLs: tileRows,
    //         },
    //     });
    // }

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

        const { setItem, handleTimeSerieSelection  } = this.props;

        const {
            [localConstants._TYPE_HEATMAP_ZOOMS]: zooms
        } = this.props.dataset;

        const {
            [localConstants._TYPE_SELECTED_START_INTERVAL]: startInterval,
            [localConstants._TYPE_SELECTED_HEATMAP_TYPE]: selectedHeatMapType,
            [localConstants._TYPE_SELECTED_FIELD]: selectedField,
        } = this.props.configuration;

        const {
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

        const { timeSeriesMap } = this.props;

        const {
            [localConstants._TYPE_FIRST_INTERVAL]: firstInterval
        } = this.props.dataset.heatMapBounds;

        const {
            [localConstants._TYPE_SELECTED_START_INTERVAL]: startInterval
        } = this.props.configuration;

        const {
            [localConstants._TYPE_SELECTED_HEATMAP_ZOOM]: selectedHeatMapZoom
        } = this.props.heatMapConfiguration;

        const {
            nHorizontalTiles,
            tileIdCurrentInterval,
            tileIdCurrentMachineIndex
        } = this.state.navigation;

        let paths = [];
        for (let [key, value] of timeSeriesMap) {

            const color = value.color;
            const selection = value.selection;

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

            //generate svg paths (horizontal + vertical lines)
            //https://css-tricks.com/svg-path-syntax-illustrated-guide/s
            if (coords.x)
                paths.push(
                    <path
                        key={`vert_${coords.x}`}
                        d={`M ${coords.x},0 V ${_FIXED_TILES_HEIGHT * config.TILE_SIZE}`}
                        stroke={color}
                    />
                );

            if (coords.y)
                paths.push(
                    <path
                        key={`horiz_${coords.y}`}
                        d={`M 0,${coords.y} H ${nHorizontalTiles * config.TILE_SIZE}`}
                        stroke={color}
                    />
                );
        }
        return paths;
    }

    zoomsMapping() {

        const { [localConstants._TYPE_HEATMAP_ZOOMS]: zooms } = this.props.dataset;
        const { minZoom } = this.state.map;

        //mapping zooms according to pigeon-maps lib zooming (TMS) scale: [1,2,...]
        //e.g. [1, 2, 3, 4, 5, 6, 7] =map=> [-32, -16, -8, -4, -2, 0, 2]
        const zoomsMap = new Map();
        zooms
            .sort((a, b) => a - b) //we assuming the list arrives ordered (asc), but do a sort anyway
            .forEach((k,idx) => zoomsMap.set(minZoom + idx, k));

        this.setState({
            map: {
                ...this.state.map,
                maxZoom: zoomsMap.size,
                zoomsMap: zoomsMap,
            },
        });
    }

    getTileIdsBoundsByZoom(zoom) {

        const {
            [localConstants._TYPE_TILE_IDS_BOUNDS_PER_ZOOM]: tileIdsBoundsPerZoom,
        } = this.props.dataset.heatMapBounds;

        return tileIdsBoundsPerZoom.find(o => o.zoom === zoom);
    }

    boundsCheck(timestampID, timeserieIndexID, zoom) {

        const { zoomsMap } = this.state.map;

        const realZoom = zoomsMap.get(zoom);

        const idsBounds = this.getTileIdsBoundsByZoom(realZoom);

        return !(timestampID < idsBounds.xIDStart ||
            timestampID > idsBounds.xIDEnd ||
            timeserieIndexID < idsBounds.yIDStart ||
            timeserieIndexID > idsBounds.yIDEnd)
    }

    fetchTileByTmsURL(x, y, z) {

        const {
            [localConstants._TYPE_SELECTED_DATABASE]: database,
            [localConstants._TYPE_SELECTED_POLICY]: policy,
            [localConstants._TYPE_SELECTED_HEATMAP_TYPE]: heatMapType,
            [localConstants._TYPE_SELECTED_FIELD]: field,
            [localConstants._TYPE_SELECTED_ZSCORE]: zScore,
            [localConstants._TYPE_SELECTED_PALETTE]: palette,
        } = this.props.configuration;

        const { zoomsMap } = this.state.map;

        //TODO revert to parametric url
        //const baseURI = `${TILES_URL}/${database}/${policy}/${heatMapType}/${field}/${zScore}/${palette}`;

        const baseURI = `${TILES_URL}/google_cluster/autogen/SORT_BY_MACHINE/mean_cpu_usage_rate/2/GRAY`;
        const URL = `${baseURI}/` +
            `${zoomsMap.get(z)}/` +     //zoom (get the real zoom mapped with the tile server)
            `${x}/` +                   //timestampid
            `${y}/` +                   //machineid
            `tile.png`;

        //check bounds, if we are out of bounds a fake tile is fetched from the API
        return (this.boundsCheck(x,y,z) ? URL : FAKE_TILE_URL);
    }

    handleBoundsChange({ center, zoom, bounds, initial }) {

        console.log(bounds)

        this.setState({
            map: {
                ...this.state.map,
                center: center,
                zoom: zoom,
                bounds: bounds,     //{ ne: [lat, lon], sw: [lat, lon] } , i.e. top-right and bottom-left corners
                initial: initial,
            }
        })
    }

    handleClick({ event, latLng, pixel }) {

        const { zoom: mappedZoom, zoomsMap } = this.state.map;

        const {
            [localConstants._TYPE_SELECTED_DATABASE]: database,
            [localConstants._TYPE_SELECTED_POLICY]: policy,
            [localConstants._TYPE_SELECTED_START_INTERVAL]: startInterval,
            [localConstants._TYPE_SELECTED_END_INTERVAL]: endInterval,
            [localConstants._TYPE_SELECTED_HEATMAP_TYPE]: heatMapType,
            [localConstants._TYPE_SELECTED_FIELD]: field,
            [localConstants._TYPE_SELECTED_PERIOD]: period,
        } = this.props.configuration;

        const coords = lonLat2TileIdsPixels(latLng[1], latLng[0], mappedZoom);

        //get back the real zoom (from pigeon's map zooms mapping)
        const realZoom = zoomsMap.get(mappedZoom);

        //compute timestamp/timeserie index according to tile ids and point coords
        const [ tileTimestamp, timeSerieIdx ] = convertTileCoordinates({
            genesis: startInterval,
            tileIds: [coords.xTileID, coords.yTileID],
            tileCoords: [coords.xPoint, coords.yPoint],
            zoom: realZoom,
        });

        //send back the selection
        this.props.handleTimeSerieSelection({
            timeSerieIdx: timeSerieIdx,
            timestamp: tileTimestamp,
            heatMapType: heatMapType,
            fields: [field, 'n_jobs', 'n_tasks'], //TODO make other fields selectable
            zoom: realZoom,
            tileIds: [coords.xTileID, coords.yTileID],
            pointCoords: [coords.xPoint, coords.yPoint],
            latLon: latLng,
            actionType: 'selection',
        });
    }

    handleMarkerClick() {


    }

    renderMarks() {

        const { timeSeriesMap } = this.props;

        let markers = [];
        for (let [key, value] of timeSeriesMap) {

            markers.push(
                <Marker
                    key={key}
                    anchor={value.selection.latLon}
                    payload={1}
                    onClick={this.handleMarkerClick}
                />
            )
        }

        return markers;
    }

    renderTimeline(bounds) {

        const { zoom, zoomsMap } = this.state.map;
        const {
            [localConstants._TYPE_SELECTED_START_INTERVAL]: startInterval,
            [localConstants._TYPE_SELECTED_END_INTERVAL]: endInterval,
        } = this.props.configuration;

        const leftBound = bounds.sw;        //[lat, lon]
        const rightBound = bounds.ne;

        const leftCoords = lonLat2TileIdsPixels(leftBound[1], leftBound[0], zoom);
        const rightCoords = lonLat2TileIdsPixels(rightBound[1], rightBound[0], zoom);

        console.log(leftCoords,rightCoords)

        const realZoom = zoomsMap.get(zoom);

        const [startTimestamp, startTimeserieIndex] = convertTileCoordinates({
            genesis: startInterval,
            tileIds: [leftCoords.xTileID, 0],       //start timeserie index can be ignored
            tileCoords: [0, 0],
            zoom: realZoom,
        });

        let [endTimestamp, endTimeserieIndex] = convertTileCoordinates({
            genesis: startInterval,
            tileIds: [rightCoords.xTileID, 0], //end timeserie index can be ignored
            tileCoords: [config.TILE_SIZE, config.TILE_SIZE],
            zoom: realZoom,
        });

        console.log(startTimestamp, endTimestamp)

        return computeTimelineData(startTimestamp, endTimestamp, 300, realZoom)
                .slice(0, (_FIXED_N_TILES + 1));
        //TODO need slice cos when out of boundaries computes more, can be fixed?
    }

    render() {

        console.log(this.state)
        console.log(this.props)

        const { disabled, timeSeriesMap } = this.props;

        const { bounds } = this.state.map;

        const {
            nHorizontalTiles,
            tileIdCurrentInterval,
            tileIdCurrentMachineIndex,
            tileRowsURLs,
        } = this.state.navigation;

        const { timestamp, timeserieIdx } = this.state.selection;

        //if (disabled) return null;
        if (!this.state.map.zoomsMap) return null;

        const timelineData = (bounds) ? this.renderTimeline(bounds) : null;

        console.log('timelinedata', timelineData)

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
                                    <Col xs={12}>
                                        <HeatMapSelectionBox
                                            label="Selection"
                                            timestamp={timestamp}
                                            machine={timeserieIdx}
                                        />
                                    </Col>
                                </Form>
                            </div>


                            <Row>
                                <div className="pigeon-map-container">

                                        <PigeonMap
                                            boxClassname="pigeon-map"
                                            height={config.TILE_SIZE * _FIXED_N_TILES}
                                            width={config.TILE_SIZE * _FIXED_N_TILES}

                                            animate={true}

                                            provider={this.fetchTileByTmsURL}
                                            onBoundsChanged={this.handleBoundsChange}
                                            onClick={this.handleClick}

                                            center={this.state.map.center}

                                            minZoom={this.state.map.minZoom}
                                            maxZoom={this.state.map.maxZoom}
                                            zoom={this.state.map.zoom}
                                            zoomSnap={true}

                                            limitBounds='edge'

                                            twoFingerDrag={false}
                                            metaWheelZoom={false}

                                            attribution={false}
                                        >

                                            {/*{*/}
                                                {/*this.state.map.bounds &&*/}

                                                {/*<Overlay*/}
                                                    {/*anchor={this.state.map.bounds.sw}*/}
                                                {/*>*/}

                                                    {/*<div*/}
                                                        {/*className="pigeon-overlay-interactive"*/}
                                                        {/*style={{*/}
                                                            {/*width: `${config.TILE_SIZE * _FIXED_N_TILES}px`,*/}
                                                            {/*height: `${config.TILE_SIZE * _FIXED_N_TILES}px`,*/}
                                                        {/*}}*/}
                                                    {/*>*/}

                                                    {/*</div>*/}

                                                {/*</Overlay>*/}
                                            {/*}*/}

                                            {/*{*/}

                                                {/*this.state.map.bounds &&*/}

                                                {/*<Marker*/}
                                                    {/*anchor={this.state.map.bounds.sw}*/}
                                                    {/*payload={1}*/}
                                                    {/*onClick={this.handleMarkerClick}*/}
                                                {/*/>*/}
                                            {/*}*/}

                                            {/*{*/}
                                            {/*timeSeriesMap &&*/}
                                            {/*this.renderMarks().map((marker,idx) => (*/}
                                            {/*marker*/}
                                            {/*))*/}
                                            {/*}*/}


                                        </PigeonMap>
                                </div>
                            </Row>
                            <Row>
                                <div className="timeline">

                                    {
                                        timelineData &&

                                        <TimeLine
                                            width={2 * config.TILE_SIZE}
                                            nTiles={2}
                                            data={timelineData}
                                        />
                                    }

                                </div>
                            </Row>


                            {/*<div className="heatmap-container">*/}
                                {/*<div className="wrapper">*/}
                                    {/*<div className="header">*/}
                                        {/*<button className="menu-area-clickable btn-up"*/}
                                           {/*onClick={() => this.handleMenuNavigation({type: _MENU_NAVIGATION._UP})}>*/}
                                            {/*<img id="arrow-up-svg" src={ArrowUpSvg}/>*/}
                                        {/*</button>*/}
                                    {/*</div>*/}
                                    {/*<div className="left-sidebar">*/}
                                        {/*<button className="menu-area-clickable btn-left"*/}
                                            {/*onClick={() => this.handleMenuNavigation({type: _MENU_NAVIGATION._LEFT})}>*/}
                                            {/*<img id="arrow-left-svg" src={ArrowLeftSvg}/>*/}
                                        {/*</button>*/}
                                    {/*</div>*/}

                                    {/*<div className="tiles-container-bordering">*/}
                                        {/*<div className="tiles-container" ref={this.heatMapContainerElement}>*/}

                                            {/*{*/}
                                                {/*tileRowsURLs.length > 0 &&*/}

                                                {/*tileRowsURLs.map((row, indexRow) => (*/}
                                                    {/*<div*/}
                                                        {/*style={{gridRow: `1 / span ${row.length}`}}*/}
                                                        {/*className="tiles-col"*/}
                                                        {/*key={`${indexRow}`}>*/}

                                                        {/*{*/}
                                                            {/*row.map((col, indexCol) => (*/}

                                                                {/*<Tile*/}
                                                                    {/*key={`${indexRow},${indexCol}`}*/}
                                                                    {/*tileID={[*/}
                                                                        {/*tileIdCurrentInterval + indexRow,*/}
                                                                        {/*tileIdCurrentMachineIndex + indexCol*/}
                                                                    {/*]}*/}
                                                                    {/*tileURL={col}*/}
                                                                    {/*handleTileMouseInteraction={this.handleTileMouseInteraction}*/}
                                                                {/*/>*/}

                                                            {/*))*/}
                                                        {/*}*/}
                                                    {/*</div>*/}
                                                {/*))*/}
                                            {/*}*/}

                                            {/*<div className="timeline-overlay">*/}
                                                {/*<svg*/}
                                                    {/*height={config.TILE_SIZE * _FIXED_TILES_HEIGHT}*/}
                                                    {/*width={config.TILE_SIZE * nHorizontalTiles}*/}
                                                {/*>*/}

                                                    {/*{*/}
                                                        {/*timeSeriesMap &&*/}
                                                        {/*this.renderHighlights().map((k) => k)*/}
                                                    {/*}*/}

                                                {/*</svg>*/}
                                            {/*</div>*/}

                                        {/*</div>*/}
                                    {/*</div>*/}

                                    {/*<div className="right-sidebar">*/}
                                        {/*<button className="menu-area-clickable btn-right"*/}
                                           {/*onClick={() => this.handleMenuNavigation({type: _MENU_NAVIGATION._RIGHT})}>*/}
                                            {/*<img id="arrow-right-svg" src={ArrowRightSvg}/>*/}
                                        {/*</button>*/}
                                    {/*</div>*/}
                                    {/*<div className="footer">*/}
                                        {/*<button className="menu-area-clickable btn-down"*/}
                                           {/*onClick={() => this.handleMenuNavigation({type: _MENU_NAVIGATION._DOWN})}>*/}
                                            {/*<img id="arrow-down-svg" src={ArrowDownSvg}/>*/}
                                        {/*</button>*/}
                                    {/*</div>*/}
                                    {/*<div className="timeline">*/}

                                        {/*{*/}
                                            {/*timelineData &&*/}

                                            {/*<TimeLine*/}
                                                {/*width={nHorizontalTiles * config.TILE_SIZE}*/}
                                                {/*nTiles={nHorizontalTiles}*/}
                                                {/*data={timelineData}*/}
                                            {/*/>*/}
                                        {/*}*/}

                                    {/*</div>*/}
                                {/*</div>*/}
                            {/*</div>*/}

                            <div className="timeserie-closable-area">
                            {
                                timeSeriesMap &&
                                Array.from(timeSeriesMap.keys()).map((k, idx) => (
                                    <div className="timeserie-closable-box" key={idx}>
                                        <div className="timeserie-closable-icon">
                                            <button onClick={() => this.handleTimeSerieDeselection(k)}>
                                                <X size={15}/>
                                            </button>
                                        </div>
                                        <div className="timeserie-closable-content">
                                            <p>{timeSeriesMap.get(k).name} ({k})</p>
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