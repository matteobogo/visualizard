import React, { Component } from 'react';

import * as localConstants from '../../utils/constants';
import * as apiFetcher from "../../services/ApiFetcher";

import { DropdownClassic, DropdownDateTime } from '../common/Dropdown';
import { ConfiguratorOptions } from './ConfiguratorOptions';

import { Col, Panel, Form } from 'react-bootstrap';

import { LoadingOverlay, Loader } from 'react-overlay-loader';
import 'react-overlay-loader/styles.css';

import './ConfiguratorContainer.css';

export default class ConfiguratorContainer extends Component {

    constructor(props) {
        super(props);

        this.state = {

            lastSelectedDatabase: null,
            lastSelectedPolicy: null,
            lastSelectedStartInterval: null,
            lastSelectedEndInterval: null,

            isLoading: false,
        };

        this.handleDropdownSelection = this.handleDropdownSelection.bind(this);
    }

    //It enables a component to update its internal state as the result of changes in props
    //obtaining from props the configuration elements and comparing them with the last element selected
    static getDerivedStateFromProps(nextProps, prevState) { //render phase (may be slow, no good for async)

        const { dataset, configuration } = nextProps;

        const {
            lastSelectedDatabase, lastSelectedPolicy, lastSelectedStartInterval, lastSelectedEndInterval
        } = prevState;

        //update the last selected database in the local state, reset others
        if (configuration[localConstants._TYPE_SELECTED_DATABASE] !== lastSelectedDatabase) {

            return {
                lastSelectedDatabase: configuration[localConstants._TYPE_SELECTED_DATABASE],
                lastSelectedPolicy: null,
                lastSelectedStartInterval: null,
                lastSelectedEndInterval: null,
            }
        }

        // update the last selected policy in the local state
        if (configuration[localConstants._TYPE_SELECTED_POLICY] !== lastSelectedPolicy) {

            return {
                lastSelectedPolicy: configuration[localConstants._TYPE_SELECTED_POLICY],
            }
        }

        //init the last selected start interval (if dataset's first interval is available)
        if (!lastSelectedStartInterval && dataset[localConstants._TYPE_FIRST_INTERVAL]) {

            return {
                lastSelectedStartInterval: dataset[localConstants._TYPE_FIRST_INTERVAL],
            }
        }

        //init the last selected end interval (if dataset's last interval is available)
        if (!lastSelectedEndInterval && dataset[localConstants._TYPE_LAST_INTERVAL]) {

            return {
                lastSelectedEndInterval: dataset[localConstants._TYPE_LAST_INTERVAL],
            }
        }

        //user has make empty the datetime picker or has changed the value through the menu (start interval)
        //datetime pickers will push a new value to the setItem callback within handleDropdownSelection.
        //During the next render phase we will receive the new configuration prop with the new value in the StartInterval
        //(or EndInterval), because this new value is different from the last one saved in the component's state, the
        //state is also updated with the new value (assigned to lastSelectedStartInterval).
        //This strategy is useful because during the commit phase (componentDidUpdate) we will check for the updates
        //of the state and, in the case of startInterval/endInterval, we will check if the new (lastSelected-) value is null.
        //In the latter scenario, we will trigger again the setItem callback, assigning the value of the
        //firstInterval/lastInterval previously fetched from the api. This workaround is necessary to re-populate the
        //datetime picker when an user tries to delete the current value (behaviour not handled by the component).
        if (configuration[localConstants._TYPE_SELECTED_START_INTERVAL] !== lastSelectedStartInterval) {

            return {
                lastSelectedStartInterval: configuration[localConstants._TYPE_SELECTED_START_INTERVAL],
            }
        }

        //user has make empty the datetime picker or has changed the value through the menu (end interval)
        if (configuration[localConstants._TYPE_SELECTED_END_INTERVAL] !== lastSelectedEndInterval) {

            return {
                lastSelectedEndInterval: configuration[localConstants._TYPE_SELECTED_END_INTERVAL],
            }
        }

        return null;
    }

    componentDidMount() { }

