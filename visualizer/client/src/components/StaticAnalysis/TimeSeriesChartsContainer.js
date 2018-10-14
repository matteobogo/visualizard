import React from 'react';

import sharedConstants from '../../commons/constants';
import * as localConstants from '../../utils/constants';
import * as apiFetcher from "../../services/ApiFetcher";

import { Panel, Grid, Row, Col, Form, FormGroup, ControlLabel } from 'react-bootstrap';

import { LoadingOverlay, Loader } from 'react-overlay-loader';
import 'react-overlay-loader/styles.css';

import { TimeSeries, TimeRange } from 'pondjs';
import { Charts, ChartContainer, ChartRow, YAxis, LineChart, Baseline, Resizable, Legend, styler } from "react-timeseries-charts";

const chroma = require('chroma-js');

import './TimeSeriesChartsContainer.css';

const NullMarker = props => {
    return <g />
};

export default class TimeSeriesChartsContainer extends React.Component {

    constructor() {
        super();

        this.state = {

            lastTimeSerieIndexes: [],

            timeRange: null,
            timeSerie: null,

            tracker: null,
            trackerValue: "--",
            trackerEvent: null,

            x: null,
            y: null,

            max: 0,          //max value over the different timeseries (need to calibrate the yAxis in the chart)
            min: 0,          //as above with min
            colors: [],      //colors associated to timeseries
            isLoading: false,
        };

        this.handleTrackerChanged = this.handleTrackerChanged.bind(this);
        this.handleTimeRangeChange = this.handleTimeRangeChange.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
    }

    componentDidUpdate(prevProps, prevState, prevContext) {

        const {
            timeSeriesData, //contains the data of the timeseries
            mainField,      //the selected field of the timeserie to show in the chart (same for all timeseries)
            fieldStats,     //stats about the selected field (min, max, mean, std) over all the dataset
            sideFields,     //other fields to show in the highlight menu when charts are navigated
        } = this.props;

        const { timeSeriesData: prevTimeSeriesData } = prevProps;

        //if time range is changed, then rebuild the x-axis of the chart
        //data has the following structure:
        //{ machineIdx: { time: .., field1: .., field2: .., .. }, machineIdx: { .. }, .. }
        if (timeSeriesData && mainField && fieldStats && sideFields && (
            JSON.stringify(timeSeriesData) !== JSON.stringify(prevTimeSeriesData) ||
            this.state.lastTimeSerieIndexes.length !== Object.keys(timeSeriesData).length)) {

            this.buildTimeSeriesCharts();
        }
    }

    buildTimeSeriesCharts = () => {

        const { configuration, mainField, timeSeriesData } = this.props;
        const { max , min } = this.state;

        //max/min over all the timeseries
        //need to calibrate the Y-Axis of the chart when multiple timeseries are selected
        let newMax = max;
        let newMin = min;

        this.setState({isLoading: true});

        let timeSeries = {};
        Object.keys(timeSeriesData).forEach((k, idx) => {
            if (timeSeriesData.hasOwnProperty(k)) {

                //build the timeserie object
                const timeserie = new TimeSeries({
                    name: timeSeriesData[k].name,        //'timeserie_name'
                    columns: timeSeriesData[k].fields,   //[ 'time', 'field1', 'field2', ..]
                    points: timeSeriesData[k].points,    //[ [time, value1, value2, ..], ..]
                });

                timeSeries[k] = timeserie;

                //check max/min of the field(s) of the current timeserie
                //if there are multiple fields we need to specify as argument the field(s)
                //if multiple fields are specified, pondjs returns a map field->value
                let tsMax = timeserie.max(mainField);
                let tsMin = timeserie.min(mainField);
                if (tsMax > newMax) newMax = tsMax;
                if (tsMin < newMin) newMin = tsMin;
            }
        });

        //build the Time Range (Y-Axis)
        const timeRange = new TimeRange([
            configuration[localConstants._TYPE_SELECTED_START_INTERVAL],
            configuration[localConstants._TYPE_SELECTED_END_INTERVAL],
        ]);

        //assign colors to the timeseries
        //colors are built through a scale and based on the number of timeseries generated
        const colors = chroma
            .scale(['#fafa6e','#2A4858'])   //TODO make configurable externally
            .mode('lch')
            .colors(Object.keys(timeSeries).length);

        this.setState({
            lastTimeSerieIndexes: Object.keys(timeSeriesData),
            timeRange: timeRange,
            timeSeries: timeSeries,
            max: newMax,
            min: newMin,
            colors: colors,
            isLoading: false,
        });
    };

