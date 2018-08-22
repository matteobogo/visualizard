import React from 'react';

//automatically binds methods defined within a component's Class to
//the current object's lexical this instance
//use autobind(this) in constructor
//import autoBind from 'react-autobind';

//redux
import { connect } from 'react-redux';

import * as actionTypes from '../../store/types/actionTypes';
import * as commonTypes from '../../store/types/commonTypes';

import { fetchItems, resetDatasetItems } from '../../store/actions/datasetInfoAction';
import { notify } from '../../store/actions/notificationsAction';
import { startComputation, resetPreviousComputationRequest } from '../../store/actions/computationAction';

import { getItems, getHasErrored, getIsLoading } from '../../store/selectors/datasetInfoSelector';
import { getCurrentComputationStage } from '../../store/selectors/computationSelector';


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

//react-widgets
import 'react-widgets/dist/css/react-widgets.css';
import { DateTimePicker, SelectList } from 'react-widgets';

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
    computationOptionsSelectList: {
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
        marginTop: "10px",
    },
    computeButton: {

    },
    resetButton: {

    },
};

const tooltips = {
    startTimeIntervalMissing:
        <Tooltip id="startIntervalMissingTooltip">
            missing start time!
        </Tooltip>,
    endTimeIntervalMissing:
        <Tooltip id="endIntervalMissingTooltip">
            missing end time!
        </Tooltip>,
};

const initialState = {

    computationOptions: [],

    computationLocked: true,
    showComputationSpinner: false,

    showStartIntervalMissingTooltip: false,
    showEndIntervalMissingTooltip: false,
};

class StaticHeatMapConfigurator extends React.Component {

    constructor(props) {
        super(props);

        this.state = initialState;

        //bindings
        this.onDatabaseSelected = this.onDatabaseSelected.bind(this);
        this.onPolicySelected = this.onPolicySelected.bind(this);
        this.onFieldSelected = this.onFieldSelected.bind(this);
        this.onPeriodSelected = this.onPeriodSelected.bind(this);
        this.onHeatMapTypeSelected = this.onHeatMapTypeSelected.bind(this);
        this.onPaletteSelected = this.onPaletteSelected.bind(this);
        this.onStartIntervalSelected = this.onStartIntervalSelected.bind(this);
        this.onEndIntervalSelected = this.onEndIntervalSelected.bind(this);
        this.onComputationOptionsSelected = this.onComputationOptionsSelected.bind(this);

        this.computeButtonClick = this.computeButtonClick.bind(this);
        this.resetButtonClick = this.resetButtonClick.bind(this);
    }

    onDatabaseSelected() {

        const { fetchDataFromApi, setComputationRequestItem } = this.props;
        const databaseSelected = this.databaseSelected.value;

        if (databaseSelected !== "") {

            setComputationRequestItem(databaseSelected, actionTypes._TYPE_DATABASE);

            //fetch policies list
            fetchDataFromApi(
                actionTypes._TYPE_POLICY,
                {database: databaseSelected});
        }
    }

    onPolicySelected() {

        const { fetchDataFromApi, setComputationRequestItem, computationRequest } = this.props;
        const  policySelected = this.policySelected.value;

        if (policySelected !== "") {

            setComputationRequestItem(policySelected, actionTypes._TYPE_POLICY);

            //fetch fields list
            fetchDataFromApi(
                actionTypes._TYPE_FIELD,
                {database: computationRequest.database});
        }
    }

    onFieldSelected() {

        const { fetchDataFromApi, setComputationRequestItem, computationRequest } = this.props;
        const fieldSelected = this.fieldSelected.value;

        if (fieldSelected !== "") {

            setComputationRequestItem(fieldSelected, actionTypes._TYPE_FIELD);

            //fetch periods list
            fetchDataFromApi(actionTypes._TYPE_PERIOD);

            //fetch first and last intervals
            fetchDataFromApi(
                actionTypes._TYPE_FIRST_INTERVAL,
                {
                    database: computationRequest.database,
                    policy: computationRequest.policy,
                    field: fieldSelected,
                });

            fetchDataFromApi(
                actionTypes._TYPE_LAST_INTERVAL,
                {
                    database: computationRequest.database,
                    policy: computationRequest.policy,
                    field: fieldSelected,
                });
        }
    }

