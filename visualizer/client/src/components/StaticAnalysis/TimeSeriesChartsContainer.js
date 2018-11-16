import React from 'react';

import * as localConstants from '../../utils/constants';

import { Panel, Row, Col } from 'react-bootstrap';

import { LoadingOverlay, Loader } from 'react-overlay-loader';
import 'react-overlay-loader/styles.css';

import { TimeSeries, TimeRange } from 'pondjs';
import {
    Charts,
    ChartContainer,
    ChartRow,
    YAxis,
    LineChart,
    Baseline,
    Resizable,
    Legend,
    styler,
} from "react-timeseries-charts";

import './TimeSeriesChartsContainer.css';

const trackerStyle = {
    line: {
        stroke: "#a62011",
        cursor: "crosshair",
        pointerEvents: "none"
    }
};

export default class TimeSeriesChartsContainer extends React.Component {

    constructor() {
        super();

        this.state = {

            lastTimeSerieIndexes: [],

            timeRange: null,
            timeSeries: null,

            tracker: null,
            trackerEvents: null,

            max: 0,          //max value over the different timeseries (need to calibrate the yAxis in the chart)
            min: 0,          //as above with min

            isLoading: false,
        };

        this.handleTrackerChanged = this.handleTrackerChanged.bind(this);
        this.handleTimeRangeChange = this.handleTimeRangeChange.bind(this);
    }

    componentDidUpdate(prevProps, prevState, prevContext) {

        const {
            timeSeriesMap, //contains the data of the timeseries
            mainField,      //the selected field of the timeserie to show in the chart (same for all timeseries)
            fieldStats,     //stats about the selected field (min, max, mean, std) over all the dataset
            sideFields,     //other fields to show in the highlight menu when charts are navigated
            timestampFocus,
        } = this.props;

        const { timeSeriesMap: prevTimeSeriesMap } = prevProps;

        //if time range is changed, then rebuild the x-axis of the chart
        //data has the following structure:
        //{ machineIdx: { time: .., field1: .., field2: .., .. }, machineIdx: { .. }, .. }
        if (timeSeriesMap && mainField && fieldStats && sideFields && timestampFocus && (
            timeSeriesMap.size !== prevTimeSeriesMap.size) ||
            this.state.lastTimeSerieIndexes.length !== timeSeriesMap.size) {

            this.buildTimeSeriesCharts();
        }
    }

    buildTimeSeriesCharts = () => {

        const { configuration, mainField, timeSeriesMap } = this.props;
        const { max , min } = this.state;

        //max/min over all the timeseries
        //need to calibrate the Y-Axis of the chart when multiple timeseries are selected
        let newMax = max;
        let newMin = min;

        this.setState({isLoading: true});

        let timeSeries = new Map();
        for (let [key, value] of timeSeriesMap) {

            //build the timeserie object
            const timeserie = new TimeSeries({
                name: value.name,        //'timeserie_name'
                columns: value.fields,   //[ 'time', 'field1', 'field2', ..]
                points: value.points,    //[ [time, value1, value2, ..], ..]
            });

            //assign the timeserie obj
            timeSeries.set(key, timeserie);

            //check max/min of the field(s) of the current timeserie
            //if there are multiple fields we need to specify as argument the field(s)
            //if multiple fields are specified, pondjs returns a map field->value
            let tsMax = timeserie.max(mainField);
            let tsMin = timeserie.min(mainField);
            if (tsMax > newMax) newMax = tsMax;
            if (tsMin < newMin) newMin = tsMin;
        }

        //build the Time Range (Y-Axis)
        const timeRange = new TimeRange([
            configuration[localConstants._TYPE_SELECTED_START_INTERVAL],
            configuration[localConstants._TYPE_SELECTED_END_INTERVAL],
        ]);

        this.setState({
            lastTimeSerieIndexes: Array.from(timeSeriesMap.keys()),
            timeRange: timeRange,
            timeSeries: timeSeries,
            max: newMax,
            min: newMin,
            isLoading: false,
        });
    };

    handleTrackerChanged(tracker) {

        const { timeSeries } = this.state;

        if (!timeSeries) return;

        //if the user doesn't have the focus on the chart, we track the ts focused in the heatmap
        if (!tracker) {
            tracker = new Date(this.props.timestampFocus);
        }

        let trackerEvents = [];
        for (let [key, value] of timeSeries) {
            trackerEvents.push(value.at(value.bisect(tracker)));
        }

        this.setState({
            tracker: tracker,
            trackerEvents: trackerEvents,
        });
    }

    handleTimeRangeChange (timeRange) {
        this.setState({ timeRange });
    }

    render() {

        const {
            disabled, isLoading: isLoadingParent, mainField, sideFields, fieldStats, timeSeriesMap,
        } = this.props;

        const { timeSeries, timeRange, max, min, isLoading } = this.state;

        if (disabled) return null;

        let legendCategs = [];
        let legendStyle = null;
        if (timeSeries && timeSeriesMap) {

            let styles = [];

            //build categories for the legend
            for (let [key, value] of timeSeries) {
                legendCategs.push({
                    key: value.name(),
                    label: `${value.name()} (${key})`,
                });

                styles.push({
                    key: value.name(), color: timeSeriesMap.get(key).color,
                });
            }

            legendStyle = styler(styles);
        }

        console.log(this.state)
        console.log(this.props)

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
                                        <Col xs={12}>
                                            <div className="tracker-info-container">
                                                {
                                                    this.state.tracker ?

                                                        this.state.trackerEvents.map((e, idx) => (

                                                            <Col xs={12} key={idx}>
                                                                <div className="tracker-info-box">
                                                                    <svg height="5" width="15">
                                                                        <line
                                                                            x1="0" y1="4" x2="10" y2="4"
                                                                            style={{stroke: Array.from(timeSeriesMap.keys())[idx].color}}
                                                                        />
                                                                    </svg>
                                                                    <p>{mainField}: {e.get(mainField)}</p>
                                                                    {
                                                                        sideFields.map((f, idx) => (
                                                                            <p key={idx}>{f}: {e.get(f)}</p>
                                                                        ))
                                                                    }
                                                                </div>
                                                            </Col>
                                                        ))

                                                        : null
                                                }
                                            </div>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col md={12}>
                                            <Resizable>
                                                <ChartContainer
                                                    timeRange={timeRange}
                                                    showGrid={false}
                                                    trackerPosition={this.state.tracker}
                                                    trackerStyle={trackerStyle}
                                                    onTrackerChanged={(tracker) => this.handleTrackerChanged(tracker)}
                                                    onBackgroundClick={() => this.setState({selection: null})}
                                                    enablePanZoom={true}
                                                    enableDragZoom={true}
                                                    onTimeRangeChanged={this.handleTimeRangeChange}
                                                    //onMouseMove={(x, y) => this.handleMouseMove(x, y)}
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
                                                                Array.from(timeSeries.keys()).map((k, idx) => (
                                                                    <LineChart
                                                                        key={idx}
                                                                        axis="usage"
                                                                        breakLine={false}
                                                                        series={timeSeries.get(k)}
                                                                        columns={[mainField]}
                                                                        style={styler([
                                                                            {key: mainField, color: timeSeriesMap.get(k).color}
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