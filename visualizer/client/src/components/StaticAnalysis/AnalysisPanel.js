import React from 'react';
import { config } from "../../config/config";

import { Panel, Grid, Row, Col, Form, FormGroup, ControlLabel } from 'react-bootstrap';
import {DropdownList} from "react-widgets";

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

import '../../styles/pspt-analysis.css';

const _STATS = ['min', 'max', 'sum', 'mean'];

const NullMarker = props => {
    return <g />
};

// class CrossHairs extends React.Component {
//     render() {
//         const { x, y } = this.props;
//         const style = { pointerEvents: "none", stroke: "#ccc" };
//         if (!_.isNull(x) && !_.isNull(y)) {
//             return (
//                 <g>
//                     <line style={style} x1={0} y1={y} x2={this.props.width} y2={y} />
//                     <line style={style} x1={x} y1={0} x2={x} y2={this.props.height} />
//                 </g>
//             );
//         } else {
//             return <g />;
//         }
//     }
// }

export default class AnalysisPanel extends React.Component {

    constructor() {
        super();

        this.state = {

            timeSeries: [],
            timeRange: null,
            styler: null,

            tracker: null,
            trackerValue: "--",
            trackerEvent: null,

            x: null,
            y: null,

            selectedField: null,
            fields: {},

            selectedStat: null,

            isLoading: false,
        };

        this.handleTrackerChanged = this.handleTrackerChanged.bind(this);
        this.handleTimeRangeChange = this.handleTimeRangeChange.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);

        this.onFieldSelected = this.onFieldSelected.bind(this);
        this.onStatSelected = this.onStatSelected.bind(this);
    }

    componentDidMount() {


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

            //init fields/index structure (maps an index to a field name)
            let fields = {};
            datasetAnalysis.fields.forEach((field, index) => {

                fields[field] = index;
            });

            //generate the time series
            let timeseries = [];
            datasetAnalysis.fields.forEach(field => {

                timeseries.push(createTimeSeries(psptAnalysis[field]));
            });

            //generate the time range
            const timeRange = new TimeRange([datasetAnalysis.startInterval, datasetAnalysis.endInterval]);

            //generate styler
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
                fields: fields,
                timeSeries: timeseries,
                timeRange: timeRange,
                styler: sty,
                selectedField: datasetAnalysis.fields.slice(0, 1),
                selectedStat: _STATS[_STATS.length - 1],
            });
        }
    };

    componentDidUpdate(prevProps, prevState, prevContect) {

        const { datasetAnalysis, psptAnalysis } = this.props;
        const { datasetAnalysis: prevDatasetAnalysis, psptAnalysis: prevPsptAnalysis} = prevProps;

        if (datasetAnalysis && psptAnalysis && !this.state.isLoading &&
            JSON.stringify(datasetAnalysis) !== JSON.stringify(prevDatasetAnalysis) ||
            JSON.stringify(psptAnalysis) !== JSON.stringify(prevPsptAnalysis)) {

            this.setState({ isLoading: true });

            this.populateChart(datasetAnalysis, psptAnalysis)
                .catch(err => {})
                .then(() => this.setState({ isLoading: false }));
        }
    }

    handleTrackerChanged (tracker) {

        const { timeSeries, fields, selectedField } = this.state;

        if (!tracker) {
            this.setState({ tracker: null, trackerValue: null, trackerEvent: null, x: null, y: null });
        }
        else {

            const timeSerie = timeSeries[fields[selectedField]];
            const e = timeSerie.atTime(tracker);
            const eventTime = new Date(e.begin().getTime() + (e.end().getTime() - e.begin().getTime()) / 2 );
            const eventValue = e.get(this.state.selectedStat);
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

    onFieldSelected(field) {

        this.setState({ selectedField: field});
    }

    onStatSelected(stat) {

        this.setState({ selectedStat: stat });
    }
    
    renderMarker () {
        
        if (!this.state.tracker) {
            
            return <NullMarker/>;
        } 
        
        return (
          <EventMarker
            type="flag"
            axis="axis"
            event={this.state.trackerEvent}
            column={this.state.selectedStat}
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
        const { isLoading, fields, timeSeries, timeRange, selectedField, selectedStat, tracker, styler } = this.state;

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

            //get the field index for obtaining the right TimeSerie instance (using a structure { field: index } )
            timeSerieIndex = fields[selectedField];

            const f = format(",.6f");

            let fieldValue;
            if (tracker) {

                const idx = timeSeries[timeSerieIndex].bisect(tracker);
                const trackerEvent = timeSeries[timeSerieIndex].at(idx);

                fieldValue = `${f(trackerEvent.get(selectedStat))}`;   //statistic (selected)
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

            <Panel defaultExpanded>
                <Panel.Heading>
                    <Panel.Title toggle>
                        Points Stats per Timestamp (Zoomable)
                    </Panel.Title>
                </Panel.Heading>
                <Panel.Body>

                    <LoadingOverlay className="loading-overlay-container">

                        {datasetAnalysis ?

                            <div className="menu-container">
                                <Form>
                                    <Col xs={12} sm={6} md={3}>
                                        <FormGroup>
                                            <ControlLabel>Measure</ControlLabel>
                                            <div className="dropdowns-container">
                                                <DropdownList
                                                    data={datasetAnalysis.fields}
                                                    //placeholder="change field.."
                                                    defaultValue={
                                                        datasetAnalysis.fields.length > 0 &&
                                                        datasetAnalysis.fields[0]
                                                    }
                                                    onChange={value => this.onFieldSelected(value)}
                                                />
                                            </div>
                                        </FormGroup>
                                    </Col>
                                    <Col xs={12} sm={6} md={3}>
                                        <FormGroup>
                                            <ControlLabel>Statistic</ControlLabel>
                                            <div className="dropdowns-container">
                                                <DropdownList
                                                    data={_STATS} //TODO obtain the list from server
                                                    //placeholder="change statistic.."
                                                    defaultValue={
                                                        _STATS[_STATS.length - 1] //mean default
                                                    }
                                                    onChange={value => this.onStatSelected(value)}
                                                />
                                            </div>
                                        </FormGroup>
                                    </Col>
                                </Form>
                            </div>

                            : null
                        }

                        {timeRange && timeSeries ?

                            <Row className="timeserie-chart-container">
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
                                                    min={timeSeries[timeSerieIndex].min(selectedStat)}
                                                    max={timeSeries[timeSerieIndex].max(selectedStat)}
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
                                                        columns={[selectedStat]}
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
                            </Row>

                            : null
                        }

                        {categories ?

                            <Row>
                                <Col xsOffset={2}>
                                <span>
                                    <Legend
                                        style={styler}
                                        type="line"
                                        align="right"
                                        //highlight={this.state.highlight}
                                        //onHighlightChange={highlight => this.setState({ highlight })}
                                        //selection={this.state.selection}
                                        //onSelectionChange={selection => this.setState({ selection })}
                                        categories={categories}
                                        //stack={true}
                                    />
                                </span>
                                </Col>
                            </Row>

                            : null
                        }

                    </LoadingOverlay>
                    <Loader loading={isLoading}/>

                </Panel.Body>
            </Panel>

        );
    }
}