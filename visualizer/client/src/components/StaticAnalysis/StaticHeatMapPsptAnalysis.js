import React from 'react';
import {config} from "../../config/config";

//react-bootstrap
import { Panel, Grid, Row, Col, ButtonToolbar, ToggleButtonGroup, ToggleButton } from 'react-bootstrap';

//react-widgets
import {DropdownList} from "react-widgets";

//react-timeseries-charts
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
} from "react-timeseries-charts";

import { format } from "d3-format";
import _ from "underscore";

//chroma-js
const chroma = require('chroma-js');

//styles
const styles = {
    panel: {
    },
    panelBody: {
        // height: "350px"
    }
};

const _STATS = ['min', 'max', 'sum', 'mean'];

class CrossHairs extends React.Component {
    render() {
        const { x, y } = this.props;
        const style = { pointerEvents: "none", stroke: "#ccc" };
        if (!_.isNull(x) && !_.isNull(y)) {
            return (
                <g>
                    <line style={style} x1={0} y1={y} x2={this.props.width} y2={y} />
                    <line style={style} x1={x} y1={0} x2={x} y2={this.props.height} />
                </g>
            );
        } else {
            return <g />;
        }
    }
}

export default class StaticHeatMapPsptAnalysis extends React.Component {

    constructor() {
        super();

        this.state = {

            timeSeries: [],
            timeRange: null,
            styler: null,

            tracker: null,
            x: null,
            y: null,

            selectedField: null,
            fields: {},

            selectedStat: null,
        };

        this.handleTrackerChanged = this.handleTrackerChanged.bind(this);
        this.handleTimeRangeChange = this.handleTimeRangeChange.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);

        this.onFieldSelected = this.onFieldSelected.bind(this);
        this.onStatSelected = this.onStatSelected.bind(this);
    }

    componentDidMount() {

        const {datasetAnalysis, psptAnalysis} = this.props;

        // { assigned_memory_usage:
        //     [ [ 1296519300000, 0.009496, 0.046472, 0.254974, 0.025497 ],
        //         [ 1296519600000, 0.010141, 0.046549, 0.264555, 0.026456 ],
        //         [ 1296519900000, 0.008845, 0.041455, 0.259888, 0.025989 ],
        //         [ 1296520200000, 0.008788, 0.041748, 0.25783, 0.025783 ] ],
        // ..
        // }

        // [ timestamp, min, max, sum, mean ], ..

        if (psptAnalysis && datasetAnalysis.fields.length > 0) {

            //init fields/index structure
            let fields = {};
            datasetAnalysis.fields.forEach((field, index) => {

                fields[field] = index;
            });

            //generate the time series
            let timeseries = [];
            datasetAnalysis.fields.forEach(field => {

                timeseries.push(this.createTimeSeries(psptAnalysis[field]));
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
                selectedField: datasetAnalysis.fields.slice(0,1),
                selectedStat: _STATS[_STATS.length - 1],
            });
        }
    }

    createTimeSeries(points) {

        return new TimeSeries({

            name: "Resource Usage",
            columns: ["time", "min", "max", "sum", "mean"],
            points: points
        });
    }

    handleTrackerChanged (tracker) {
        if (!tracker) {
            this.setState({ tracker, x: null, y: null });
        }
        else {
            this.setState({ tracker });
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

    render() {

        const { datasetAnalysis, psptAnalysis } = this.props;
        const { fields, timeSeries, timeRange, selectedField, selectedStat, tracker, styler } = this.state;

        if (timeSeries !== null && timeRange !== null) {

            //start/end interval for time range
            const startTime = new Date(datasetAnalysis.startInterval);
            const endTime = new Date(datasetAnalysis.endInterval);

            //get the field index for obtaining the right TimeSerie instance (using a structure { field: index } )
            const timeSerieIndex = fields[selectedField];

            const f = format(",.6f");

            let fieldValue;
            if (tracker) {

                const idx = timeSeries[timeSerieIndex].bisect(tracker);
                const trackerEvent = timeSeries[timeSerieIndex].at(idx);
                fieldValue = `${f(trackerEvent.get(selectedStat))}`;
            }

            let categories = [{
                key: datasetAnalysis.fields[timeSerieIndex],
                label: datasetAnalysis.fields[timeSerieIndex],
                value: fieldValue
            }];

            return (

                <Panel style={styles.panel}>
                    <Panel.Heading>
                        <Panel.Title componentClass="h3">Points Stats per Timestamp (Zoomable)</Panel.Title>
                    </Panel.Heading>
                    <Panel.Body style={styles.panelBody}>
                        <Grid>
                            <Row>
                                <Col xs={12}>
                                    <Resizable>
                                        <ChartContainer
                                            timeRange={timeRange}
                                            minTime={startTime}
                                            maxTime={endTime}
                                            showGrid={false}
                                            onTrackerChanged={this.handleTrackerChanged}
                                            onBackgroundClick={() => this.setState({ selection: null })}
                                            enablePanZoom={true}
                                            onTimeRangeChanged={this.handleTimeRangeChange}
                                            onMouseMove={(x, y) => this.handleMouseMove(x, y)}
                                            minDuration={1000 * 60 * 60 * 24 * 30}
                                        >

                                            <ChartRow height={250}>
                                                <YAxis
                                                    id="y"
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
                                                        axis="y"
                                                        breakLine={false}
                                                        series={timeSeries[timeSerieIndex]}
                                                        columns={[selectedStat]}
                                                        interpolation="curveBasis"
                                                        highlight={this.state.hightlight}
                                                        onHighLightChange={hightlight => this.setState({ hightlight })}
                                                        selection={this.state.selection}
                                                        onSelectionChange={selection => this.setState({ selection })}
                                                    />
                                                    <CrossHairs x={this.state.x} y={this.state.y} />
                                                </Charts>
                                            </ChartRow>
                                        </ChartContainer>
                                    </Resizable>
                                </Col>
                            </Row>
                            <Row>
                                <Col xs={12}>
                                    <span>
                                        <Legend
                                            style={styler}
                                            type="line"
                                            align="right"
                                            highlight={this.state.highlight}
                                            onHighlightChange={highlight => this.setState({ highlight })}
                                            selection={this.state.selection}
                                            onSelectionChange={selection => this.setState({ selection })}
                                            categories={categories}
                                        />
                                    </span>
                                </Col>
                            </Row>
                            <Row>
                                <Col xs={3}>
                                    <DropdownList
                                        data={datasetAnalysis.fields}
                                        placeholder="change field.."
                                        onChange={value => this.onFieldSelected(value)}
                                    />
                                </Col>
                                <Col xs={2}>
                                    <DropdownList
                                        data={_STATS}
                                        placeholder="change statistic.."
                                        onChange={value => this.onStatSelected(value)}
                                    />
                                </Col>
                            </Row>
                        </Grid>
                    </Panel.Body>
                </Panel>
            );
        }
        else return null;
    }
}