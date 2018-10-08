import React from 'react';

import * as localConstants from '../../utils/constants';
import * as apiFetcher from "../../services/ApiFetcher";

import { DropdownClassic } from '../common/Dropdown';

import { Panel, Grid, Row, Col, Form, FormGroup, ControlLabel } from 'react-bootstrap';

import { LoadingOverlay, Loader } from 'react-overlay-loader';
import 'react-overlay-loader/styles.css';

const { TimeSeries, TimeRange } = require("pondjs");
import {
    Charts,
    ChartContainer,
    ChartRow,
    YAxis,
    LineChart,
    Resizable,
    styler,
    Legend,
    EventMarker,
} from "react-timeseries-charts";

import { format } from "d3-format";
import _ from "underscore";

//chroma-js
const chroma = require('chroma-js');

import './AnalysisContainer.css';

const NullMarker = props => {
    return <g />
};

export default class AnalysisContainer extends React.Component {

    constructor() {
        super();

        this.state = {

            dataset: {

                [localConstants._TYPE_FIELDS]: [],
                [localConstants._TYPE_STATISTICS]: [],
            },

            configuration: {

                [localConstants._TYPE_SELECTED_FIELD]: null,
                [localConstants._TYPE_SELECTED_STATISTIC]: null,
            },

            timeSeries: [],
            timeRange: null,
            styler: null,

            tracker: null,
            trackerValue: "--",
            trackerEvent: null,

            x: null,
            y: null,

            isLoading: false,

            width: window.innerWidth,
            height: window.innerHeight
        };

        this.handleTrackerChanged = this.handleTrackerChanged.bind(this);
        this.handleTimeRangeChange = this.handleTimeRangeChange.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);

