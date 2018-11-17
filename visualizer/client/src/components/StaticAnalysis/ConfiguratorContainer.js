import React, { Component } from 'react';

import * as localConstants from '../../utils/constants';
import * as apiFetcher from "../../services/ApiFetcher";

import { DropdownClassic, DropdownDateTime } from '../common/Dropdown';
import { ConfiguratorOptions } from './ConfiguratorOptions';

import { Row, Col, Panel, Form } from 'react-bootstrap';

import { LoadingOverlay, Loader } from 'react-overlay-loader';
import 'react-overlay-loader/styles.css';

import './ConfiguratorContainer.css';

export default class ConfiguratorContainer extends Component {

    constructor(props) {
        super(props);

        this.state = {

            lastSelectedDatabase: null,
            lastSelectedPolicy: null,
            lastSelectedHeatMapType: null,
            lastSelectedField: null,

            isLoading: false,
        };

        this.handleDropdownSelection = this.handleDropdownSelection.bind(this);
    }

    //It enables a component to update its internal state as the result of changes in props
    //obtaining from props the configuration elements and comparing them with the last element selected
    static getDerivedStateFromProps(nextProps, prevState) { //render phase (may be slow, no good for async)

        const { configuration } = nextProps;

        const {
            lastSelectedDatabase, lastSelectedPolicy, lastSelectedHeatMapType, lastSelectedField,
        } = prevState;

        //update the last selected database in the local state, reset others
        if (configuration[localConstants._TYPE_SELECTED_DATABASE] !== lastSelectedDatabase) {

            return {
                lastSelectedDatabase: configuration[localConstants._TYPE_SELECTED_DATABASE],
                lastSelectedPolicy: null,
                lastSelectedHeatMapType: null,
                lastSelectedField: null,
            }
        }

        if (configuration[localConstants._TYPE_SELECTED_POLICY] !== lastSelectedPolicy) {

            return {
                lastSelectedPolicy: configuration[localConstants._TYPE_SELECTED_POLICY],
            }
        }

        if (configuration[localConstants._TYPE_SELECTED_HEATMAP_TYPE] !== lastSelectedHeatMapType) {

            return {
                lastSelectedHeatMapType: configuration[localConstants._TYPE_SELECTED_HEATMAP_TYPE],
            }
        }

        if (configuration[localConstants._TYPE_SELECTED_FIELD] !== lastSelectedField) {

            return {
                lastSelectedField: configuration[localConstants._TYPE_SELECTED_FIELD],
            }
        }

        return null;
    }

    componentDidMount() { }

    componentDidUpdate(prevProps, prevState, prevContext) { //commit phase (fast, best for async)

        const {
            configuration,
            fetchData,
        } = this.props;

        const {
            lastSelectedDatabase, lastSelectedPolicy, lastSelectedHeatMapType, lastSelectedField,
        } = this.state;

        const {
            [localConstants._TYPE_FIRST_INTERVAL]: firstInterval,
            [localConstants._TYPE_LAST_INTERVAL]: lastInterval,
        } = this.props.dataset.heatMapBounds;

        if (prevState.lastSelectedDatabase !== lastSelectedDatabase) {

            fetchData({
                groupType: localConstants._TYPE_GROUP_DATASET,
                type: localConstants._TYPE_POLICIES,
                args: {
                    [localConstants._TYPE_SELECTED_DATABASE]: configuration[localConstants._TYPE_SELECTED_DATABASE]
                }
            });
        }

        if (prevState.lastSelectedPolicy !== lastSelectedPolicy) {

            //TODO update fetcher and API to require database/policy to fetch
            //TODO associated heatmap types of heatmaps generated

            fetchData({
                groupType: localConstants._TYPE_GROUP_DATASET,
                type: localConstants._TYPE_HEATMAP_TYPES,
                args: {}
            });
        }

        if (prevState.lastSelectedHeatMapType !== lastSelectedHeatMapType) {

            //TODO update fetcher and API to require database/policy/heatmaptype to fetch
            //TODO associated fields of heatmaps generated

            fetchData({
                groupType: localConstants._TYPE_GROUP_DATASET,
                type: localConstants._TYPE_FIELDS,
                args: {
                    [localConstants._TYPE_SELECTED_DATABASE]: configuration[localConstants._TYPE_SELECTED_DATABASE]
                }
            });
        }

        if (prevState.lastSelectedField !== lastSelectedField) {

            fetchData({
                groupType: localConstants._TYPE_GROUP_DATASET,
                type: localConstants._TYPE_HEATMAP_BOUNDS,
                args: {
                    [localConstants._TYPE_SELECTED_DATABASE]: configuration[localConstants._TYPE_SELECTED_DATABASE],
                    [localConstants._TYPE_SELECTED_POLICY]: configuration[localConstants._TYPE_SELECTED_POLICY],
                    [localConstants._TYPE_SELECTED_FIELD]: configuration[localConstants._TYPE_SELECTED_FIELD],
                    [localConstants._TYPE_SELECTED_HEATMAP_TYPE]: configuration[localConstants._TYPE_SELECTED_HEATMAP_TYPE],
                    [localConstants._TYPE_SELECTED_PERIOD]: configuration[localConstants._TYPE_SELECTED_PERIOD]
                },
            });
        }
    }

    handleDropdownSelection({value, type}) {

        this.props.setItem({
            groupType: localConstants._TYPE_GROUP_CONFIGURATION,
            item: value,
            type: type
        });
    }

