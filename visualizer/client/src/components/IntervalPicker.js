import React from 'react';
import {config} from '../config/config';

//react-bootstrap
import { Panel, Button } from 'react-bootstrap';

//react-widgets - datetimepicker
import 'react-widgets/dist/css/react-widgets.css';
import { DateTimePicker } from 'react-widgets';

//styled-components
import styled from 'styled-components';

//styles
const PanelWrapper = styled.div`
`;

const DateTimePickerStartWrapper = styled.div`
    width: 45%;
    float: left;
    margin-left: 10px;
`;

const DateTimePickerEndWrapper = styled.div`
    width: 45%;
    overflow: hidden;
    float: right;
    margin-right: 10px;
`;

export default class IntervalPicker extends React.Component {

    constructor(props) {
        super(props);

        this.handleClick = this.handleClick.bind(this);

        this.state = {
            isLoading: false
        };
    }

    handleClick() {
        this.setState({ isLoading: true });

        // This probably where you would have an `ajax` call
        setTimeout(() => {

            //TEST
            fetch(config.API_URL+'')



            // Completed of async action, set loading state back
            this.setState({ isLoading: false });
        }, 2000);
    }

    componentDidMount() {

    }

    render() {
        return(
            <PanelWrapper>
                <Panel>
                    <Panel.Heading>
                        <Panel.Title componentClass="h3">Select the interval</Panel.Title>
                    </Panel.Heading>
                    <Panel.Body style={{height: "100px"}}>
                        <DateTimePickerStartWrapper>
                            <DateTimePicker/>
                        </DateTimePickerStartWrapper>
                        <DateTimePickerEndWrapper>
                            <DateTimePicker/>
                        </DateTimePickerEndWrapper>
                    </Panel.Body>
                </Panel>
            </PanelWrapper>
        );
    }
}