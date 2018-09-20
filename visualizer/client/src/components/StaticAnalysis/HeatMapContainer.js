import React, { Component } from 'react';
import { config, TILES_URL } from '../../config/config';

import * as localConstants from '../../utils/constants';
import * as apiFetcher from "../../services/ApiFetcher";

import { Panel, Col, Form } from 'react-bootstrap';
import 'react-widgets/dist/css/react-widgets.css';

import './HeatMapContainer.css';

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

const convertTimestampToID = (genesis, current, period) => {

    let start = Date.parse(genesis);    //converts to unix epoch time (ms)
    let end = Date.parse(current);

    return Math.floor((end - start) / (period * 1000 * config.TILE_SIZE));
};

const convertTileCoordinates = ({ tileIds, tileCoords }) => {

    const [tileIdX, tileIdY] = tileIds;
    const [tileCoordX, tileCoordY] = tileCoords;


};

export default class HeatMapContainer extends Component {

    constructor() {
        super();

        this.state = {

            dataset: {

                [localConstants._TYPE_HEATMAP_TYPES]: [],
                [localConstants._TYPE_FIELDS]: [],
                [localConstants._TYPE_HEATMAP_ZOOMS]: [],
                [localConstants._TYPE_N_MEASUREMENTS]: null,
                [localConstants._TYPE_FIRST_INTERVAL]: null,
                [localConstants._TYPE_LAST_INTERVAL]: null,
            },

            configuration: {

                [localConstants._TYPE_SELECTED_HEATMAP_TYPE]: null,
                [localConstants._TYPE_SELECTED_FIELD]: null,
                [localConstants._TYPE_SELECTED_HEATMAP_ZOOM]: null,
            },

            navigation: {   //(x,y)

                nHorizontalTiles: 0,

                tileIdStartInterval: null,
                tileIdCurrentInterval: null,
                tileIdEndInterval: null,

                tileIdStartMachineIndex: null,
                tileIdCurrentMachineIndex: null,
                tileIdEndMachineIndex: null,

                tileRowsURLs: [],
            },

            width: window.innerWidth,
            height: window.innerHeight,

            currentHeatMapWidth: window.innerWidth,
            currentHeatMapHeight: window.innerHeight,

            isLoading: false,
        };

        this.updateWindowDimensions = this.updateWindowDimensions.bind(this);
        this.handleDropdownSelection = this.handleDropdownSelection.bind(this);
        this.handleMenuNavigation = this.handleMenuNavigation.bind(this);

        this.handleTileMouseClick = this.handleTileMouseClick.bind(this);
        this.handleTileMouseHoover = this.handleTileMouseHoover.bind(this);
    }

    componentDidMount() {

        const { onError } = this.props;

        this.setState({ isLoading: true });

        Promise.all([

            apiFetcher.fetchData({itemType: localConstants._TYPE_HEATMAP_TYPES}),
            apiFetcher.fetchData({itemType: localConstants._TYPE_HEATMAP_ZOOMS})

        ]).then(result => {
            const [heatMapTypes, heatMapZooms] = result;

            if (!heatMapTypes || !heatMapZooms || heatMapTypes.length === 0 || heatMapZooms.length === 0)
                throw Error(`data fetched from the API is invalid: HeatMap Types/Zooms`);

            this.setState({
                dataset: {
                    ...this.state.dataset,
                    [localConstants._TYPE_HEATMAP_TYPES]: heatMapTypes,
                    [localConstants._TYPE_HEATMAP_ZOOMS]: heatMapZooms,
                },
                configuration: {    //first item as default selected value
                    ...this.state.configuration,
                    [localConstants._TYPE_SELECTED_HEATMAP_TYPE]: heatMapTypes[0],
                    [localConstants._TYPE_SELECTED_HEATMAP_ZOOM]: heatMapZooms[0],
                },
                isLoading: false,
            });
        }).catch(err => {

            onError({
                message: 'Service is temporarily unavailable, Try later!',
                type: localConstants._ERROR_FETCH_FAILED,
            });

            this.setState({ isLoading: false });
        });

        this.updateWindowDimensions();
        window.addEventListener('resize', this.updateWindowDimensions);
    }

    componentWillUnmount() {

        window.removeEventListener('resize', this.updateWindowDimensions);
    }

    componentDidUpdate(prevProps, prevState, prevContext) {

        const { onError } = this.props;

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
            [localConstants._TYPE_HEATMAP_TYPES]: heatMapTypes,
            [localConstants._TYPE_FIELDS]: fields,
            [localConstants._TYPE_HEATMAP_ZOOMS]: heatMapZooms,
            [localConstants._TYPE_N_MEASUREMENTS]: nMeasurements,
            [localConstants._TYPE_FIRST_INTERVAL]: firstInterval,
            [localConstants._TYPE_LAST_INTERVAL]: lastInterval,
        } = this.state.dataset;

