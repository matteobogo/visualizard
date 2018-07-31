import React from 'react';
import {config} from "../../config/config";

//react-bootstrap
import { Panel } from 'react-bootstrap';

//recharts
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from 'recharts';

//styles
const styles = {
    panel: {
    },
    panelBody: {
        height: "250px"
    }
};

//TEST
const data = [
    {name: 'A', uv: 4000, mean: 2400, amt: 2400},
    {name: 'B', uv: 3000, mean: 1398, amt: 2210},
    {name: 'C', uv: 2000, mean: 9800, amt: 2290},
    {name: 'D', uv: 2780, mean: 3908, amt: 2000},
    {name: 'E', uv: 1890, mean: 4800, amt: 2181},
    {name: 'F', uv: 2390, mean: 3800, amt: 2500},
    {name: 'G', uv: 3490, mean: 4300, amt: 2100},
];

export default class StaticHeatMapStats extends React.Component {

    constructor(props) {
        super(props);

        this.state = {

        };
    }

    componentDidMount() {


    }

    render() {
        return(
          <Panel style={styles.panel}>
              <Panel.Heading>
                  <Panel.Title componentClass="h3">HeatMap Statistics</Panel.Title>
              </Panel.Heading>
              <Panel.Body style={styles.panelBody}>
                  <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data}
                                 margin={{top: 5, right: 30, left: 20, bottom: 5}}>
                          <XAxis dataKey="name"/>
                          <YAxis/>
                          <Tooltip/>
                          <Legend />
                          <Line type="monotone" dataKey="mean" stroke="#8884d8" activeDot={{r: 8}}/>
                      </LineChart>
                  </ResponsiveContainer>
              </Panel.Body>
          </Panel>
        );
    }
}