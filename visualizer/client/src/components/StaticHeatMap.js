import React from 'react';
import {config} from '../config/config';

//react-bootstrap
import { Panel } from 'react-bootstrap';

//styled-components
import styled from 'styled-components';

const PanelWrapper = styled.div`
`;

export default class StaticHeatMap extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            isLoading: false
        };
    }

    componentDidMount() {

        //change to onClick
        this.setState({isLoading: true});

        fetch(config.API_URL+'' +
            '/heatmaps?' +
            'type=sortByMachine&' +
            'dbname=google_cluster&' +
            'policy=autogen&' +
            'interval=2011-02-01T00:15:00.000Z,2011-02-04T13:30:00.000Z&' +
            'fields=mean_cpu_usage_rate&' +
            'n_measurements=100&' +
            'period=300')
            .then(res => {
                return res.text();
            })
            .then((res => {
                this.setState({
                    image: res,
                    isLoading: false
                });
            }));

        //TODO errore cosa fare?
    }

    render() {

        const { isLoading, image } = this.state;

        if (isLoading) {
            //loading component
        }

        return(
          <div>
              <PanelWrapper>
                  <Panel>
                      <Panel.Heading>
                          <Panel.Title componentClass="h3"> HeatMap</Panel.Title>
                      </Panel.Heading>
                      <Panel.Body>
                          <img src={image} />
                      </Panel.Body>
                  </Panel>
              </PanelWrapper>
          </div>
        );
    }
}