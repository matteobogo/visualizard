import React from 'react';
import config from '../../config/config';

//automatically binds methods defined within a component's Class to
//the current object's lexical this instance
//use autobind(this) in constructor
import autoBind from 'react-autobind';

//redux
import { connect } from 'react-redux';

import * as actionTypes from '../../store/types/actionTypes';
import * as commonTypes from '../../store/types/commonTypes';

import { fetchItems, resetDatasetItems } from '../../store/actions/datasetInfoAction';
import { notify } from '../../store/actions/notificationsAction';
import { sendComputationRequest, resetPreviousComputationRequest } from '../../store/actions/heatmapComputationAction';

import { getItems, getHasErrored, getIsLoading } from '../../store/selectors/datasetInfoSelector';
import { getComputationStage } from '../../store/selectors/heatMapComputationSelector';


//react-bootstrap
import {
    Grid,
    Row,
    Col,
    Panel,
    Button,
    ButtonToolbar,
    OverlayTrigger,
    Overlay,
    Tooltip,
    DropdownButton,
    Dropdown,
    MenuItem,
    ProgressBar,
    FormGroup,
    FormControl
} from 'react-bootstrap';

//react-widgets - datetimepicker
import 'react-widgets/dist/css/react-widgets.css';
import { DateTimePicker } from 'react-widgets';

//custom spinner
import PacmanSpinner from '../PacmanSpinner';

//styles
const styles = {
    panel: {
    },
    panelBody: {
        height: "100%",
    },
    dateTimePicker: {
        marginBottom: "10px",
        width: "100%",
    },
    optionsSelectionRow: {
        marginTop: "5px",
    },
    progressBar: {
        marginTop: "10px"
    },
    buttonsComputationRow: {

    },
    computeButton: {

    },
    resetButton: {

    },
};

const initialState = {

    databaseSelected: "",
    policySelected: "",
    fieldSelected: "",
    paletteSelected: "",
    periodSelected: "",
    startIntervalSelected: new Date(),
    endIntervalSelected: new Date(),

    computationLocked: true,
    showComputationSpinner: false,
};

class StaticHeatMapConfigurator extends React.Component {

    constructor(props) {
        super(props);

        this.state = initialState;

        //binding to make this work in the callback
        this.computeButtonClick = this.computeButtonClick.bind(this);
    }

    componentDidMount() {

        this.fetchDatabases();
    }

    fetchDatabases() {

        this.props.fetchData(actionTypes._TYPE_DATABASE);
    }

    componentWillReceiveProps() {

        const { intervals } = this.props;

        if (intervals.firstInterval !== "" && intervals.lastInterval !== "") {

            this.setState({
                startIntervalSelected: new Date(intervals.firstInterval),
                endIntervalSelected: new Date(intervals.lastInterval),
            });
        }
    }

    onDatabaseSelected() {

        const { fetchData } = this.props;
        const databaseSelected = this.databaseSelected.value;

        if (databaseSelected !== "") {

            this.setState({databaseSelected: databaseSelected});

            //fetch policies list
            fetchData(actionTypes._TYPE_POLICY, databaseSelected);
        }
    }

    onPolicySelected() {

        const { fetchData } = this.props;
        const { databaseSelected } = this.state;
        const  policySelected = this.policySelected.value;

        if (policySelected !== "") {

            this.setState({policySelected: policySelected});

            //fetch fields list
            fetchData(actionTypes._TYPE_FIELD, databaseSelected);
        }
    }

    onFieldSelected() {

        const { fetchData } = this.props;
        const fieldSelected = this.fieldSelected.value;

        if (fieldSelected !== "") {

            this.setState({fieldSelected: fieldSelected});

            //fetch palettes list
            fetchData(actionTypes._TYPE_PALETTE);
        }
    }

    onPaletteSelected() {

        const { fetchData } = this.props;
        const paletteSelected = this.paletteSelected.value;

        if (paletteSelected !== "") {

            this.setState({paletteSelected: paletteSelected});

            //fetch periods list
            fetchData(actionTypes._TYPE_PERIOD);
        }
    }

    onPeriodSelected() {

        const { fetchData } = this.props;
        const { databaseSelected, policySelected, fieldSelected } = this.state;
        const periodSelected = this.periodSelected.value;

        if (periodSelected !== "") {

            this.setState({
                periodSelected: periodSelected,
                computationLocked: false,
            });

            //fetch first and last intervals
            fetchData(
                actionTypes._TYPE_INTERVALS,
                databaseSelected,
                policySelected,
                fieldSelected);
        }
    }

    static inputValidation(value) {

        return value !== "" ? "success" : "error";
    }

