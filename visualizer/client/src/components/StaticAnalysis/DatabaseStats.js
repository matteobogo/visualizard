import React from 'react';
import {config} from "../../config/config";

//react-bootstrap
import {
    Panel
} from 'react-bootstrap'

//animated-number
import AnimatedNumber from 'react-animated-number';

//pretty bytes
import prettyBytes from 'pretty-bytes';

const styles = {

};

export default class DatabaseStats extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            bigValue: 1024
        };
    }

    render() {

        const {smallValue, bigValue} = this.state;

        return(
            <Panel>
                <Panel.Heading>
                    <Panel.Title componentClass="h3">Stats</Panel.Title>
                </Panel.Heading>
                <Panel.Body>
                    <AnimatedNumber
                        component="text"
                        value={bigValue}
                        style={{
                            transition: '0.8s ease-out',
                            fontSize: 20,
                            transitionProperty:
                                'background-color, color, opacity'
                        }}
                        frameStyle={perc => (
                            perc === 100 ? {} : {backgroundColor: '#ffeb3b'}
                            )}
                        duration={300}
                        formatValue={n => prettyBytes(n)}/>
                </Panel.Body>
            </Panel>
        );
    }
}