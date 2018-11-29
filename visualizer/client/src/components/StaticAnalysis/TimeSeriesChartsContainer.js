import React from 'react';

import * as localConstants from '../../utils/constants';

import { Panel, Row, Col } from 'react-bootstrap';

import { LoadingOverlay, Loader } from 'react-overlay-loader';
import 'react-overlay-loader/styles.css';

import { TimeSeries, TimeRange } from 'pondjs';
import { Charts, ChartContainer, ChartRow, YAxis, LineChart, Baseline, Resizable, Legend, styler, EventMarker,
} from "react-timeseries-charts";

import './TimeSeriesChartsContainer.css';

const trackerStyle = {
    line: {
        stroke: "#a62011",
        cursor: "crosshair",
        pointerEvents: "none"
    }
};

const NullMarker = props => {
    return <g />;
};

const buildMarkerInfo = (timeSeries, tracker, mainField, sideFields, mode='object') => {

    let trackerEvents = [];
    for (let [key, value] of timeSeries) {
        trackerEvents.push(value.atTime(tracker));
    }

    let infos = [];
    trackerEvents.forEach((trackerEvent, idx) => {

        let sideFieldsValues = "";
        sideFields.forEach((sideField) => {

            sideFieldsValues += `${trackerEvent.get(sideField)} (${sideField}) `;
        });

        let label;
        if (mode === 'object') {
            label = {
                label: `${Array.from(timeSeries.values())[idx].name()}`,
                value: `${trackerEvent.get(mainField)}${sideFieldsValues}`,
            };
        }
        //generate label string: <timeserie_name>: <value_main_field> <value_side_field> ... <value_side_field>
        else if (mode === 'string') {
            label =
                `
                [${trackerEvent.get(mainField)}]${sideFieldsValues}]
                `;
        }

        infos.push(label);
    });
    return infos;
};

export default class TimeSeriesChartsContainer extends React.Component {

    constructor() {
        super();

        this.state = {

            lastTimeSerieIndexes: [],

            timeRange: null,
            timeSeries: null,
            colors: null,
            legendCategs: null,
            legendStyles: null,

            tracker: null,
            trackerEvents: null,
            trackerValues: null,

            max: 0,          //max value over the different timeseries (need to calibrate the yAxis in the chart)
            min: 0,          //as above with min
        };

        this.handleTrackerChanged = this.handleTrackerChanged.bind(this);
        this.handleTimeRangeChange = this.handleTimeRangeChange.bind(this);
    }

    componentDidUpdate(prevProps, prevState, prevContext) {

        const {
            timeSeriesMap,  //contains the data of the timeseries
            mainField,      //the selected field of the timeserie to show in the chart (same for all timeseries)
            fieldStats,     //stats about the selected field (min, max, mean, std) over all the dataset
            sideFields,     //other fields to show in the highlight menu when charts are navigated
        } = this.props;

        const {
            timeSeriesMap: prevTimeSeriesMap,
        } = prevProps;

        //guard
        if (!timeSeriesMap || !mainField || !fieldStats || !sideFields) return;

        //if time range is changed, then rebuild the x-axis of the chart
        //data has the following structure:
        //{ machineIdx: { time: .., field1: .., field2: .., .. }, machineIdx: { .. }, .. }
        if ((timeSeriesMap.size !== prevTimeSeriesMap.size) ||
            this.state.lastTimeSerieIndexes.length !== timeSeriesMap.size) {    //TODO necessario il lastimeserieindexe?

            this.buildTimeSeriesCharts();
        }
    }