    onPeriodSelected() {

        const { fetchDataFromApi, setComputationRequestItem } = this.props;
        const periodSelected = this.periodSelected.value;

        if (periodSelected !== "") {

            setComputationRequestItem(periodSelected, actionTypes._TYPE_PERIOD);

            //fetch heatmap types list
            fetchDataFromApi(actionTypes._TYPE_HEATMAP_TYPE);
        }
    }

    onHeatMapTypeSelected() {

        const { fetchDataFromApi, setComputationRequestItem } = this.props;
        const heatMapTypeSelected = this.heatMapTypeSelected.value;

        if (heatMapTypeSelected !== "") {

            setComputationRequestItem(heatMapTypeSelected, actionTypes._TYPE_HEATMAP_TYPE);

            //fetch palettes list
            fetchDataFromApi(actionTypes._TYPE_PALETTE);
        }
    }

    onPaletteSelected() {

        const { setComputationRequestItem } = this.props;
        const paletteSelected = this.paletteSelected.value;

        if (paletteSelected !== "") {

            setComputationRequestItem(paletteSelected, actionTypes._TYPE_PALETTE);

            this.setState({computationLocked: false,});
        }
    }

    onStartIntervalSelected(value) {

        const { setComputationRequestItem } = this.props;

        setComputationRequestItem(value, actionTypes._TYPE_START_INTERVAL);
    }

    onEndIntervalSelected(value) {

        const { setComputationRequestItem } = this.props;

        setComputationRequestItem(value, actionTypes._TYPE_END_INTERVAL);
    }

    onComputationOptionsSelected(value) {

        const { setComputationRequestItem } = this.props;

        setComputationRequestItem(value.map(v => v.stage), actionTypes._TYPE_COMPUTATION_OPTIONS);
    }

    inputValidation(value) {

        return value !== null ? "success" : "error";
    }

    computeButtonClick() {

        const { startComputation } = this.props;
        const {  } = this.state;

        startComputation();

        // //TEST
        // startComputation(
        //     {
        //         database: "google_cluster",
        //         policy: "autogen",
        //         startInterval: "2011-02-01T00:15:00.000Z",
        //         endInterval: "2011-02-04T13:30:00.000Z",
        //         fields: ["mean_cpu_usage_rate"],
        //         nMeasurements: 10,
        //         period: 300,
        //         palette: "RED",
        //         heatMapType: "sortByMachine",
        //     });

        this.setState({computationLocked: true});
    }

    resetButtonClick() {

        // const {
        //     resetDatasetInfo,
        //     resetPreviousComputationRequest,
        //     notify
        // } = this.props;
        //
        // resetDatasetInfo();
        // resetPreviousComputationRequest();
        // this.setState(initialState);
        //
        // notify('settings reset', actionTypes.NOTIFICATION_TYPE_SUCCESS);
        //
        // this.fetchDatabases();
    }