        const {
            [localConstants._TYPE_HEATMAP_TYPES]: prevHeatMapTypes,
            [localConstants._TYPE_FIELDS]: prevFields,
            [localConstants._TYPE_HEATMAP_ZOOMS]: prevHeatMapZooms,
            [localConstants._TYPE_N_MEASUREMENTS]: prevNMeasurements,
            [localConstants._TYPE_FIRST_INTERVAL]: prevFirstInterval,
            [localConstants._TYPE_LAST_INTERVAL]: prevLastInterval,
        } = prevState.dataset;

        const {
            [localConstants._TYPE_SELECTED_HEATMAP_TYPE]: heatMapType,
            [localConstants._TYPE_SELECTED_FIELD]: field,
            [localConstants._TYPE_SELECTED_HEATMAP_ZOOM]: heatMapZoom,
        } = this.state.configuration;

        const {
            [localConstants._TYPE_SELECTED_HEATMAP_TYPE]: prevHeatMapType,
            [localConstants._TYPE_SELECTED_FIELD]: prevField,
            [localConstants._TYPE_SELECTED_HEATMAP_ZOOM]: prevHeatMapZoom,
        } = prevState.configuration;

        const { width, height, currentHeatMapWidth } = this.state;
        const { width: prevWidth, height: prevHeight } = prevState;

        const { tileIdCurrentInterval, tileIdCurrentMachineIndex } = this.state.navigation;
        const {
            tileIdCurrentInterval: prevTileIdCurrentInterval,
            tileIdCurrentMachineIndex: prevTileIdCurrentMachineIndex
        } = prevState.navigation;
        
        //fetch fields + number of machines (Y Axis cardinality) when database is given or when it changes
        //then fetch first/last interval of database
        if (database && policy && (database !== prevDatabase || policy !== prevPolicy)) {

            this.setState({ isLoading: true });

            Promise.all([

                apiFetcher.fetchData({itemType: localConstants._TYPE_FIELDS, args: {database: database}}),
                apiFetcher.fetchData({itemType: localConstants._TYPE_N_MEASUREMENTS, args: {database: database}}),

            ]).then(result => {
                const [fields, nMeasurements] = result;

                if (!fields || !nMeasurements || fields.length === 0 || nMeasurements <= 0)
                    throw Error(`data fetched from the API is invalid: fields/ #measurements`);

                Promise.all([

                    apiFetcher.fetchData({
                        itemType: localConstants._TYPE_FIRST_INTERVAL,
                        args: {database: database, policy: policy, field: fields[0]}
                    }),
                    apiFetcher.fetchData({
                        itemType: localConstants._TYPE_LAST_INTERVAL,
                        args: {database: database, policy: policy, field: fields[0]}
                    })
                ]).then(result => {
                    const [firstInterval, lastInterval] = result;

                    if (!firstInterval || !lastInterval)
                        throw Error(`data fetched from the API is invalid: fist/last intervals`);

                    this.setState({
                        dataset: {
                            ...this.state.dataset,
                            [localConstants._TYPE_FIELDS]: fields,
                            [localConstants._TYPE_N_MEASUREMENTS]: nMeasurements,
                            [localConstants._TYPE_FIRST_INTERVAL]: firstInterval,
                            [localConstants._TYPE_LAST_INTERVAL]: lastInterval,
                        },
                        configuration: {    //first item as default selected value
                            ...this.state.configuration,
                            [localConstants._TYPE_SELECTED_FIELD]: fields[0],
                        },
                        isLoading: false,
                    });
                });

            }).catch(err => {

                onError({
                    message: 'Service is temporarily unavailable, Try later!',
                    type: localConstants._ERROR_FETCH_FAILED,
                });

                this.setState({ isLoading: false });
            });
        }

        /* HEATMAP MENU (TYPES + FIELDS + ZOOMS) + FIRST/LAST INTERVALS + #MEASUREMENTS ARE CHANGED (AFTER THE INIT.) */

        //validation
        if (!heatMapTypes || !fields || !heatMapZooms || !nMeasurements || !firstInterval || !lastInterval ||
            heatMapTypes.length === 0 || fields.length === 0 || heatMapZooms.length === 0) return;

