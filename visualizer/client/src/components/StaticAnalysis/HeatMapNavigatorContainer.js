//HeatMap Requirements:
//Tiles are 256 × 256 pixel PNG files
//Each zoom level is a directory, each column is a subdirectory, and each tile in that column is a file
//Filename(url) format is /zoom/x/y.png

import React, { Component } from 'react';
import { config, TILES_URL, FAKE_TILE_URL } from '../../config/config';

import * as localConstants from '../../utils/constants';
import * as globals from '../../utils/globals';

import _ from 'lodash';

import {Colorscale} from 'react-colorscales';

import {default as PigeonMap} from 'pigeon-maps';
import Marker from './Marker';

import { Panel, Row } from 'react-bootstrap';
import 'react-widgets/dist/css/react-widgets.css';

import { X } from 'react-feather';

import './HeatMapNavigatorContainer.css';

import { TimeLine } from './TimeLine';

const _FIXED_N_TILES = 2;

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

const computeTimelineData = (timeStampsData, timeseriesData, zoom) => {

    let startTs = Date.parse(timeStampsData.start); //unix epoch time
    let endTs = Date.parse(timeStampsData.end);
    let tsTileInterval = timeStampsData.period * 1000 * config.TILE_SIZE;    //s => ms

    let startIdx = Number(timeseriesData.start);
    let endIdx = Number(timeseriesData.end);
    let idxTileInterval = config.TILE_SIZE;

    if (zoom > 0) {
        tsTileInterval /= Math.abs(zoom);
        idxTileInterval /= Math.abs(zoom);
    }
    if (zoom < 0) {
        tsTileInterval *= Math.abs(zoom);
        idxTileInterval *= Math.abs(zoom)
    }

    let timestamps = [];
    while (startTs < endTs) {
        timestamps.push(new Date(startTs));
        startTs += tsTileInterval;
    }
    timestamps.push(new Date(endTs));

    let timeserieIndexes = [];
    for (let i = startIdx; i <= endIdx; i += idxTileInterval)
        timeserieIndexes.push(i);

    return {
        timestampsTimelineData: timestamps.map(e => e.toISOString()),
        timeseriesTimelineData: timeserieIndexes,
    };
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

const tile2long = (x,zoom) => {
    return (x/Math.pow(2,zoom)*360-180);
};

const tile2lat = (y,zoom) => {
    const n = Math.PI-2*Math.PI*y/Math.pow(2,zoom);
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
    const xPoint = (xRes % 1) * config.TILE_SIZE;
    const yPoint = (yRes % 1) * config.TILE_SIZE;

    return {
        xTileID: xTileID,
        yTileID: yTileID,
        xPoint: Math.floor(xPoint),
        yPoint: Math.floor(yPoint),
    }
};

const tileIdsPixels2LonLat = (x, y, zoom) => {

    return [tile2lat(y, zoom), tile2long(x, zoom)]; // [lat, lon]
};

const mapOptions = {    //TODO fetch from config externally or from API

    minZoom: 1,
    center: [0, 0],
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
                clickable: true,
            },

            zooms: null,

            selection: {

                timestamp: 'No Data',
                timeSerieIdx: 'No Data',
                zoom: 'No Data',
            },

            clientWindowWidth: window.innerWidth,
            clientWindowsHeight: window.innerHeight,

            currentHeatMapContainerWidth: null,
            currentHeatMapContainerHeight: null,

            isLoading: false,
        };

        this.updateClientWindowDimensions = this.updateClientWindowDimensions.bind(this);
        this.handleTimeSerieDeselection = this.handleTimeSerieDeselection.bind(this);
        this.fetchTileByTmsURL = this.fetchTileByTmsURL.bind(this);
        this.handleBoundsChange = this.handleBoundsChange.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.handleMarkerHover = this.handleMarkerHover.bind(this);
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

        //guard
        if (!globals.checkValuesExistanceOfObject(this.props.dataset) ||
            !globals.checkValuesExistanceOfObject(this.props.configuration) ||
            !globals.checkValuesExistanceOfObject(this.props.heatMapConfiguration))
            return;

        //zooms mapping when the component is loaded and anytime the zoom list from props changes
        if (!this.state.map.zoomsMap || JSON.stringify(zooms) !== JSON.stringify(prevZooms)) {

            this.zoomsMapping();
        }
    }

    updateClientWindowDimensions() {

        this.setState({
            clientWindowWidth: window.innerWidth,
            clientWindowsHeight: window.innerHeight
        });
    }

    handleTimeSerieDeselection(timeserieIdx) {

        this.props.handleTimeSerieSelection({timeSerieIdx: timeserieIdx, actionType: 'deselection'});
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

        const idsBounds = this.getTileIdsBoundsByZoom(zoom);

        return !(timestampID < idsBounds.xIDStart ||
            timestampID > idsBounds.xIDEnd ||
            timeserieIndexID < idsBounds.yIDStart ||
            timeserieIndexID > idsBounds.yIDEnd)
    }

    urlAvailabilityCheck(url) {

        return fetch(url)
            .then(res => (res.ok && res.status === 200))
            .catch(() => false);
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

        //zoom (get the real zoom mapped with the tile server)
        const realZoom = zoomsMap.get(z);

        const baseURI = `${TILES_URL}/${database}/${policy}/${heatMapType}/${field}/${zScore}/${palette}`;
        //const baseURI = `${TILES_URL}/google_cluster/autogen/SORT_BY_MACHINE/mean_cpu_usage_rate/2/GRAY`;
        const URL = `${baseURI}/` +
            `${realZoom}/` +
            `${x}/` +                   //timestampid
            `${y}/` +                   //machineid
            `tile.png`;

        //check bounds, if we are out of bounds a fake tile is fetched from the API
        return (this.boundsCheck(x,y,realZoom) ? URL : FAKE_TILE_URL);
    }

    handleBoundsChange({ center, zoom, bounds, initial }) {

        this.setState({
            map: {
                ...this.state.map,
                center: center,
                zoom: zoom,
                bounds: bounds,     //{ ne: [lat, lon], sw: [lat, lon] } , i.e. top-right and bottom-left corners
                initial: initial,
            }
        });
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

        //mouse over a mark (disable the click over the map)
        if (!this.state.map.clickable) return;

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

        //send back the selection (also last focus will be configured in the parent component)
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

    handleMarkerHover(isMouseOverMark) {

        this.setState({
            map: {
                ...this.state.map,
                clickable: !isMouseOverMark,
            }
        });
    }

    handleMarkerClick({ event, anchor, payload }) {

        this.props.handlePointFocus(payload);
    }

    renderMarks() {

        const { timeSeriesMap } = this.props;

        let markers = [];
        for (let [key, value] of timeSeriesMap) {

            markers.push(
                <Marker
                    key={key}
                    anchor={value.selection.latLon}
                    payload={{
                        timestamp: value.selection.timestamp,
                        timeSerieIdx: value.selection.timeSerieIdx,
                        zoom: value.selection.zoom,
                        color: value.color,
                    }}
                    onClick={this.handleMarkerClick}
                    pinColor={value.color}
                    handleMarkerHover={this.handleMarkerHover}
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

        const realZoom = zoomsMap.get(zoom);

        const [startTimestamp, startTimeserieIndex] = convertTileCoordinates({
            genesis: startInterval,
            tileIds: [leftCoords.xTileID, rightCoords.yTileID],
            tileCoords: [0, 0],
            zoom: realZoom,
        });

        let [endTimestamp, endTimeserieIndex] = convertTileCoordinates({
            genesis: startInterval,
            tileIds: [rightCoords.xTileID, leftCoords.yTileID],
            tileCoords: [config.TILE_SIZE, config.TILE_SIZE],
            zoom: realZoom,
        });

        let results =  computeTimelineData(
            {start: startTimestamp, end: endTimestamp, period: 300},
            {start: startTimeserieIndex, end: endTimeserieIndex},
            realZoom);

        //TODO need slice cos when out of boundaries computes more, can be fixed?
        results = _.mapValues(results, (arr) => arr.slice(0, (_FIXED_N_TILES + 1)));

        return results;
    }

    renderPaletteScale(mappedPalette) {

        //TODO make an independent jsx
        const x = 459;
        const y = 20;
        const blockDim = 46;

        mappedPalette = mappedPalette.slice(1, mappedPalette.length - 1).reverse();

        return(

            <div className="top-panel">
                <div className="colorscale-container">
                    <Colorscale
                        colorscale={mappedPalette.map(e => e.color)}
                        onClick={() => {
                        }}
                        //width={config.TILE_SIZE * _FIXED_N_TILES}
                        maxWidth={config.TILE_SIZE * _FIXED_N_TILES}
                    />
                    <div className="palette-scale-container">
                        <div className="lines-container">
                            <svg width={459} height={5}>
                                <line className="horizontal-line" x1="0" y1="0" x2="479" y2="0"/>
                                <line id="max-range" className="vertical-line" x1="0" y1="0" x2="0" y2={y} />

                                {
                                    mappedPalette.map((k, idx) => (
                                        <line key={idx} className="vertical-line"
                                              x1={blockDim * (idx + 1)} y1={0} x2={blockDim * (idx + 1)} y2={y} />
                                    ))
                                }

                                <line id="min-range" className="vertical-line" x1={x} y1="0" x2={x} y2={y} />
                            </svg>
                        </div>
                        <div className="ranges-data-container">

                            {
                                mappedPalette.slice().reverse().map((k, idx) => (
                                    <div
                                        key={idx}
                                        className="data-container"
                                        style={{width: `${blockDim}px`, height: `5px`}}>
                                        <p>{k.value}</p>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    render() {

        const { disabled, timeSeriesMap } = this.props;
        const { bounds } = this.state.map;
        const { [localConstants._TYPE_MAPPED_PALETTE]: mappedPalette } = this.props.heatMapConfiguration;

        if (disabled) return null;
        if (!this.state.map.zoomsMap) return null;

        //TODO move in componentDidUpdate?
        const timelineData = (bounds) ? this.renderTimeline(bounds) : null;

        const containerDimsStyle = {
            width: `${config.TILE_SIZE * _FIXED_N_TILES}px`,
            height: `${config.TILE_SIZE * _FIXED_N_TILES}px`,
        };

        const gridDimStyle = {
            width: `${config.TILE_SIZE * _FIXED_N_TILES + 100}px`,
        };

        return (

            <Panel bsStyle="primary" defaultExpanded>
                <Panel.Heading>
                    <Panel.Title toggle>
                        Heat Map
                    </Panel.Title>
                </Panel.Heading>
                <Panel.Collapse>
                    <Panel.Body>

                        <Row>
                            <div className="wrapper">
                                <div className="grid"
                                     style={gridDimStyle}>

                                    {(mappedPalette.length !== 0) && this.renderPaletteScale(mappedPalette)}

                                    <div className="left-panel">
                                        <div className="timeseries-timeline-container timeline-left">
                                            <div className="timeseries-timeline timelines">

                                                {
                                                    timelineData &&

                                                    <TimeLine
                                                        width={2 * config.TILE_SIZE}
                                                        nTiles={2}
                                                        data={timelineData.timeseriesTimelineData}
                                                    />
                                                }

                                            </div>
                                        </div>
                                    </div>

                                    <div className="heatmap-container middle-panel" style={containerDimsStyle}>
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

                                                {
                                                    timeSeriesMap &&
                                                    this.renderMarks().map((marker, idx) => (
                                                        marker
                                                    ))
                                                }

                                            </PigeonMap>
                                        </div>
                                    </div>

                                    <div className="right-panel">

                                    </div>

                                    <div className="timestamps-timeline-container bottom-panel">
                                        <div className="timestamps-timeline timelines">

                                            {
                                                timelineData &&

                                                <TimeLine
                                                    width={2 * config.TILE_SIZE}
                                                    nTiles={2}
                                                    data={timelineData.timestampsTimelineData}
                                                />
                                            }

                                        </div>
                                    </div>

                                </div>

                            </div>

                        </Row>
                        {/*<Row>*/}
                            {/*<div className="heatmap-menu-container">*/}
                                {/*<Form>*/}
                                    {/*<Col xs={12}>*/}
                                        {/*<div className="selection-box-container">*/}
                                            {/*{*/}
                                                {/*(timestamp && timeSerieIdx) &&*/}
                                                {/*<HeatMapSelectionBox*/}
                                                    {/*timestamp={timestamp}//timestamp={timestamp}*/}
                                                    {/*machine={timeSerieIdx}//machine={timeserieIdx}*/}
                                                {/*/>*/}
                                            {/*}*/}
                                        {/*</div>*/}
                                    {/*</Col>*/}
                                {/*</Form>*/}
                            {/*</div>*/}
                        {/*</Row>*/}
                        <Row>

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
                                            <p>{timeSeriesMap.get(k).name} ({k}) ({timeSeriesMap.get(k).selection.timestamp})</p>
                                        </div>
                                    </div>
                                ))
                            }
                            </div>

                        </Row>
                    </Panel.Body>
                </Panel.Collapse>
            </Panel>
        );
    }
}