    buildTimeSeriesCharts = () => {

        const { configuration, mainField, timeSeriesMap } = this.props;
        const { max , min } = this.state;

        //mapping timeserie-index => timeserie object (pond.js)
        const timeSeries = new Map();

        //max/min over all the timeseries
        //need to calibrate the Y-Axis of the chart when multiple timeseries are selected
        let newMax = max;
        let newMin = min;

        let colors = [];
        let legendCategs = [];
        let legendStyles = [];
        for (let [key, value] of timeSeriesMap) {

            //build the timeserie object
            const timeserie = new TimeSeries({
                name: value.name,        //'timeserie_name'
                columns: value.fields,   //[ 'time', 'field1', 'field2', ..]
                points: value.points,    //[ [time, value1, value2, ..], ..]
            });

            //assign the timeserie obj
            timeSeries.set(key, timeserie);

            //colors
            colors.push(value.color);

            //categs (legend)
            legendCategs.push({
                key: value.name,
                label: `${value.name} (${key})`,
            });

            //style (legend)
            legendStyles.push({
                key: value.name,
                color: value.color,
            });

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
            colors: colors,
            legendCategs: legendCategs,
            legendStyles: legendStyles,
            max: newMax,
            min: newMin,
            isLoading: false,
        });
    };

    handleTrackerChanged(tracker) {

        const { timeSeries } = this.state;
        const { currentFocus, mainField } = this.props;

        if (!timeSeries) return;

        if (currentFocus.timestamp === 'No Data') this.setState({ tracker: null, trackerEvents: null });

        //if the user doesn't have the focus on the chart, we track the ts focused in the heatmap (if any)
        if (!tracker) {
            tracker = new Date(currentFocus.timestamp);
        }

        let trackerEvents = [];
        let trackerValues = [];

        for (let [key, value] of timeSeries) {

            trackerEvents.push(value.at(value.bisect(tracker)));
            trackerValues.push(value.atTime(tracker).get(mainField));
        }

        this.setState({
            tracker: tracker,
            trackerEvents: trackerEvents,
            trackerValues: trackerValues,
        });
    }

    handleTimeRangeChange (timeRange) {
        this.setState({ timeRange });
    }

    renderFocusMarker = () => {

        const { currentFocus, mainField, sideFields } = this.props;
        const { timeSeries } = this.state;

        if (!currentFocus || !timeSeries || !mainField || !sideFields) return <NullMarker/>;
        if (!timeSeries.has(currentFocus.timeSerieIdx)) return <NullMarker/>;

        const tracker = new Date(currentFocus.timestamp);

        //build new map with only the current timeserie focused
        //TODO need to re-design this shit
        const newTimeSeries = new Map(timeSeries);
        for(let [key, _] of timeSeries) {
            if (key !== currentFocus.timeSerieIdx) newTimeSeries.delete(key);
        }

        return(
            <EventMarker
                type="point"
                axis="usage"
                event={Array.from(newTimeSeries.values())[0].atTime(tracker)}
                column={mainField}
                markerRadius={4}
                markerStyle={{fill: `${currentFocus.color}`, stroke: "black"}}
                markerLabel={buildMarkerInfo(newTimeSeries,tracker,mainField,sideFields,'string')}
                markerLabelAlign="top"
                markerLabelStyle={{
                    opacity: 1.0,
                    stroke: "black",
                    fill: "white",
                    strokeWidth: 1,
                }}
            />
        );
    };

    renderMarker = () => {

        const { mainField, sideFields } = this.props;
        const { timeSeries, tracker, trackerEvents } = this.state;

        if (!this.state.tracker) {
            return <NullMarker/>;
        }

        return (

            <EventMarker
                type="flag"
                axis="usage"
                event={trackerEvents[0]}
                column={mainField}
                info={buildMarkerInfo(timeSeries, tracker, mainField, sideFields,'object')}
                infoWidth={350}
                infoHeight={30 * trackerEvents.length}
                // infoStyle={{
                //     fill: "none",
                //     strokeWidth: 1,
                //     opacity: 1.0,
                //     stroke: `${currentFocus.color}`,
                // }}
                markerRadius={2}
                markerStyle={{ fill: "#2db3d1" }}
            />
        );
    };

    render() {

        const { disabled, isLoading, mainField, sideFields, fieldStats } = this.props;
        const { timeSeries, timeRange, colors, legendCategs, legendStyles, max, min } = this.state;

        if (disabled) return null;

        const markerStyle = {
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            color: "#AAA",
            marginLeft: "5px"
        };

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
                                timeSeries &&
                                <div>
                                    {/*<Row>*/}
                                        {/*<Col xs={12}>*/}
                                            {/*<div className="tracker-info-container">*/}
                                                {/*{*/}
                                                    {/*this.state.tracker ?*/}

                                                        {/*this.state.trackerEvents.map((e, idx) => (*/}

                                                            {/*<Col xs={12} key={idx}>*/}
                                                                {/*<div className="tracker-info-box">*/}
                                                                    {/*<svg height="5" width="15">*/}
                                                                        {/*<line*/}
                                                                            {/*x1="0" y1="4" x2="10" y2="4"*/}
                                                                            {/*style={{stroke: colors[idx]}}*/}
                                                                        {/*/>*/}
                                                                    {/*</svg>*/}
                                                                    {/*<p>{mainField}: {e.get(mainField)}</p>*/}
                                                                    {/*{*/}
                                                                        {/*sideFields.map((f, idx) => (*/}
                                                                            {/*<p key={idx}>{f}: {e.get(f)}</p>*/}
                                                                        {/*))*/}
                                                                    {/*}*/}
                                                                    {/*<p>({this.state.tracker.toISOString()})</p>*/}
                                                                {/*</div>*/}
                                                            {/*</Col>*/}
                                                        {/*))*/}

                                                        {/*: null*/}
                                                {/*}*/}
                                            {/*</div>*/}
                                        {/*</Col>*/}
                                    {/*</Row>*/}
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
                                                                Array.from(timeSeries.values()).map((k, idx) => (
                                                                    <LineChart
                                                                        key={idx}
                                                                        axis="usage"
                                                                        breakLine={false}
                                                                        series={k}
                                                                        columns={[mainField]}
                                                                        style={styler([
                                                                            {
                                                                                key: mainField,
                                                                                color: colors[idx],
                                                                            }
                                                                        ])}
                                                                        interpolation="curveBasis"
                                                                    />
                                                                ))
                                                            }

                                                            { this.renderMarker() }

                                                            { this.renderFocusMarker() }

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
                                                style={styler(legendStyles)}
                                                categories={legendCategs}
                                            />
                                        </span>
                                        </Col>
                                    </Row>
                                </div>
                            }

                        </LoadingOverlay>
                        <Loader loading={isLoading}/>
                    </Panel.Body>
                </Panel.Collapse>
            </Panel>
        );
    }
}