        if (JSON.stringify(heatMapTypes) !== JSON.stringify(prevHeatMapTypes) ||
            JSON.stringify(fields) !== JSON.stringify(prevFields) ||
            JSON.stringify(heatMapZooms) !== JSON.stringify(prevHeatMapZooms) ||
            nMeasurements !== prevNMeasurements ||
            firstInterval !== prevFirstInterval ||
            lastInterval !== prevLastInterval) {

            //update the state and configure the first item on the dropdowns
            this.setState({
                dataset: {
                    ...this.state.dataset,
                    [localConstants._TYPE_HEATMAP_TYPES]: heatMapTypes,
                    [localConstants._TYPE_FIELDS]: fields,
                    [localConstants._TYPE_HEATMAP_ZOOMS]: heatMapZooms,
                },
                configuration: {
                    ...this.state.configuration,
                    [localConstants._TYPE_SELECTED_HEATMAP_TYPE]: heatMapTypes[0],
                    [localConstants._TYPE_SELECTED_FIELD]: fields[0],
                    [localConstants._TYPE_SELECTED_HEATMAP_ZOOM]: heatMapZooms[0],
                }
            });
        }

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

            this.computeHeatMapTiles({
                baseURI: `${TILES_URL}/${database}/${policy}/${heatMapType}/mean_cpu_usage_rate`,  //${field}
                zoom: heatMapZoom,
                startX: xIDstart,
                currentX: xIDstart,
                endX: xIDend,
                startY: 0,
                currentY: 0,
                endY: yIDend,
            });
        }

        //the window has been resized
        let resized = false;
        if (prevWidth !== width || prevHeight !== height) {

            //window resized
            const resizeDiff = Math.abs((width - currentHeatMapWidth));
            if (resizeDiff >= config.TILE_SIZE) resized = true;
        }

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
        startY = null, currentY, endY = null
    }) {

        const { width } = this.state;

        //compute the number of tiles according to window size
        const nHorizontalTiles = Math.floor((width - _PANEL_GAP) / (config.TILE_SIZE));

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

        this.setState({

            navigation: {
                ...this.state.navigation,

                nHorizontalTiles: nHorizontalTiles,

                tileIdStartInterval: startX !== null ? startX : this.state.navigation.tileIdStartInterval,
                tileIdCurrentInterval: currentX,
                tileIdEndInterval: endX !== null ? endX : this.state.navigation.tileIdEndInterval,

                tileIdStartMachineIndex: startY !== null ? startY : this.state.navigation.tileIdStartMachineIndex,
                tileIdCurrentMachineIndex: currentY,
                tileIdEndMachineIndex: endY !== null ? endY : this.state.navigation.tileIdEndMachineIndex,

                tileRowsURLs: tileRows,
            },

            currentHeatMapWidth: window.innerWidth,
            currentHeatMapHeight: window.innerHeight,
        });
    }

    updateWindowDimensions() {

        this.setState({ width: window.innerWidth, height: window.innerHeight });
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

    handleTileMouseClick({ tileX, tileY, imgX, imgY }) {


    }

    handleTileMouseHoover() {


    }

    render() {

        const { disabled } = this.props;
        const { isLoading } = this.state;

        const {
            [localConstants._TYPE_HEATMAP_TYPES]: heatMapTypes,
            [localConstants._TYPE_FIELDS]: fields,
            [localConstants._TYPE_HEATMAP_ZOOMS]: zooms,
        } = this.state.dataset;

        const {
            [localConstants._TYPE_SELECTED_HEATMAP_TYPE]: heatMapType,
            [localConstants._TYPE_SELECTED_FIELD]: field,
            [localConstants._TYPE_SELECTED_HEATMAP_ZOOM]: zoom,
        } = this.state.configuration;

        const { tileRowsURLs } = this.state.navigation;

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
                                            label="Heat Map Types"
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
                                            label="Fields"
                                            id="fields-dropdown"
                                            placeholder="select field.."
                                            loading={isLoading}
                                            data={fields}
                                            value={field}
                                            type={localConstants._TYPE_SELECTED_FIELD}
                                            onChange={this.handleDropdownSelection}
                                            disabled={false}/>
                                    </Col>
                                    <Col xs={12} sm={6} md={3}>
                                        <DropdownClassic
                                            label="Zoom"
                                            id="zooms-dropdown"
                                            placeholder="select zoom.."
                                            loading={isLoading}
                                            data={zooms}
                                            value={zoom}
                                            type={localConstants._TYPE_SELECTED_HEATMAP_ZOOM}
                                            onChange={this.handleDropdownSelection}
                                            disabled={false}/>
                                    </Col>
                                    <Col xs={12} sm={6} md={3}>
                                        <HeatMapSelectionBox
                                            label="Selection"
                                            timestamp={'test'}
                                            machine={2}
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

                                    <div className="tiles-container">
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
                                                                tileID={[indexRow, indexCol]}
                                                                tileURL={col}
                                                                handleTileMouseClick={this.handleTileMouseClick}
                                                                handleTileMouseHoover={this.handleTileMouseHoover}
                                                            />

                                                        ))
                                                    }
                                                </div>
                                            ))
                                        }

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
                        </div>
                    </Panel.Body>
                </Panel.Collapse>
            </Panel>
        );
    }
}