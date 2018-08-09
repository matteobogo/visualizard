import React from 'react';
import config from '../../config/config';

//automatically binds methods defined within a component's Class to
//the current object's lexical this instance
//use autobind(this) in constructor
import autoBind from 'react-autobind';

//redux
import { connect } from 'react-redux';
import * as actionTypes from '../../store/types/actionTypes';

import { fetchItems, resetDatasetItems } from '../../store/actions/datasetInfoAction';
import { setItemHeatMapConfiguration, resetHeatMapConfiguration } from '../../store/actions/heatmapConfigAction';
import { notify } from '../../store/actions/notificationsAction';

import { getItems, getHasErrored, getIsLoading } from '../../store/selectors/datasetInfoSelector';
import { getItemsHeatmapConfiguration } from '../../store/selectors/heatmapConfigSelector';

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

    databaseValidation: false,
    policyValidation: false,
    fieldValidation: false,
    paletteValidation: false,
    periodValidation: false,
    startIntervalValidation: true,  //has a default value
    endIntervalValidation: true,    //has a default value

    startIntervalValue: new Date(),
    endIntervalValue: new Date(),

    timeRangeIsLoading: false,
    timeRangeLoaded: false,
    showComputationSpinner: false,
};

class StaticHeatMapConfigurator extends React.Component {

    constructor(props) {
        super(props);

        this.state = initialState;
    }

    componentDidMount() {

        this.populateDatabases();
    }

    populateDatabases() {

        this.props.fetchData(actionTypes._TYPE_DATABASE);
    }

    populateTimeIntervals(database, policy, field) {

        //fetch first and last intervals
        this.props.fetchData(
            actionTypes._TYPE_FIRST_INTERVAL,
            database,
            policy,
            field);

        this.props.fetchData(
            actionTypes._TYPE_LAST_INTERVAL,
            database,
            policy,
            field);
    }

    onDatabaseSelected() {

        let databaseSelected = this.databaseSelected.value;
        if (databaseSelected !== "") {

            //dispatch the database selected
            this.props.setItemHeatMapConfiguration(databaseSelected, actionTypes._TYPE_DATABASE);

            //fetch policies list
            this.props.fetchData(actionTypes._TYPE_POLICY, databaseSelected);

            //set validation
            this.setState({ databaseValidation: true });
        }
    }

    onPolicySelected() {

        let policySelected = this.policySelected.value;
        if (policySelected !== "") {

            //dispatch the policy selected
            this.props.setItemHeatMapConfiguration(policySelected, actionTypes._TYPE_POLICY);

            //fetch fields list
            this.props.fetchData(actionTypes._TYPE_FIELD, this.props.currentDatabase);

            //set validation
            this.setState({ policyValidation: true });
        }
    }

    onFieldSelected() {

        let fieldSelected = this.fieldSelected.value;
        if (fieldSelected !== "") {

            //dispatch the field selected
            this.props.setItemHeatMapConfiguration(fieldSelected, actionTypes._TYPE_FIELD);

            //fetch palettes list
            this.props.fetchData(actionTypes._TYPE_PALETTE);

            //set validation
            this.setState({ fieldValidation: true });
        }
    }

    onPaletteSelected() {

        let paletteSelected = this.paletteSelected.value;
        if (paletteSelected !== "") {

            //dispatch the palette selected
            this.props.setItemHeatMapConfiguration(paletteSelected, actionTypes._TYPE_PALETTE);

            //fetch periods list
            this.props.fetchData(actionTypes._TYPE_PERIOD);

            //set validation
            this.setState({ paletteValidation: true });
        }
    }

    onPeriodSelected() {

        let periodSelected = this.periodSelected.value;
        if (periodSelected !== "") {

            //dispatch the period selected
            this.props.setItemHeatMapConfiguration(periodSelected, actionTypes._TYPE_PERIOD);

            //set validation
            this.setState({ periodValidation: true });
        }
    }

    onChangeStartInterval(value) {

        let parsedValue;
        if (value === null) {
            this.setState({startIntervalValidation: false});
            parsedValue = "";
        }
        else {
            this.setState({startIntervalValidation: true});
            parsedValue = value.getTime();
            this.setState({startIntervalValue: parsedValue})
        }

        //dispatch changed end interval
        this.props.setItemHeatMapConfiguration(parsedValue, actionTypes._TYPE_FIRST_INTERVAL);
    }

    onChangeEndInterval(value) {

        let parsedValue;
        if (value === null) {
            this.setState({endIntervalValidation: false});
            parsedValue = "";
        }
        else {
            this.setState({endIntervalValidation: true});
            parsedValue = value.getTime();
            this.setState({endIntervalValue: parsedValue})
        }

        //dispatch changed end interval
        this.props.setItemHeatMapConfiguration(parsedValue, actionTypes._TYPE_LAST_INTERVAL);
    }

    inputValidation(isValidated) {

        return isValidated ? "success" : "error";
    }