    componentDidUpdate(prevProps, prevState, prevContext) { //commit phase (fast, best for async)

        const {
            configuration,
            fetchData,
            setItem,
        } = this.props;

        const {
            lastSelectedDatabase, lastSelectedPolicy, lastSelectedStartInterval, lastSelectedEndInterval
        } = this.state;

        const {
            [localConstants._TYPE_FIRST_INTERVAL]: firstInterval,
            [localConstants._TYPE_LAST_INTERVAL]: lastInterval,
            [localConstants._TYPE_FIELDS]: fields,
        } = this.props.dataset;

        if (prevState.lastSelectedDatabase !== lastSelectedDatabase) {

            //update policies
            fetchData({
                groupType: localConstants._TYPE_GROUP_DATASET,
                type: localConstants._TYPE_POLICIES,
                args: {
                    database: configuration[localConstants._TYPE_SELECTED_DATABASE]
                }
            });

            //update fields (required for obtaining first/last intervals)
            //InfluxDB Issue: we cannot retrieve first/last timestamp of the database without
            //specifies at least a field and a measurement.
            //This list will be used in other analysis components
            fetchData({
                groupType: localConstants._TYPE_GROUP_DATASET,
                type: localConstants._TYPE_FIELDS,
                args: {
                    database: configuration[localConstants._TYPE_SELECTED_DATABASE]
                }
            });

            //update the number of timeseries available on the server (i.e. number of measurements)
            fetchData({
                groupType: localConstants._TYPE_GROUP_DATASET,
                type: localConstants._TYPE_N_MEASUREMENTS,
                args: { database: lastSelectedDatabase}
            });
        }

        //update first and last interval when the selected policy changes
        if (prevState.lastSelectedPolicy !== lastSelectedPolicy) {

            //update first and last intervals
            fetchData({
                groupType: localConstants._TYPE_GROUP_DATASET,
                type: localConstants._TYPE_FIRST_INTERVAL,
                args: {
                    database: configuration[localConstants._TYPE_SELECTED_DATABASE],
                    policy: configuration[localConstants._TYPE_SELECTED_POLICY],
                    field: fields[0],
                }
            });

            fetchData({
                groupType: localConstants._TYPE_GROUP_DATASET,
                type: localConstants._TYPE_LAST_INTERVAL,
                args: {
                    database: configuration[localConstants._TYPE_SELECTED_DATABASE],
                    policy: configuration[localConstants._TYPE_SELECTED_POLICY],
                    field: fields[0],
                }
            });
        }

        //guard
        if (!lastSelectedDatabase || !lastSelectedPolicy || !firstInterval || !lastInterval) return;

        //as we said before, in this block we will check if the current datetime pickers values are changed and if they
        //are null. If they are null then they are re-initialized with first/last interval values (if they exist).
        if (prevState.lastSelectedStartInterval !== lastSelectedStartInterval) {

            setItem({
                groupType: localConstants._TYPE_GROUP_CONFIGURATION,
                item: firstInterval,
                type: localConstants._TYPE_SELECTED_START_INTERVAL,
            });
        }

        if (prevState.lastSelectedEndInterval !== lastSelectedEndInterval) {

            setItem({
                groupType: localConstants._TYPE_GROUP_CONFIGURATION,
                item: lastInterval,
                type: localConstants._TYPE_SELECTED_END_INTERVAL,
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

        const { configuration } = this.props;

        const { isLoading } = this.state;

        const {
            [localConstants._TYPE_DATABASES]: databases,
            [localConstants._TYPE_POLICIES]: policies,
            [localConstants._TYPE_FIELDS]: fields,
            [localConstants._TYPE_N_MEASUREMENTS]: nMeasurements,
            [localConstants._TYPE_FIRST_INTERVAL]: firstInterval,
            [localConstants._TYPE_LAST_INTERVAL]: lastInterval,

        } = this.props.dataset;

        //dropdowns unlocking
        let unlockPoliciesDropdown = false;
        let unlockDateTimePickers = false;

        if (configuration[localConstants._TYPE_SELECTED_DATABASE]) {

            unlockPoliciesDropdown = true;
            if (configuration[localConstants._TYPE_SELECTED_POLICY] && firstInterval && lastInterval) {

                unlockDateTimePickers = true;
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
                                <Form>
                                    <Col xs={12} sm={6} md={3}>

                                        <DropdownClassic
                                            label="Databases"
                                            id="databases-dropdown"
                                            placeholder="select database"
                                            loading={isLoading}
                                            data={databases}
                                            value={configuration[localConstants._TYPE_SELECTED_DATABASE]}
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
                                            value={configuration[localConstants._TYPE_SELECTED_POLICY]}
                                            type={localConstants._TYPE_SELECTED_POLICY}
                                            onChange={this.handleDropdownSelection}
                                            disabled={!unlockPoliciesDropdown}/>

                                    </Col>
                                    <Col xs={12} sm={6} md={3}>

                                        <DropdownDateTime
                                            label="Start Interval"
                                            id="datetime-start"
                                            placeholder="select start interval"
                                            min={firstInterval}
                                            max={configuration[localConstants._TYPE_SELECTED_END_INTERVAL]}
                                            step={(300 / 60)}
                                            value={configuration[localConstants._TYPE_SELECTED_START_INTERVAL]}
                                            type={localConstants._TYPE_SELECTED_START_INTERVAL}
                                            onChange={this.handleDropdownSelection}
                                            disabled={!unlockDateTimePickers}/>

                                    </Col>
                                    <Col xs={12} sm={6} md={3}>

                                        <DropdownDateTime
                                            label="End Interval"
                                            id="datetime-end"
                                            placeholder="select end interval"
                                            min={configuration[localConstants._TYPE_SELECTED_START_INTERVAL]}
                                            max={lastInterval}
                                            step={(300 / 60)}
                                            value={configuration[localConstants._TYPE_SELECTED_END_INTERVAL]}
                                            type={localConstants._TYPE_SELECTED_END_INTERVAL}
                                            onChange={this.handleDropdownSelection}
                                            disabled={!unlockDateTimePickers}/>

                                    </Col>
                                </Form>
                                <Loader loading={isLoading}/>
                            </LoadingOverlay>
                        </div>
                    </Panel.Body>
                </Panel.Collapse>
            </Panel>
        );
    }
}