    render() {

        const {
            computationLocked,
            showComputationSpinner,
            showStartIntervalMissingTooltip,
            showEndIntervalMissingTooltip
        } = this.state;

        const {
            isLoading,
            databases,
            policies,
            fields,
            periods,
            heatMapTypes,
            palettes,
            firstInterval,
            lastInterval,
            computationOptions,
            computationRequest,
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

        else {

            //Dropdowns unlocking chain
            let unlockPoliciesDropdown = false
            ,   unlockFieldsDropdown = false
            ,   unlockPeriodDropdown = false
            ,   unlockHeatMapTypeDropdown = false
            ,   unlockPalettesDropdown = false
            ,   unlockDateTimePicker = false;
            if (computationRequest.database !== null) {
                unlockPoliciesDropdown = true;
                if (computationRequest.policy !== null) {
                    unlockFieldsDropdown = true;
                    if (computationRequest.field !== null) {
                        unlockPeriodDropdown = true;
                        if (computationRequest.period !== null) {
                            unlockHeatMapTypeDropdown = true;
                            if (computationRequest.heatMapType !== null) {
                                unlockPalettesDropdown = true;
                                if (computationRequest.palette != null) {
                                    unlockDateTimePicker = true;
                                }
                            }
                        }
                    }
                }
            }

            panelBody =
                <Grid fluid>
                    <Row style={styles.optionsSelectionRow}>
                        <Col xs={12}>
                            <FormGroup
                                validationState={
                                    this.inputValidation(computationRequest.database)}>

                                <FormControl
                                    onChange={this.onDatabaseSelected}
                                    inputRef={selected => this.databaseSelected = selected}
                                    componentClass="select"
                                    placeholder="select database"
                                >

                                    {
                                        computationRequest.database !== null ?
                                            <option value={computationRequest.database}>
                                                {computationRequest.database}
                                            </option>
                                            :
                                            <option value="select database">select database</option>
                                    }

                                    {
                                        databases !== undefined &&
                                        computationRequest.database === null &&
                                            databases.map(
                                                db => <option key={db} value={db}>{db}</option>)
                                    }

                                </FormControl>
                            </FormGroup>
                            <FormGroup
                                validationState={
                                    this.inputValidation(computationRequest.policy)}>

                                <FormControl
                                    onChange={this.onPolicySelected}
                                    inputRef={selected => this.policySelected = selected}
                                    componentClass="select"
                                    placeholder="select policy"
                                    disabled={!unlockPoliciesDropdown}
                                >
                                    {
                                        computationRequest.policy !== null ?
                                            <option value={computationRequest.policy}>
                                                {computationRequest.policy}
                                            </option>
                                            :
                                            <option value="select policy">select policy</option>
                                    }

                                    {
                                        policies !== undefined &&
                                        computationRequest.policy === null &&
                                        policies.map(
                                            policy => <option key={policy} value={policy}>{policy}</option>)
                                    }

                                </FormControl>
                            </FormGroup>
                            <FormGroup
                                validationState={
                                    this.inputValidation(computationRequest.field)}>

                                <FormControl
                                    onChange={this.onFieldSelected}
                                    inputRef={selected => this.fieldSelected = selected}
                                    componentClass="select"
                                    placeholder="select field"
                                    disabled={!unlockFieldsDropdown}
                                >
                                    {
                                        computationRequest.field !== null ?
                                            <option value={computationRequest.field}>
                                                {computationRequest.field}
                                            </option>
                                            :
                                            <option value="select field">select field</option>
                                    }

                                    {
                                        fields !== undefined &&
                                        computationRequest.field === null &&
                                        fields.map(
                                            field => <option key={field} value={field}>{field}</option>)
                                    }

                                </FormControl>
                            </FormGroup>
                            <FormGroup
                                validationState={
                                    this.inputValidation(computationRequest.period)}>

                                <FormControl
                                    onChange={this.onPeriodSelected}
                                    inputRef={selected => this.periodSelected = selected}
                                    componentClass="select"
                                    placeholder="select period"
                                    disabled={!unlockPeriodDropdown}
                                >
                                    {
                                        computationRequest.period !== null ?
                                            <option value={computationRequest.period}>
                                                {computationRequest.period}
                                            </option>
                                            :
                                            <option value="select period">select period</option>
                                    }

                                    {
                                        periods !== undefined &&
                                        computationRequest.period === null &&
                                        periods.map(
                                            period => <option key={period} value={period}>{period}</option>)
                                    }

                                </FormControl>
                            </FormGroup>
                            <FormGroup
                                validationState={
                                    this.inputValidation(computationRequest.heatMapType)}>

                                <FormControl
                                    onChange={this.onHeatMapTypeSelected}
                                    inputRef={selected => this.heatMapTypeSelected = selected}
                                    componentClass="select"
                                    placeholder="select heatmap type"
                                    disabled={!unlockHeatMapTypeDropdown}
                                >
                                    {
                                        computationRequest.heatMapType !== null ?
                                            <option value={computationRequest.heatMapType}>
                                                {computationRequest.heatMapType}
                                            </option>
                                            :
                                            <option value="select heatmap type">select heatmap type</option>
                                    }

                                    {
                                        heatMapTypes !== undefined &&
                                        computationRequest.heatMapType === null &&
                                        heatMapTypes.map(
                                            heatMapType => <option key={heatMapType} value={heatMapType}>{heatMapType}</option>)
                                    }

                                </FormControl>
                            </FormGroup>
                            <FormGroup
                                validationState={
                                    this.inputValidation(computationRequest.palette)}>

                                <FormControl
                                    onChange={this.onPaletteSelected}
                                    inputRef={selected => this.paletteSelected = selected}
                                    componentClass="select"
                                    placeholder="select palette"
                                    disabled={!unlockPalettesDropdown}
                                >
                                    {
                                        computationRequest.palette !== null ?
                                            <option value={computationRequest.palette}>
                                                {computationRequest.palette}
                                            </option>
                                            :
                                            <option value="select palette">select palette</option>
                                    }

                                    {
                                        palettes !== undefined &&
                                        computationRequest.palette === null &&
                                        palettes.map(
                                            palette => <option key={palette} value={palette}>{palette}</option>)
                                    }

                                </FormControl>
                            </FormGroup>
                        </Col>
                    </Row>
                    <Row>
                        <Col xs={12}>
                            <DateTimePicker
                                id="datetime-start"
                                placeholder={"select start interval"}
                                min={firstInterval}
                                max={lastInterval}
                                defaultCurrentDate={firstInterval}
                                step={(computationRequest.period / 60)}
                                value={computationRequest.startInterval}
                                onChange={value => this.onStartIntervalSelected(value)}
                                disabled={!unlockDateTimePicker}
                                style={styles.dateTimePicker}>
                            </DateTimePicker>
                        </Col>
                        <Col xs={12}>
                            <DateTimePicker
                                id="datetime-end"
                                placeholder={"select end interval"}
                                min={computationRequest.startInterval}
                                max={lastInterval}
                                defaultCurrentDate={lastInterval}
                                step={(computationRequest.period / 60)}
                                value={computationRequest.endInterval}
                                onChange={value => this.onEndIntervalSelected(value)}
                                disabled={!unlockDateTimePicker}
                                style={styles.dateTimePicker}>
                            </DateTimePicker>
                        </Col>
                    </Row>
                    <Row>
                        <Col xs={12}>
                            <SelectList
                                data={computationOptions}
                                valueField='type'
                                textField='name'
                                defaultValue={['VALIDATION', 'ANALYSIS', 'HEATMAP']}
                                disabled={["VALIDATION"]}
                                multiple
                                name="computation options"
                                onChange={(value) => this.onComputationOptionsSelected(value)}
                                style={styles.computationOptionsSelectList}
                            />
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
                                    onClick={this.resetButtonClick}
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

const mapDispatchToProps = (dispatch) => {

    return {

        resetHeatMapConfiguration: () => dispatch(resetHeatMapConfiguration()),
        resetDatasetInfo: () => dispatch(resetDatasetItems()),
        notify: (status, msgType) => dispatch(notify(status, msgType)),
        startComputation: (request) => dispatch(startComputation(request)),
        resetPreviousComputationRequest: () => dispatch(resetPreviousComputationRequest()),
    }
};

export default connect(null, mapDispatchToProps)(StaticHeatMapConfigurator);