    computeButtonClick() {

        const { sendComputationRequest, stages } = this.props;

        //check if user deletes DateTime Pickers
        // if (this.props.currentTimeStart === "") {
        //     this.props.notify('Invalid Start Interval', actionTypes.NOTIFICATION_TYPE_WARNING);
        //     return;
        // }
        // if (this.props.currentTimeEnd === "") {
        //     this.props.notify('Invalid End Interval', actionTypes.NOTIFICATION_TYPE_WARNING);
        //     return;
        // }

        //check start interval not greater than end interval?

        if (stages === commonTypes.COMPUTATION_STAGE_IDLE) {

            //TEST
            sendComputationRequest(
                {
                    database: "google_cluster",
                    policy: "autogen",
                    startInterval: "2011-02-01T00:15:00.000Z",
                    endInterval: "2011-02-04T13:30:00.000Z",
                    fields: ["mean_cpu_usage_rate"],
                    nMeasurements: 10,
                    period: 300,
                    palette: "RED",
                    heatMapType: "Sort by machine",
                });

            this.setState({computationLocked: true});
        }
    }

    resetButtonClick() {

        const { resetDatasetInfo, resetPreviousComputationRequest, notify } = this.props;

        resetDatasetInfo();
        resetPreviousComputationRequest();
        this.setState(initialState);

        notify('settings reset', actionTypes.NOTIFICATION_TYPE_SUCCESS);

        this.fetchDatabases();
    }

    render() {

        const { databaseSelected, policySelected, fieldSelected, paletteSelected, periodSelected,
                startIntervalSelected, endIntervalSelected, computationLocked, showComputationSpinner
        } = this.state;

        const { isLoading, hasErrored, notify, databases, policies, fields, palettes, periods, intervals,
        } = this.props;

        //panel loading
        let panelBody;
        if (isLoading) {

                panelBody =
                    <Grid fluid>
                        <Row>
                            <Col xs={12}>
                                <PacmanSpinner/>
                            </Col>
                        </Row>
                    </Grid>
        }

        //panel error
        else if (hasErrored !== "") {

            notify(hasErrored, actionTypes.NOTIFICATION_TYPE_ERROR);
        }

        else {

            //Dropdowns unlocking chain
            let unlockPoliciesDropdown = false
            ,   unlockFieldsDropdown = false
            ,   unlockPalettesDropdown = false
            ,   unlockPeriodDropdown = false
            ,   unlockDateTimePicker = false;
            if (databaseSelected !== "") {
                unlockPoliciesDropdown = true;
                if (policySelected !== "") {
                    unlockFieldsDropdown = true;
                    if (fieldSelected !== "") {
                        unlockPalettesDropdown = true;
                        if (paletteSelected !== "") {
                            unlockPeriodDropdown = true;
                            if (periodSelected !== "") {
                                unlockDateTimePicker = true;
                            }
                        }
                    }
                }
            }

            panelBody =
                <Grid fluid>
                    <Row style={styles.optionsSelectionRow}>
                        <Col xs={12}>
                            <FormGroup validationState={StaticHeatMapConfigurator.inputValidation(databaseSelected)}>
                                <FormControl
                                    onChange={this.onDatabaseSelected.bind(this)}
                                    inputRef={selected => this.databaseSelected = selected}
                                    componentClass="select"
                                    placeholder="select database"
                                >

                                    {
                                        databaseSelected !== "" ?
                                            <option value={databaseSelected}>
                                                {databaseSelected}
                                            </option>
                                            :
                                            <option value="select database">select database</option>
                                    }

                                    {
                                        databases !== undefined &&
                                        databaseSelected === "" &&
                                            databases.map(
                                                db => <option key={db} value={db}>{db}</option>)
                                    }

                                </FormControl>
                            </FormGroup>

                            <FormGroup validationState={StaticHeatMapConfigurator.inputValidation(policySelected)}>

                                <FormControl
                                    onChange={this.onPolicySelected.bind(this)}
                                    inputRef={selected => this.policySelected = selected}
                                    componentClass="select"
                                    placeholder="select policy"
                                    disabled={!unlockPoliciesDropdown}
                                >
                                    {
                                        policySelected !== "" ?
                                            <option value={policySelected}>
                                                {policySelected}
                                            </option>
                                            :
                                            <option value="select policy">select policy</option>
                                    }

                                    {
                                        policies !== undefined &&
                                        policySelected === "" &&
                                        policies.map(
                                            policy => <option key={policy} value={policy}>{policy}</option>)
                                    }

                                </FormControl>
                            </FormGroup>

                            <FormGroup validationState={StaticHeatMapConfigurator.inputValidation(fieldSelected)}>
                                <FormControl
                                    onChange={this.onFieldSelected.bind(this)}
                                    inputRef={selected => this.fieldSelected = selected}
                                    componentClass="select"
                                    placeholder="select field"
                                    disabled={!unlockFieldsDropdown}
                                >
                                    {
                                        fieldSelected !== "" ?
                                            <option value={fieldSelected}>
                                                {fieldSelected}
                                            </option>
                                            :
                                            <option value="select field">select field</option>
                                    }

                                    {
                                        fields !== undefined &&
                                        fieldSelected === "" &&
                                        fields.map(
                                            field => <option key={field} value={field}>{field}</option>)
                                    }

                                </FormControl>
                            </FormGroup>

                            <FormGroup validationState={StaticHeatMapConfigurator.inputValidation(paletteSelected)}>
                                <FormControl
                                    onChange={this.onPaletteSelected.bind(this)}
                                    inputRef={selected => this.paletteSelected = selected}
                                    componentClass="select"
                                    placeholder="select palette"
                                    disabled={!unlockPalettesDropdown}
                                >
                                    {
                                        paletteSelected !== "" ?
                                            <option value={paletteSelected}>
                                                {paletteSelected}
                                            </option>
                                            :
                                            <option value="select palette">select palette</option>
                                    }

                                    {
                                        palettes !== undefined &&
                                        paletteSelected === "" &&
                                        palettes.map(
                                            palette => <option key={palette} value={palette}>{palette}</option>)
                                    }

                                </FormControl>
                            </FormGroup>
                            <FormGroup validationState={StaticHeatMapConfigurator.inputValidation(periodSelected)}>
                                <FormControl
                                    onChange={this.onPeriodSelected.bind(this)}
                                    inputRef={selected => this.periodSelected = selected}
                                    componentClass="select"
                                    placeholder="select period"
                                    disabled={!unlockPeriodDropdown}
                                >
                                    {
                                        periodSelected !== "" ?
                                            <option value={periodSelected}>
                                                {periodSelected}
                                            </option>
                                            :
                                            <option value="select period">select period</option>
                                    }

                                    {
                                        periods !== undefined &&
                                        periodSelected === "" &&
                                        periods.map(
                                            period => <option key={period} value={period}>{period}</option>)
                                    }

                                </FormControl>
                            </FormGroup>
                        </Col>
                    </Row>
                    <Row>
                        <Col xs={12}>
                            <DateTimePicker
                                id="datetime-start"
                                autoFocus
                                placeholder={"select start interval"}
                                min={new Date(intervals.firstInterval)}
                                max={new Date(intervals.lastInterval)}
                                value={startIntervalSelected}
                                onChange={value => this.setState({startIntervalSelected: value})}
                                disabled={!unlockDateTimePicker}
                                style={styles.dateTimePicker}/>
                        </Col>
                        <Col xs={12}>
                            <DateTimePicker
                                id="datetime-end"
                                placeholder={"select end interval"}
                                min={new Date(intervals.firstInterval)}
                                max={new Date(intervals.lastInterval)}
                                value={endIntervalSelected}
                                onChange={value => this.setState({endIntervalSelected: value})}
                                disabled={!unlockDateTimePicker}
                                style={styles.dateTimePicker}/>
                        </Col>
                    </Row>
                    <Row>
                        {
                            this.state.showComputationSpinner ?
                                <Col xs={12}>
                                    <PacmanSpinner/>
                                </Col>
                                :
                                <Col xs={12}/>
                        }

                    </Row>
                    <Row style={styles.buttonsComputationRow}>
                        <Col xs={12}>
                            <ButtonToolbar>
                                <Button
                                    className="pull-left"
                                    bsStyle="primary"
                                    onClick={this.computeButtonClick}
                                    disabled={computationLocked}
                                    style={styles.computeButton}>
                                    Compute
                                </Button>
                                <Button
                                    className="pull-left"
                                    bsStyle="warning"
                                    onClick={this.resetButtonClick.bind(this)}
                                    style={styles.resetButton}>
                                    Reset
                                </Button>
                            </ButtonToolbar>
                        </Col>
                    </Row>
                </Grid>
        }

        return(
            <Panel style={styles.panel}>
                <Panel.Heading>
                    <Panel.Title componentClass="h3">Configurator</Panel.Title>
                </Panel.Heading>
                <Panel.Body style={styles.panelBody}>
                    {panelBody}
                </Panel.Body>
            </Panel>
        );
    }
}

