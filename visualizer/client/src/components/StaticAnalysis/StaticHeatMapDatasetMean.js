import React from 'react';
import {config} from "../../config/config";

//react-bootstrap
import { Panel } from 'react-bootstrap';

//redux
import {
    getComputationRequest,
    getMeanPointsPerTimestamp,
    getComputationStage,
} from '../../store/selectors/heatMapComputationSelector';

import * as commonTypes from '../../store/types/commonTypes';

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
import {connect} from "react-redux";

//styles
const styles = {
    panel: {
    },
    panelBody: {
        height: "300px"
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

class StaticHeatMapDatasetMean extends React.Component {

    constructor(props) {
        super(props);

        this.state = {

        };
    }

    componentDidMount() {}

    componentDidUpdate() {}

    render() {

        const {computationRequest, meanPointsPerTimestamp, computationStage } = this.props;

        return(

            computationStage === commonTypes.COMPUTATION_STAGE_ANALYZED ?

          <Panel style={styles.panel}>
              <Panel.Heading>
                  <Panel.Title componentClass="h3">HeatMap Statistics</Panel.Title>
              </Panel.Heading>
              <Panel.Body style={styles.panelBody}>
                  <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={meanPointsPerTimestamp}
                                 margin={{top: 5, right: 30, left: 20, bottom: 5}}>
                          <YAxis/>
                          <XAxis dataKey="timestamp" hide={true}/>
                          <Tooltip/>
                          <Legend />
                          {
                              computationRequest.fields.map((field, index) => (
                                  <Line
                                      key={index}
                                      type="monotone"
                                      dataKey={field}
                                      stroke="#8884d8"
                                      activeDot={{r: 8}} />
                              ))
                          }
                      </LineChart>
                  </ResponsiveContainer>
              </Panel.Body>
          </Panel>
                :
                null
        );
    }
}

const mapStateToProps = (state) => {

    return {

        computationRequest: getComputationRequest(state),
        meanPointsPerTimestamp: getMeanPointsPerTimestamp(state),
        computationStage: getComputationStage(state),
    }
};

const mapDispatchToProps = (dispatch) => {

    return {


    }
};

export default connect(mapStateToProps, mapDispatchToProps)(StaticHeatMapDatasetMean);