        this.onHandleDropdownSelection = this.onHandleDropdownSelection.bind(this);
    }

    componentDidMount() {

        //fetch statistics
        this.fetchDataFromAPI({ itemType: localConstants._TYPE_STATISTICS });
    }

    componentDidUpdate(prevProps, prevState, prevContect) {

        const { datasetAnalysis, psptAnalysis } = this.props;
        const { datasetAnalysis: prevDatasetAnalysis, psptAnalysis: prevPsptAnalysis} = prevProps;
        const { isLoading } = this.state;
        const { [localConstants._TYPE_STATISTICS]: statistics } = this.state.dataset;
        
        if (!datasetAnalysis || !psptAnalysis || isLoading) return;

        const { fields } = datasetAnalysis; //!var will check for empty strings/null/undefined/false
        if (!fields || fields.length === 0 || !statistics || statistics.length === 0) return;

        //check with stringify (obj equality) if the analysis is changed
        if (JSON.stringify(datasetAnalysis) !== JSON.stringify(prevDatasetAnalysis) ||
            JSON.stringify(psptAnalysis) !== JSON.stringify(prevPsptAnalysis)) {

            //configure dataset fields/statistics and the first field/statistic as selection from dataset analysis
            this.setState({
                dataset: {
                    ...this.state.dataset,
                    [localConstants._TYPE_FIELDS]: datasetAnalysis.fields,
                    [localConstants._TYPE_STATISTICS]: statistics
                },
                configuration: {
                    ...this.state.configuration,
                    [localConstants._TYPE_SELECTED_FIELD]: datasetAnalysis.fields[0],
                    [localConstants._TYPE_SELECTED_STATISTIC]: statistics[0],   //statistics fetched during mount
                },
                isLoading: true
            });

            //start populating chart
            this.populateChart(datasetAnalysis, psptAnalysis)
                .catch(err => {})
                .then(() => this.setState({ isLoading: false }));
        }
    }

    fetchDataFromAPI({itemType, args={}}) {

        const { onError } = this.props;

        //fetch heatmap types
        apiFetcher
            .fetchData({ itemType: itemType, args: args })
            .then(data => {
                this.setState({ isLoading: true });
                return data;
            })
            .then(data => {

                this.setState({
                    dataset: {
                        ...this.state.dataset,
                        [itemType]: data,
                    }
                });
            })
            .catch(err => {

                const options = {
                    itemType: itemType,
                    error: err.message,
                    ...args
                };

                onError({
                    message: 'Service is temporarily unavailable, Try later!',
                    type: localConstants._ERROR_FETCH_FAILED,
                    ...options
                });
            })
            .then(() => this.setState({ isLoading: false }));
    }

    populateChart = async (datasetAnalysis, psptAnalysis) => {

        const createTimeSeries = (points) => {

            return new TimeSeries({

                name: "Resource Usage",
                columns: ["time", "min", "max", "sum", "mean"],
                points: points
            });
        };

        if (psptAnalysis && datasetAnalysis && datasetAnalysis.fields.length > 0) {

            //generate the time series (one for each field)
            let timeseries = [];
            datasetAnalysis.fields.forEach(field => {

                timeseries.push(createTimeSeries(psptAnalysis[field]));
            });

            //generate the time range
            const timeRange = new TimeRange([datasetAnalysis.startInterval, datasetAnalysis.endInterval]);

            //generate styler (color mapping)
            let styles = [];
            const colors = chroma.scale('RdYlBu').mode('lch').colors(datasetAnalysis.fields.length);
            datasetAnalysis.fields.forEach((field, index) => {

                //map colors
                styles.push({
                    key: field,
                    color: colors[index]
                })
            });
            const sty = styler(styles);

            this.setState({
                timeSeries: timeseries,
                timeRange: timeRange,
                styler: sty,
            });
        }
    };

    handleTrackerChanged (tracker) {

        const { timeSeries } = this.state;

        const {
            [localConstants._TYPE_FIELDS]: fields
        } = this.state.dataset;

        const {
            [localConstants._TYPE_SELECTED_FIELD]: field,
            [localConstants._TYPE_SELECTED_STATISTIC]: statistic,
        } = this.state.configuration;

        if (!tracker) {
            this.setState({ tracker: null, trackerValue: null, trackerEvent: null, x: null, y: null });
        }
        else {

            //access the time-series array using the index of the selected field
            //the time-series have been generated following the order of the fields fetched from the api
            const fieldIndex = fields.indexOf(field);
            const timeSerie = timeSeries[fieldIndex];

            //
            const e = timeSerie.atTime(tracker);
            const eventTime = new Date(e.begin().getTime() + (e.end().getTime() - e.begin().getTime()) / 2 );
            const eventValue = e.get(statistic);
            const v = `${eventValue}`;

            this.setState({ tracker: eventTime, trackerValue: v, trackerEvent: e });
        }
    };

    handleTimeRangeChange (timeRange) {
        this.setState({ timeRange });
    }

    handleMouseMove (x, y) {
        this.setState({ x, y });
    }

    onHandleDropdownSelection({value, type}) {

        this.setState({
            configuration: {
                ...this.state.configuration,
                [type]: value,
            },
        });
    }
    
    renderMarker () {

        const {
            [localConstants._TYPE_SELECTED_STATISTIC]: statistic
        } = this.state.configuration;
        
        if (!this.state.tracker) {
            
            return <NullMarker/>;
        } 
        
        return (
          <EventMarker
            type="flag"
            axis="axis"
            event={this.state.trackerEvent}
            column={statistic}
            info={[{ label: "Value", value: this.state.trackerValue }]}
            //infoTimeFormat={}
            infoWidth={100}
            markerRadius={2}
            markerStyle={{ fill: "black" }}
          />
        );
    }

    render() {

        const { disabled, datasetAnalysis } = this.props;
        const { isLoading, timeSeries, timeRange, tracker, styler } = this.state;

        const {
            [localConstants._TYPE_FIELDS]: fields,
            [localConstants._TYPE_STATISTICS]: statistics,
        } = this.state.dataset;

        const {
            [localConstants._TYPE_SELECTED_FIELD]: field,
            [localConstants._TYPE_SELECTED_STATISTIC]: statistic,
        } = this.state.configuration;
        
        //disable component
        if (disabled) return null;

        let startTime = null;
        let endTime = null;
        let timeSerieIndex = null;
        let categories = null;

        if (timeSeries !== null && timeRange !== null) {

            //start/end interval for time range
            startTime = new Date(datasetAnalysis.startInterval);
            endTime = new Date(datasetAnalysis.endInterval);

            timeSerieIndex = fields.indexOf(field);

            const f = format(",.6f");

            let fieldValue;
            if (tracker) {

                const idx = timeSeries[timeSerieIndex].bisect(tracker);
                const trackerEvent = timeSeries[timeSerieIndex].at(idx);

                fieldValue = `${f(trackerEvent.get(statistic))}`;   //statistic (selected)
            }

            categories = [
                {   //statistic
                    key: datasetAnalysis.fields[timeSerieIndex],
                    label: datasetAnalysis.fields[timeSerieIndex],
                    value: fieldValue,
                }
            ];
        }

        return (

            <Panel bsStyle="primary" defaultExpanded>
                <Panel.Heading>
                    <Panel.Title toggle>
                        Points Stats per Timestamp
                    </Panel.Title>
                </Panel.Heading>
                <Panel.Collapse>
                    <Panel.Body>

                        <LoadingOverlay className="loading-overlay-container">

                            {datasetAnalysis ?

                                <div className="analysis-menu-container">
                                    <Form>
                                        <Col xs={12} sm={6} md={3}>
                                            <DropdownClassic
                                                label="Fields"
                                                id="fields-dropdowns"
                                                placeholder="select field.."
                                                loading={isLoading}
                                                data={fields}
                                                value={field}
                                                type={localConstants._TYPE_SELECTED_FIELD}
                                                onChange={this.onHandleDropdownSelection}
                                                disabled={false}/>
                                        </Col>
                                        <Col xs={12} sm={6} md={3}>
                                            <DropdownClassic
                                                label="Statistics"
                                                id="statistics-dropdowns"
                                                placeholder="select statistic.."
                                                loading={isLoading}
                                                data={statistics}
                                                value={statistic}
                                                type={localConstants._TYPE_SELECTED_STATISTIC}
                                                onChange={this.onHandleDropdownSelection}
                                                disabled={false}/>
                                        </Col>
                                    </Form>
                                </div>

                                : null
                            }

                            {timeRange && timeSeries ?

                                <Col xs={12}>
                                    <Resizable>
                                        <ChartContainer
                                            timeRange={timeRange}
                                            minTime={startTime}
                                            maxTime={endTime}
                                            showGrid={false}
                                            onTrackerChanged={this.handleTrackerChanged}
                                            onBackgroundClick={() => this.setState({selection: null})}
                                            enablePanZoom={true}
                                            onTimeRangeChanged={this.handleTimeRangeChange}
                                            onMouseMove={(x, y) => this.handleMouseMove(x, y)}
                                            minDuration={1000 * 60 * 60 * 24 * 30}>

                                            <ChartRow height={250}>
                                                <YAxis
                                                    id="axis"
                                                    label="Usage (%)"
                                                    min={timeSeries[timeSerieIndex].min(statistic)}
                                                    max={timeSeries[timeSerieIndex].max(statistic)}
                                                    //showGrid
                                                    //hideAxisLine
                                                    //width="20"
                                                    //type="linear"
                                                    //format=",.6f"
                                                />
                                                <Charts>
                                                    <LineChart
                                                        axis="axis"
                                                        breakLine={false}
                                                        series={timeSeries[timeSerieIndex]}
                                                        columns={[statistic]}
                                                        interpolation="curveBasis"
                                                        //highlight={this.state.hightlight}
                                                        //onHighLightChange={hightlight => this.setState({ hightlight })}
                                                        //selection={this.state.selection}
                                                        //onSelectionChange={selection => this.setState({ selection })}
                                                    />
                                                    {/*<CrossHairs x={this.state.x} y={this.state.y} />*/}
                                                    {this.renderMarker()}
                                                </Charts>
                                            </ChartRow>
                                        </ChartContainer>
                                    </Resizable>
                                </Col>
                                : null
                            }

                            {/*{categories ?*/}

                                {/*<Row>*/}
                                    {/*<Col xsOffset={2}>*/}
                                    {/*<span>*/}
                                        {/*<Legend*/}
                                            {/*style={styler}*/}
                                            {/*type="line"*/}
                                            {/*align="right"*/}
                                            {/*//highlight={this.state.highlight}*/}
                                            {/*//onHighlightChange={highlight => this.setState({ highlight })}*/}
                                            {/*//selection={this.state.selection}*/}
                                            {/*//onSelectionChange={selection => this.setState({ selection })}*/}
                                            {/*categories={categories}*/}
                                            {/*//stack={true}*/}
                                        {/*/>*/}
                                    {/*</span>*/}
                                    {/*</Col>*/}
                                {/*</Row>*/}

                                {/*: null*/}
                            {/*}*/}

                        </LoadingOverlay>
                        <Loader loading={isLoading}/>

                    </Panel.Body>
                </Panel.Collapse>
            </Panel>

        );
    }
}