//type checking
// StaticHeatMapConfigurator.propTypes = {
//     fetchData: PropTypes.func.isRequired,
//     items: PropTypes.array.isRequired,
//     hasErrored: PropTypes.bool.isRequired,
//     isLoading: PropTypes.bool.isRequired
// };

const mapStateToProps = (state) => {

    return {

        hasErrored: getHasErrored(state),
        isLoading: getIsLoading(state),
        databases: getItems(state, actionTypes._TYPE_DATABASE),
        policies: getItems(state, actionTypes._TYPE_POLICY),
        fields: getItems(state, actionTypes._TYPE_FIELD),
        palettes: getItems(state, actionTypes._TYPE_PALETTE),
        periods: getItems(state, actionTypes._TYPE_PERIOD),
        intervals: getItems(state, actionTypes._TYPE_INTERVALS),

        stages: getComputationStage(state),
    }
};

const mapDispatchToProps = (dispatch) => {

    return {

        fetchData: (itemType, database = "", policy = "", field = "") => dispatch(fetchItems(itemType, database, policy, field)),
        resetHeatMapConfiguration: () => dispatch(resetHeatMapConfiguration()),
        resetDatasetInfo: () => dispatch(resetDatasetItems()),
        notify: (status, msgType) => dispatch(notify(status, msgType)),
        sendComputationRequest: (request) => dispatch(sendComputationRequest(request)),
        resetPreviousComputationRequest: () => dispatch(resetPreviousComputationRequest()),
    }
};

export default connect(mapStateToProps, mapDispatchToProps)(StaticHeatMapConfigurator);