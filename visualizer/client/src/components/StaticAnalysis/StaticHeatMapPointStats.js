import React from 'react';
import {config} from "../../config/config";

//react-bootstrap
import { Panel } from 'react-bootstrap';

//recharts
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Legend,
    Sector,
    Cell,
    Text,
    Tooltip
} from 'recharts';

const styles = {
    panelBody: {
        height: "250px"
    }
};

//TEST
const value = 0.0075;
const max = 0.0120;
const min = 0.0020;
const mean = 0.0085;
const mean_jobs = 19;
const mean_tasks = 87.3;
const n_jobs = 50;
const n_tasks = 82;

const data = [
    {name: 'Jobs', value: n_jobs},
    {name: 'Tasks', value: n_tasks},
];

const COLORS = ['#FFBB28', '#FF8042'];

export default class StaticHeatMapPointStats extends React.Component {

    constructor(props) {
        super(props);

        this.state = {

        };
    }

    render() {
        return(
            <Panel>
                <Panel.Heading>
                    <Panel.Title>Point Stats</Panel.Title>
                </Panel.Heading>
                <Panel.Body style={styles.panelBody}>
                    <ResponsiveContainer width='100%' height='100%'>
                        <PieChart>
                            <Tooltip/>
                            <Legend
                                align="center"
                                verticalAlign="bottom"
                                iconType="square"/>
                            <Pie
                                data={data}
                                dataKey="value"
                                nameKey="name"
                                cx="25%"
                                cy="50%"
                                outerRadius={60}
                                fill="#8884d8"
                                label>
                                {
                                    data.map((entry, index) => <Cell fill={COLORS[index % COLORS.length]}/>)
                                }
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </Panel.Body>
            </Panel>
        );
    }
}