    computeButtonClick() {

        //check if user deletes DateTime Pickers
        if (this.props.currentTimeStart === "") {
            this.props.notify('Invalid Start Interval', actionTypes.NOTIFICATION_TYPE_WARNING);
            return;
        }
        if (this.props.currentTimeEnd === "") {
            this.props.notify('Invalid End Interval', actionTypes.NOTIFICATION_TYPE_WARNING);
            return;
        }

        //check start interval not greater than end interval?



    }

    resetButtonClick() {

        this.props.resetHeatMapConfiguration();
        this.props.resetDatasetInfo();
        this.setState(initialState);

        this.props.notify('settings reset', actionTypes.NOTIFICATION_TYPE_SUCCESS);
    }

    render() {

        //configure time intervals
        if (this.props.currentDatabase !== "" &&
            this.props.currentPolicy !== "" &&
            this.props.currentField !== "" &&
            !this.state.timeRangeIsLoading) {

            this.populateTimeIntervals(
                this.props.currentDatabase,
                this.props.currentPolicy,
                this.props.currentField
            );

            this.setState({ timeRangeIsLoading: true});
        }

        if (this.props.firstInterval !== "" &&
            this.props.lastInterval !== "" &&
            this.state.timeRangeIsLoading &&
            !this.state.timeRangeLoaded) {

            this.setState({
                startIntervalValue: new Date(this.props.firstInterval),
                endIntervalValue: new Date(this.props.lastInterval),
                timeRangeIsLoading: false,
                timeRangeLoaded: true
            });
        }

        //validation
        const {
            databaseValidation,
            policyValidation,
            fieldValidation,
            paletteValidation,
            periodValidation,
            startIntervalValidation,
            endIntervalValidation
        } = this.state;

        //computation button locking
        let lockComputeButton = !(
            databaseValidation &&
            policyValidation &&
            fieldValidation &&
            paletteValidation &&
            periodValidation &&
            startIntervalValidation &&
            endIntervalValidation);

        //panel loading
        let panelBody;
        if (this.props.isLoading) {

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
        else if (this.props.hasErrored !== "") {

            this.props.notify(
                this.props.hasErrored,
                actionTypes.NOTIFICATION_TYPE_ERROR);
        }

        else {

            //Dropdowns unlocking chain
            let unlockPoliciesDropdown = false
            ,   unlockFieldsDropdown = false
            ,   unlockPalettesDropdown = false
            ,   unlockPeriodDropdown = false
            ,   unlockDateTimePicker = false
            ,   firstInterval, lastInterval;
            if (this.props.currentDatabase !== "") {
                unlockPoliciesDropdown = true;
                if (this.props.currentPolicy !== "") {
                    unlockFieldsDropdown = true;
                    if (this.props.currentField !== "") {
                        unlockPalettesDropdown = true;
                        if (this.props.currentPalette !== "") {
                            unlockPeriodDropdown = true;

                                if (this.props.currentPeriod !== "" &&
                                    this.props.firstInterval !== "" &&
                                    this.props.lastInterval !== "") {

                                    unlockDateTimePicker = true;
                                    firstInterval = new Date(this.props.firstInterval);
                                    lastInterval = new Date(this.props.lastInterval);
                                }
                        }
                    }
                }
            }

            panelBody =
                <Grid fluid>
                    <Row style={styles.optionsSelectionRow}>
                        <Col xs={12}>
                            <FormGroup validationState={this.inputValidation(this.state.databaseValidation)}>
                                <FormControl
                                    onChange={this.onDatabaseSelected.bind(this)}
                                    inputRef={selected => this.databaseSelected = selected}
                                    componentClass="select"
                                    placeholder="select database"
                                >

                                    {
                                        this.props.currentDatabase !== "" ?
                                            <option value={this.props.currentDatabase}>
                                                {this.props.currentDatabase}
                                            </option>
                                            :
                                            <option value="select database">select database</option>
                                    }

                                    {
                                        this.props.databases !== undefined &&
                                        this.props.currentDatabase === "" &&
                                            this.props.databases.map(
                                                db => <option key={db} value={db}>{db}</option>)
                                    }

                                </FormControl>
                            </FormGroup>

                            <FormGroup validationState={this.inputValidation(this.state.policyValidation)}>

                                <FormControl
                                    onChange={this.onPolicySelected.bind(this)}
                                    inputRef={selected => this.policySelected = selected}
                                    componentClass="select"
                                    placeholder="select policy"
                                    disabled={!unlockPoliciesDropdown}
                                >
                                    {
                                        this.props.currentPolicy !== "" ?
                                            <option value={this.props.currentPolicy}>
                                                {this.props.currentPolicy}
                                            </option>
                                            :
                                            <option value="select policy">select policy</option>
                                    }

                                    {
                                        this.props.policies !== undefined &&
                                        this.props.currentPolicy === "" &&
                                        this.props.policies.map(
                                            policy => <option key={policy} value={policy}>{policy}</option>)
                                    }

                                </FormControl>
                            </FormGroup>

                            <FormGroup validationState={this.inputValidation(this.state.fieldValidation)}>
                                <FormControl
                                    onChange={this.onFieldSelected.bind(this)}
                                    inputRef={selected => this.fieldSelected = selected}
                                    componentClass="select"
                                    placeholder="select field"
                                    disabled={!unlockFieldsDropdown}
                                >
                                    {
                                        this.props.currentField !== "" ?
                                            <option value={this.props.currentField}>
                                                {this.props.currentField}
                                            </option>
                                            :
                                            <option value="select field">select field</option>
                                    }

                                    {
                                        this.props.fields !== undefined &&
                                        this.props.currentField === "" &&
                                        this.props.fields.map(
                                            field => <option key={field} value={field}>{field}</option>)
                                    }

                                </FormControl>
                            </FormGroup>

                            <FormGroup validationState={this.inputValidation(this.state.paletteValidation)}>
                                <FormControl
                                    onChange={this.onPaletteSelected.bind(this)}
                                    inputRef={selected => this.paletteSelected = selected}
                                    componentClass="select"
                                    placeholder="select palette"
                                    disabled={!unlockPalettesDropdown}
                                >
                                    {
                                        this.props.currentPalette !== "" ?
                                            <option value={this.props.currentPalette}>
                                                {this.props.currentPalette}
                                            </option>
                                            :
                                            <option value="select palette">select palette</option>
                                    }

                                    {
                                        this.props.palettes !== undefined &&
                                        this.props.currentPalette === "" &&
                                        this.props.palettes.map(
                                            palette => <option key={palette} value={palette}>{palette}</option>)
                                    }

                                </FormControl>
                            </FormGroup>
                            <FormGroup validationState={this.inputValidation(this.state.periodValidation)}>
                                <FormControl
                                    onChange={this.onPeriodSelected.bind(this)}
                                    inputRef={selected => this.periodSelected = selected}
                                    componentClass="select"
                                    placeholder="select period"
                                    disabled={!unlockPeriodDropdown}
                                >
                                    {
                                        this.props.currentPeriod !== "" ?
                                            <option value={this.props.currentPeriod}>
                                                {this.props.currentPeriod}
                                            </option>
                                            :
                                            <option value="select period">select period</option>
                                    }

                                    {
                                        this.props.periods !== undefined &&
                                        this.props.currentPeriod === "" &&
                                        this.props.periods.map(
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
                                min={firstInterval}
                                max={lastInterval}
                                currentDate={firstInterval}
                                onCurrentDateChange={value => this.onChangeStartInterval(value)}
                                value={this.state.startIntervalValue}
                                onChange={value => this.setState({startIntervalValue: value})}
                                disabled={!unlockDateTimePicker}
                                style={styles.dateTimePicker}/>
                        </Col>
                        <Col xs={12}>
                            <DateTimePicker
                                id="datetime-end"
                                placeholder={"select end interval"}
                                min={firstInterval}
                                max={lastInterval}
                                currentDate={lastInterval}
                                onCurrentDateChange={value => this.onChangeEndInterval(value)}
                                value={this.state.endIntervalValue}
                                onChange={value => this.setState({endIntervalValue: value})}
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
                                    onClick={this.computeButtonClick.bind(this)}
                                    disabled={lockComputeButton}
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

const mapStateToProps = state => {

    return {

        hasErrored: getHasErrored(state),
        isLoading: getIsLoading(state),
        databases: getItems(state, actionTypes._TYPE_DATABASE),
        policies: getItems(state, actionTypes._TYPE_POLICY),
        fields: getItems(state, actionTypes._TYPE_FIELD),
        palettes: getItems(state, actionTypes._TYPE_PALETTE),
        periods: getItems(state, actionTypes._TYPE_PERIOD),
        firstInterval: getItems(state, actionTypes._TYPE_FIRST_INTERVAL),
        lastInterval: getItems(state, actionTypes._TYPE_LAST_INTERVAL),

        currentDatabase: getItemsHeatmapConfiguration(state, actionTypes._TYPE_DATABASE),
        currentPolicy: getItemsHeatmapConfiguration(state, actionTypes._TYPE_POLICY),
        currentField: getItemsHeatmapConfiguration(state, actionTypes._TYPE_FIELD),
        currentPalette: getItemsHeatmapConfiguration(state, actionTypes._TYPE_PALETTE),
        currentPeriod: getItemsHeatmapConfiguration(state, actionTypes._TYPE_PERIOD),
        currentTimeStart: getItemsHeatmapConfiguration(state, actionTypes._TYPE_FIRST_INTERVAL),
        currentTimeEnd: getItemsHeatmapConfiguration(state, actionTypes._TYPE_LAST_INTERVAL),
    }

};

const mapDispatchToProps = (dispatch) => {

    return {

        fetchData: (itemType, database = "", policy = "", field = "") => dispatch(fetchItems(itemType, database, policy, field)),
        setItemHeatMapConfiguration: (item, itemType) => dispatch(setItemHeatMapConfiguration(item, itemType)),
        resetHeatMapConfiguration: () => dispatch(resetHeatMapConfiguration()),
        resetDatasetInfo: () => dispatch(resetDatasetItems()),
        notify: (status, msgType) => dispatch(notify(status, msgType)),
        //startHeatMapComputation: () => dispatch(),
    }
};

export default connect(mapStateToProps, mapDispatchToProps)(StaticHeatMapConfigurator);