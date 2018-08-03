import React from 'react';
import {config} from '../../config/config';

//automatically binds methods defined within a component's Class to
//the current object's lexical this instance
import autoBind from 'react-autobind';

//redux
import { connect } from 'react-redux';
import * as types from '../../store/types/datasetInfoTypes';
import { fetchItems } from '../../store/actions/datasetInfoAction';
import { setItemHeatMapConfiguration } from '../../store/actions/heatmapConfigAction';

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
        marginBottom: "5px",
        width: "100%",
    },
    optionsSelectionRow: {
        marginTop: "5px",
    },
    formControls: {
        marginBottom: "5px",
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


class StaticHeatMapConfigurator extends React.Component {

    constructor(props) {
        super(props);

        //bind event handler for databases dropdown
        // this.onDatabaseSelected =
        //     this.onDatabaseSelected.bind(this);

        //autoBind(this);
    }

    componentDidMount() {

        //fetch databases list
        this.props.fetchData(types._TYPE_DATABASE);
    }

    onDatabaseSelected() {

        let databaseSelected = this.databaseSelected.value;
        if (databaseSelected !== "") {

            //dispatch the database selected
            this.props.setItemHeatMapConfiguration(databaseSelected, types._TYPE_DATABASE);

            //fetch policies list
            this.props.fetchData(types._TYPE_POLICY, databaseSelected);
        }
    }

    onPolicySelected() {

        let policySelected = this.policySelected.value;
        if (policySelected !== "") {

            //dispatch the policy selected
            this.props.setItemHeatMapConfiguration(policySelected, types._TYPE_POLICY);

            //fetch fields list
            this.props.fetchData(types._TYPE_FIELD, this.props.currentDatabase);
        }
    }

    onFieldSelected() {

        let fieldSelected = this.fieldSelected.value;
        if (fieldSelected !== "") {

            //dispatch the field selected
            this.props.setItemHeatMapConfiguration(fieldSelected, types._TYPE_FIELD);

            //fetch getPalettes list
            this.props.fetchData(types._TYPE_PALETTE);
        }
    }

    onPaletteSelected() {

        let paletteSelected = this.paletteSelected.value;
        if (paletteSelected !== "") {

            //dispatch the palette selected
            this.props.setItemHeatMapConfiguration(paletteSelected, types._TYPE_PALETTE);
        }
    }

    render() {

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

        else if (this.props.hasErrored) {

            //toast TODO
        }

        else {

            panelBody =
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
                            <FormGroup>

                                <FormControl
                                    onChange={this.onDatabaseSelected.bind(this)}
                                    inputRef={selected => this.databaseSelected = selected}
                                    componentClass="select"
                                    placeholder="select database"
                                    style={styles.formControls}
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
                                            this.props.databases.map(db => <option value={db}>{db}</option>)
                                    }

                                </FormControl>

                                <FormControl
                                    onChange={this.onPolicySelected.bind(this)}
                                    inputRef={selected => this.policySelected = selected}
                                    componentClass="select"
                                    placeholder="select policy"
                                    style={styles.formControls}
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
                                        this.props.policies.map(policy => <option value={policy}>{policy}</option>)
                                    }

                                </FormControl>

                                <FormControl
                                    onChange={this.onFieldSelected.bind(this)}
                                    inputRef={selected => this.fieldSelected = selected}
                                    componentClass="select"
                                    placeholder="select field"
                                    style={styles.formControls}
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
                                        this.props.fields.map(field => <option value={field}>{field}</option>)
                                    }

                                </FormControl>

                                <FormControl
                                    onChange={this.onPaletteSelected.bind(this)}
                                    inputRef={selected => this.paletteSelected = selected}
                                    componentClass="select"
                                    placeholder="select palette"
                                    style={styles.formControls}
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
                                        this.props.palettes.map(palette => <option value={palette}>{palette}</option>)
                                    }

                                </FormControl>

                            </FormGroup>
                        </Col>
                    </Row>
                    <Row>
                        <Col xs={12}>
                            <PacmanSpinner/>
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
        databases: getItems(state, types._TYPE_DATABASE),
        policies: getItems(state, types._TYPE_POLICY),
        fields: getItems(state, types._TYPE_FIELD),
        palettes: getItems(state, types._TYPE_PALETTE),

        currentDatabase: getItemsHeatmapConfiguration(state, types._TYPE_DATABASE),
        currentPolicy: getItemsHeatmapConfiguration(state, types._TYPE_POLICY),
        currentField: getItemsHeatmapConfiguration(state, types._TYPE_FIELD),
        currentPalette: getItemsHeatmapConfiguration(state, types._TYPE_PALETTE)
    }

};

const mapDispatchToProps = (dispatch) => {

    return {
        fetchData: (itemType, database = "") => dispatch(fetchItems(itemType, database)),
        setItemHeatMapConfiguration: (item, itemType) => dispatch(setItemHeatMapConfiguration(item, itemType))
    }
};

export default connect(mapStateToProps, mapDispatchToProps)(StaticHeatMapConfigurator);