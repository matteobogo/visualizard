import React from 'react';
import {config} from "../config/config";

//react-bootstrap
import { Panel } from 'react-bootstrap';

//styled-components
import styled from 'styled-components';

//styles
const PanelWrapper = styled.div`
`;

export default class HeatMapStats extends React.Component {

    constructor(props) {
        super(props);

        this.state = {

        };
    }

    componentDidMount() {


    }

    render() {
        return(
          <PanelWrapper>
              <Panel>
                  <Panel.Heading>
                      <Panel.Title componentClass="h3">HeatMap Statistics</Panel.Title>
                  </Panel.Heading>
                  <Panel.Body>

                  </Panel.Body>
              </Panel>
          </PanelWrapper>
        );
    }
}