    handleTrackerChanged(tracker) {

        const { timeSeries } = this.state;

        const { mainField, sideFields } = this.props;

        if (!tracker) {
            this.setState({ tracker: null, trackerValue: null, trackerEvent: null, x: null, y: null });
        }
        else {

            //access the time-series array using the index of the selected field
            //the time-series have been generated following the order of the fields fetched from the api
            // const fieldIndex = fields.indexOf(field);
            // const timeSerie = timeSeries[fieldIndex];
            //
            // //
            // const e = timeSerie.atTime(tracker);
            // const eventTime = new Date(e.begin().getTime() + (e.end().getTime() - e.begin().getTime()) / 2 );
            // const eventValue = e.get(statistic);
            // const v = `${eventValue}`;
            //
            // this.setState({ tracker: eventTime, trackerValue: v, trackerEvent: e });
        }
    }

    handleTimeRangeChange (timeRange) {
        this.setState({ timeRange });
    }

    handleMouseMove (x, y) {
        this.setState({ x, y });
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

        console.log(this.state)

        const { disabled, isLoading: isLoadingParent, mainField, sideFields, fieldStats } = this.props;
        const { timeSeries, timeRange, max, min, colors, isLoading } = this.state;

        if (disabled) return null;

        let legendCategs = [];
        let legendStyle = null;
        if (timeSeries) {

            let styles = [];

            //build categories for the legend
            Object.keys(timeSeries).forEach((k, idx) => {
                if (timeSeries.hasOwnProperty(k)) {

                    legendCategs.push({
                        key: timeSeries[k].name(),
                        label: `${timeSeries[k].name()} (${k})`,
                    });

                    styles.push({
                        key: timeSeries[k].name(), color: colors[idx],
                    });
                }
            });

            legendStyle = styler(styles);
        }

        return(

            <Panel bsStyle="primary" defaultExpanded>
                <Panel.Heading>
                    <Panel.Title toggle>
                        Time Series
                    </Panel.Title>
                </Panel.Heading>
                <Panel.Collapse>
                    <Panel.Body>
                        <LoadingOverlay>

                            {
                                (timeSeries && timeRange) &&
                                <div>
                                    <Row>
                                        <Col md={12}>
                                            <Resizable>
                                                <ChartContainer
                                                    timeRange={timeRange}
                                                    showGrid={false}
                                                    onTrackerChanged={this.handleTrackerChanged}
                                                    onBackgroundClick={() => this.setState({selection: null})}
                                                    enablePanZoom={true}
                                                    onTimeRangeChanged={this.handleTimeRangeChange}
                                                    onMouseMove={(x, y) => this.handleMouseMove(x, y)}
                                                >
                                                    <ChartRow height="250">
                                                        <YAxis
                                                            id="usage"
                                                            label="Usage %"
                                                            min={min}
                                                            max={max}
                                                            width="50"
                                                            type="linear"
                                                            format=",.2f"/>
                                                        <Charts>

                                                            <Baseline
                                                                axis="usage"
                                                                value={fieldStats.mean}
                                                                label="Mean"
                                                                position="right"
                                                            />

                                                            {
                                                                Object.keys(timeSeries).map((k, idx) => (
                                                                    <LineChart
                                                                        key={idx}
                                                                        axis="usage"
                                                                        breakLine={false}
                                                                        series={timeSeries[k]}
                                                                        columns={[mainField]}
                                                                        style={styler([
                                                                            {key: mainField, color: colors[idx]}
                                                                        ])}
                                                                        interpolation="curveBasis"
                                                                    />
                                                                ))
                                                            }

                                                        </Charts>
                                                    </ChartRow>
                                                </ChartContainer>
                                            </Resizable>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col md={12}>
                                            <span>
                                                <Legend
                                                    type="line"
                                                    align="right"
                                                    style={legendStyle}
                                                    categories={legendCategs}
                                                />
                                            </span>
                                        </Col>
                                    </Row>
                                </div>
                            }

                        </LoadingOverlay>
                        <Loader loading={isLoading || isLoadingParent}/>
                    </Panel.Body>
                </Panel.Collapse>
            </Panel>
        );
    }
}