import React from 'react';
import {config} from "../../config/config";

//react-bootstrap
import { Panel } from 'react-bootstrap';

//recharts
import {
    ResponsiveContainer,
    LineChart,
    Line,
    AreaChart,
    Area,
    Brush,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from 'recharts';

const styles = {
    panelBody: {
        height: "250px"
    }
};

//TEST
const data = [
    {name: 'A', uv: 4000, pv: 9000},
    {name: 'B', uv: 3000, pv: 7222},
    {name: 'C', uv: 2000, pv: 6222},
    {name: 'D', uv: 1223, pv: 5400},
    {name: 'E', uv: 1890, pv: 3200},
    {name: 'F', uv: 2390, pv: 2500},
    {name: 'G', uv: 3490, pv: 1209},
];

export default class StaticHeatMapRowStats extends React.Component {

    constructor(props) {
        super(props);

        this.state = {

        };
    }

    render() {
        return(
            <Panel>
                <Panel.Heading>
                    <Panel.Title>Machine Stats</Panel.Title>
                </Panel.Heading>
                <Panel.Body style={styles.panelBody}>
                    <ResponsiveContainer width='100%' height='100%'>
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name"/>
                            <YAxis/>
                            <Tooltip/>
                            <Legend verticalAlign="bottom" iconType="line" />
                            <Area type="monotone" dataKey="uv" stroke="#8884d8" fillOpacity={1} fill="url(#colorUv)"/>
                        </AreaChart>
                    </ResponsiveContainer>
                </Panel.Body>
            </Panel>
        );
    }
}