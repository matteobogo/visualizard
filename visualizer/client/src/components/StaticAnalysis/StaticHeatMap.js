import React, { Component } from 'react'

//react-bootstrap
import { Panel } from 'react-bootstrap';

const styles = {

};

export default class StaticHeatMap extends React.Component {

    render() {

        return(
              <Panel>
                  <Panel.Heading>
                      <Panel.Title componentClass="h3">HeatMap</Panel.Title>
                  </Panel.Heading>
                  <Panel.Body>
                      <img/>
                  </Panel.Body>
              </Panel>
        );
    }
}