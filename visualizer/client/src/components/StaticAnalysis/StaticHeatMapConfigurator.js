import React from 'react';
import {config} from '../../config/config';

//react-bootstrap
import {
    Grid,
    Row,
    Col,
    Panel,
    Button,
    ButtonToolbar,
    OverlayTrigger,
    Tooltip,
    DropdownButton,
    MenuItem,
    ProgressBar
} from 'react-bootstrap';

//react-widgets - datetimepicker
import 'react-widgets/dist/css/react-widgets.css';
import { DateTimePicker } from 'react-widgets';

//styles
const styles = {
    panel: {
    },
    panelBody: {
        height: "250px",
    },
    dateTimePicker: {
        marginBottom: "5px",
        width: "100%",
    },
    optionsSelectionRow: {
        marginTop: "5px",
    },
    dropdownButton: {
        marginBottom: "5px",
        width: "120px"
    },
    progressBar: {
        marginTop: "10px"
    },
    buttonsComputationRow: {

    },
    computeButton: {

    }
};

const tooltips = {
    databaseInfo:
        <Tooltip id="database-info-tooltip">
            Test!
        </Tooltip>
};


export default class StaticHeatMapConfigurator extends React.Component {

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
            //



            // Completed of async action, set loading state back
            this.setState({ isLoading: false });
        }, 2000);
    }

    componentDidMount() {

    }

    render() {
        return(
            <Panel style={styles.panel}>
                <Panel.Heading>
                    <Panel.Title componentClass="h3">Configurator</Panel.Title>
                </Panel.Heading>
                <Panel.Body style={styles.panelBody}>
                    <Grid fluid>
                        <Row>
                            <Col xs={12}>
                                <DateTimePicker
                                    id="datetime-start"
                                    style={styles.dateTimePicker}/>
                            </Col>
                            <Col xs={12}>
                                <DateTimePicker
                                    id="datetime-end"
                                    style={styles.dateTimePicker}/>
                            </Col>
                        </Row>
                        <Row style={styles.optionsSelectionRow}>
                            <Col xs={12}>
                                <ButtonToolbar style={{justifyContent: "center"}}>
                                    <OverlayTrigger placement="bottom" overlay={tooltips.databaseInfo}>
                                        <DropdownButton
                                            bsSize="small"
                                            title="select database"
                                            id="dropdown-database"
                                            style={styles.dropdownButton}>

                                        </DropdownButton>
                                    </OverlayTrigger>
                                    <DropdownButton
                                        bsSize="small"
                                        title="select policy"
                                        id="dropdown-policy"
                                        style={styles.dropdownButton}>

                                    </DropdownButton>
                                    <DropdownButton
                                        bsSize="small"
                                        title="select field"
                                        id="dropdown-field"
                                        style={styles.dropdownButton}>

                                    </DropdownButton>
                                    <DropdownButton
                                        bsSize="small"
                                        title="select palette"
                                        id="dropdown-palette"
                                        style={styles.dropdownButton}>

                                    </DropdownButton>
                                </ButtonToolbar>
                            </Col>
                        </Row>
                        <Row>
                            <Col xs={12}>
                                <ProgressBar active now={0} style={styles.progressBar}/>
                            </Col>
                        </Row>
                        <Row style={styles.buttonsComputationRow}>
                            <Col xs={12}>
                                <Button
                                    className="pull-left"
                                    bsStyle="primary"
                                    style={styles.computeButton}>
                                    Compute
                                </Button>
                            </Col>
                        </Row>
                    </Grid>
                </Panel.Body>
            </Panel>
        );
    }
}