    render() {

        const { isLoading } = this.state;

        const {
            [localConstants._TYPE_DATABASES]: databases,
            [localConstants._TYPE_POLICIES]: policies,
            [localConstants._TYPE_HEATMAP_TYPES]: heatMapTypes,
            [localConstants._TYPE_FIELDS]: fields,
        } = this.props.dataset;

        const {
            [localConstants._TYPE_FIRST_INTERVAL]: firstInterval,
            [localConstants._TYPE_LAST_INTERVAL]: lastInterval,
        } = this.props.dataset.heatMapBounds;

        const {
            [localConstants._TYPE_SELECTED_DATABASE]: selectedDatabase,
            [localConstants._TYPE_SELECTED_POLICY]: selectedPolicy,
            [localConstants._TYPE_SELECTED_HEATMAP_TYPE]: selectedHeatMapType,
            [localConstants._TYPE_SELECTED_FIELD]: selectedField,
            [localConstants._TYPE_SELECTED_PERIOD]: selectedPeriod,
            [localConstants._TYPE_SELECTED_START_INTERVAL]: selectedStartInterval,
            [localConstants._TYPE_SELECTED_END_INTERVAL]: selectedEndInterval,
        } = this.props.configuration;

        //dropdowns unlocking
        let unlockPoliciesDropdown = false;
        let unlockHeatMapTypesDropdown = false;
        let unlockFieldsDropdown = false;
        let unlockDateTimePickers = false;

        if (selectedDatabase) {
            unlockPoliciesDropdown = true;
            if (selectedPolicy) {
                unlockHeatMapTypesDropdown = true;
                if (selectedHeatMapType) {
                    unlockFieldsDropdown = true;
                    if (selectedField && firstInterval && lastInterval) {
                        unlockDateTimePickers = true;
                    }
                }
            }
        }

        return (

            <Panel bsStyle="primary" defaultExpanded>
                <Panel.Heading>
                    <Panel.Title toggle>
                        Configurator
                    </Panel.Title>
                </Panel.Heading>
                <Panel.Collapse>
                    <Panel.Body>
                        <div className="overlay-loader-container">
                            <LoadingOverlay className="overlay-loader">
                                <Row>
                                    <Form>
                                        <Col xs={12} sm={6} md={3}>

                                            <DropdownClassic
                                                label="Databases"
                                                id="databases-dropdown"
                                                placeholder="select database"
                                                loading={isLoading}
                                                data={databases}
                                                value={selectedDatabase}
                                                type={localConstants._TYPE_SELECTED_DATABASE}
                                                onChange={this.handleDropdownSelection}
                                                disabled={false}/>

                                        </Col>
                                        <Col xs={12} sm={6} md={3}>

                                            <DropdownClassic
                                                label="Policies"
                                                id="policies-dropdown"
                                                placeholder="select policy"
                                                loading={isLoading}
                                                data={policies}
                                                value={selectedPolicy}
                                                type={localConstants._TYPE_SELECTED_POLICY}
                                                onChange={this.handleDropdownSelection}
                                                disabled={!unlockPoliciesDropdown}/>

                                        </Col>
                                        <Col xs={12} sm={6} md={3}>

                                            <DropdownClassic
                                                label="Heatmap Type"
                                                id="heatmap-types-dropdown"
                                                placeholder="select heatmap type.."
                                                loading={isLoading}
                                                data={heatMapTypes}
                                                value={selectedHeatMapType}
                                                type={localConstants._TYPE_SELECTED_HEATMAP_TYPE}
                                                onChange={this.handleDropdownSelection}
                                                disabled={!unlockHeatMapTypesDropdown}/>

                                        </Col>
                                        <Col xs={12} sm={6} md={3}>

                                            <DropdownClassic
                                                label="Field"
                                                id="fields-dropdown"
                                                placeholder="select field.."
                                                loading={isLoading}
                                                data={fields}
                                                value={selectedField}
                                                type={localConstants._TYPE_SELECTED_FIELD}
                                                onChange={this.handleDropdownSelection}
                                                disabled={!unlockFieldsDropdown}/>

                                        </Col>
                                    </Form>
                                </Row>
                                <Row>
                                    <Form>
                                        <Col xs={12} sm={6} md={3}>

                                            <DropdownDateTime
                                                label="Start Interval"
                                                id="datetime-start"
                                                placeholder="select start interval"
                                                min={firstInterval}
                                                max={selectedEndInterval}
                                                step={(300 / 60)}
                                                value={selectedStartInterval}
                                                type={localConstants._TYPE_SELECTED_START_INTERVAL}
                                                onChange={this.handleDropdownSelection}
                                                disabled={!unlockDateTimePickers}/>

                                        </Col>
                                        <Col xs={12} sm={6} md={3}>

                                            <DropdownDateTime
                                                label="End Interval"
                                                id="datetime-end"
                                                placeholder="select end interval"
                                                min={selectedStartInterval}
                                                max={lastInterval}
                                                step={(300 / 60)}
                                                value={selectedEndInterval}
                                                type={localConstants._TYPE_SELECTED_END_INTERVAL}
                                                onChange={this.handleDropdownSelection}
                                                disabled={!unlockDateTimePickers}/>

                                        </Col>
                                    </Form>
                                </Row>
                                <Loader loading={isLoading}/>
                            </LoadingOverlay>
                        </div>
                    </Panel.Body>
                </Panel.Collapse>
            </Panel>
        );
    }
}