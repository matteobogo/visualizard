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

export default class TimeSeriesChartsContainer extends React.Component {

    constructor() {
        super();

        this.state = {

            timeRange: null,
            timeSeries: null,
            max: 0,          //max value over the different timeseries (need to calibrate the yAxis in the chart)
            min: 0,          //as above with min
            colors: [],      //colors associated to timeseries
            isLoading: false,
        };
    }

    componentDidUpdate(prevProps, prevState, prevContext) {

        const {
            timeSerieData,  //contains the data of the timeseries
            mainField,      //the selected field of the timeserie to show in the chart (same for all timeseries)
            fieldStats,     //stats about the selected field (min, max, mean, std) over all the dataset
            sideFields,     //other fields to show in the highlight menu when charts are navigated
        } = this.props;

        const { timeSerieData: prevTimeSerieData } = prevProps;

        //if time range is changed, then rebuild the x-axis of the chart
        //data has the following structure:
        //{ machineIdx: { time: .., field1: .., field2: .., .. }, machineIdx: { .. }, .. }
        if (timeSerieData && mainField && fieldStats && sideFields &&
            JSON.stringify(timeSerieData) !== JSON.stringify(prevTimeSerieData)) {

            this.buildTimeSeriesCharts();
        }
    }

    buildTimeSeriesCharts = () => {

        const { configuration, mainField, timeSerieData } = this.props;
        const { max , min } = this.state;

        //max/min over all the timeseries
        //need to calibrate the Y-Axis of the chart when multiple timeseries are selected
        let newMax = max;
        let newMin = min;

        this.setState({isLoading: true});

        //build timeseries
        //timeseries data are stored as
        //idx: { name: xxx, fields: ['time', 'field1',  .. ], points: [ [time, value1, ..], .. ] }
        let timeSeries = {};
        Object.keys(timeSerieData).forEach(k => {
            if (timeSerieData.hasOwnProperty(k)) {

                //timeserie configuration
                //columns: [field1, field2, ..]
                //points: [ [ value1, value2, .. ], .. ]
                const data = {
                    name: timeSerieData[k].name,
                    columns: timeSerieData[k].fields,
                    points: timeSerieData[k].points,
                };

                timeSeries[k] = new TimeSeries(data);

                //check max/min of the field(s) of the current timeserie
                //if there are multiple fields we need to specify as argument the field(s)
                //if multiple fields are specified, pondjs returns a map field->value
                let tsMax = timeSeries[k].max(mainField);
                let tsMin = timeSeries[k].min(mainField);
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
            timeRange: timeRange,
            timeSeries: timeSeries,
            max: newMax,
            min: newMin,
            colors: colors,
            isLoading: false,
        });
    };

    render() {

        console.log(this.state)

        const { disabled, isLoading: isLoadingParent, mainField, sideFields, fieldStats } = this.props;
        const { timeRange, timeSeries, max, min, colors, isLoading } = this.state;

        if (disabled) return null;

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
                                                    enablePanZoom={true}
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
                                                    categories={
                                                        [{ key: 'a', label: 'AAA'}]
                                                    }
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