import React from 'react';
import {config} from '../config/config';

//react-bootstrap
import { Panel } from 'react-bootstrap';

const styles = {

};

export default class ServiceStatus extends React.Component {

    constructor(props) {
        super(props);

        this.state = {

        };
    }

    render() {
        return(
            <Panel>
                <Panel.Heading>
                    <Panel.Title componentClass="h3">Service Status</Panel.Title>
                </Panel.Heading>
                <Panel.Body>

                </Panel.Body>
            </Panel>
        );
    }
}