import React, { Component } from 'react';

import * as localConstants from '../../utils/constants';
import * as apiFetcher from "../../services/ApiFetcher";

import { DropdownClassic, DropdownDateTime } from './Dropdown';
import { ConfiguratorOptions } from './ConfiguratorOptions';

import { Col, Panel, Form } from 'react-bootstrap';

import { LoadingOverlay, Loader } from 'react-overlay-loader';
import 'react-overlay-loader/styles.css';

import '../../styles/configurator.css';

export default class ConfiguratorContainer extends Component {

    constructor(props) {
        super(props);

        this.state = {

            dataset: {

                [localConstants._TYPE_DATABASES]: [],
                [localConstants._TYPE_POLICIES]: [],
                [localConstants._TYPE_FIELDS]: [],
                [localConstants._TYPE_FIRST_INTERVAL]: null,
                [localConstants._TYPE_LAST_INTERVAL]: null,
            },

            isLoading: false,
        };

        this.fetchDataFromApi = this.fetchDataFromApi.bind(this);
        this.handleDropdownSelection = this.handleDropdownSelection.bind(this);
        this.handleOptionsSelection = this.handleOptionsSelection.bind(this);
    }

    //It enables a component to update its internal state as the result of changes in props
    //obtaining from props the configuration elements and comparing them with the last element selected
    static getDerivedStateFromProps(nextProps, prevState) { //render phase (may be slow, no good for async)

        const { configuration } = nextProps;

        const {
            dataset, lastSelectedDatabase, lastSelectedPolicy, lastSelectedStartInterval, lastSelectedEndInterval
        } = prevState;

        if (configuration[localConstants._TYPE_SELECTED_DATABASE] !== lastSelectedDatabase) {

            return {
                lastSelectedDatabase: configuration[localConstants._TYPE_SELECTED_DATABASE],
                lastSelectedPolicy: null,
                lastSelectedStartInterval: null,
                lastSelectedEndInterval: null,
            }
        }

        if (configuration[localConstants._TYPE_SELECTED_POLICY] !== lastSelectedPolicy) {

            return {
                lastSelectedPolicy: configuration[localConstants._TYPE_SELECTED_POLICY],
            }
        }

        //user has make empty the datetime picker or has changed the value through the menu (start interval)
        //datetime pickers will push a new value to the setConfigurationItem callback within handleDropdownSelection.
        //During the next render phase we will receive the new configuration prop with the new value in the StartInterval
        //(or EndInterval), because this new value is different from the last one saved in the component's state, the
        //state is also updated with the new value (assigned to lastSelectedStartInterval).
        //This strategy is useful because during the commit phase (componentDidUpdate) we will check for the updates
        //of the state and, in the case of startInterval/endInterval, we will check if the new (lastSelected-) value is null.
        //In the latter scenario, we will trigger again the setConfigurationItem callback, assigning the value of the
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

    componentDidMount() {   //commit phase

        this.fetchDataFromApi({ itemType: localConstants._TYPE_DATABASES });
    }

    componentDidUpdate(prevProps, prevState, prevContext) { //commit phase (fast, best for async)

        const { configuration, setConfigurationItem } = this.props;

        const {
            lastSelectedDatabase, lastSelectedPolicy, lastSelectedStartInterval, lastSelectedEndInterval
        } = this.state;

        const {
            [localConstants._TYPE_FIRST_INTERVAL]: firstInterval,
            [localConstants._TYPE_LAST_INTERVAL]: lastInterval,
            [localConstants._TYPE_FIELDS]: fields,
        } = this.state.dataset;

        if (prevState.lastSelectedDatabase !== lastSelectedDatabase) {

            //update policies
            this.fetchDataFromApi({
                itemType: localConstants._TYPE_POLICIES,
                args: {
                    database: configuration[localConstants._TYPE_SELECTED_DATABASE]
                }
            });

            //update fields (required for obtaining first/last intervals)
            //InfluxDB Issue: we cannot retrieve first/last timestamp of the database without
            //specifies at least a field and a measurement.
            //This list will be used in other analysis components
            this.fetchDataFromApi({
                itemType: localConstants._TYPE_FIELDS,
                args: {
                    database: configuration[localConstants._TYPE_SELECTED_DATABASE]
                }
            });
        }

        if (prevState.lastSelectedPolicy !== lastSelectedPolicy && fields.length > 0) {

            //update first and last intervals
            this.fetchDataFromApi({
                itemType: localConstants._TYPE_FIRST_INTERVAL,
                args: {
                    database: configuration[localConstants._TYPE_SELECTED_DATABASE],
                    policy: configuration[localConstants._TYPE_SELECTED_POLICY],
                    field: fields[0],
                }
            });

            this.fetchDataFromApi({
                itemType: localConstants._TYPE_LAST_INTERVAL,
                args: {
                    database: configuration[localConstants._TYPE_SELECTED_DATABASE],
                    policy: configuration[localConstants._TYPE_SELECTED_POLICY],
                    field: fields[0],
                }
            });
        }

        //re-initialize start/end interval default values if first/last interval values change
        if (prevState.dataset.firstInterval !== firstInterval) {

            setConfigurationItem({ item: firstInterval, itemType: localConstants._TYPE_SELECTED_START_INTERVAL });
        }

        if (prevState.dataset.lastInterval !== lastInterval) {

            setConfigurationItem({ item: lastInterval, itemType: localConstants._TYPE_SELECTED_END_INTERVAL });
        }

        //as we said before, in this block we will check if the current datetime pickers values are changed and if they
        //are null. If they are null then they are re-initialized with first/last interval values (if they exist).
        if (prevState.lastSelectedStartInterval !== lastSelectedStartInterval) {

            if (!lastSelectedStartInterval &&
                !(lastSelectedStartInterval instanceof Date) &&
                firstInterval) {

                setConfigurationItem({
                    item: firstInterval,
                    itemType: localConstants._TYPE_SELECTED_START_INTERVAL
                });
            }
        }

        if (prevState.lastSelectedEndInterval !== lastSelectedEndInterval) {

            if (!lastSelectedEndInterval &&
                !(lastSelectedEndInterval instanceof Date) &&
                lastInterval) {

                setConfigurationItem({
                    item: lastInterval,
                    itemType: localConstants._TYPE_SELECTED_END_INTERVAL
                });
            }
        }
    }

    fetchDataFromApi({itemType, args = {}}) {

        const { onError } = this.props;

        let _URL;
        switch (itemType) {

            case localConstants._TYPE_DATABASES:
                _URL = apiFetcher._URL_DATABASES;
                break;

            case localConstants._TYPE_POLICIES:
                _URL = apiFetcher._URL_POLICIES(args.database);
                break;

            case localConstants._TYPE_FIELDS:
                _URL = apiFetcher._URL_FIELDS(args.database);
                break;

            case localConstants._TYPE_FIRST_INTERVAL:
                _URL = apiFetcher._URL_FIRST_INTERVAL(args.database, args.policy, args.field);
                break;

            case localConstants._TYPE_LAST_INTERVAL:
                _URL = apiFetcher._URL_LAST_INTERVAL(args.database, args.policy, args.field);
                break;
        }

        apiFetcher
            .fetchResources(_URL)
            .then((data) => {
                this.setState({ isLoading: true });
                return data;
            })
            .then(data => {
                this.setState({
                    dataset: {
                        ...this.state.dataset,
                        [itemType]: data  //ES6 computed property name
                    }
                });
            })
            .catch(err => {

                const options = {
                    url: _URL,
                    itemType: itemType,
                    error: err.message,
                    ...args
                };

                onError({
                    message: 'Service is temporarily unavailable, Try later!',
                    type: localConstants._ERROR_FETCH_FAILED,
                    ...options
                });
            })
            .then(() => this.setState({ isLoading: false }));
    }

    handleDropdownSelection({value, type}) {

        this.props.setConfigurationItem({ item: value, itemType: type });
    }

    handleOptionsSelection({bool, type}) {

        const { setOption, options } = this.props;

        setOption({ bool: !options[type], type: type });
    }

    render() {

        const { configuration, options } = this.props;

        const { isLoading } = this.state;

        const {
            [localConstants._TYPE_DATABASES]: databases,
            [localConstants._TYPE_POLICIES]: policies,
            [localConstants._TYPE_FIRST_INTERVAL]: firstInterval,
            [localConstants._TYPE_LAST_INTERVAL]: lastInterval,

        } = this.state.dataset;

        //dropdowns unlocking
        let unlockPoliciesDropdown = false;
        let unlockDateTimePickers = false;
        let unlockOptions = false;

        if (configuration[localConstants._TYPE_SELECTED_DATABASE]) {

            unlockPoliciesDropdown = true;
            if (configuration[localConstants._TYPE_SELECTED_POLICY] && firstInterval && lastInterval) {

                unlockDateTimePickers = true;
                if (configuration[localConstants._TYPE_SELECTED_START_INTERVAL] &&
                    configuration[localConstants._TYPE_SELECTED_END_INTERVAL]) {

                    unlockOptions = true;
                }
            }
        }

        return (

            <Panel defaultExpanded>
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
                                            max={lastInterval}
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
                                    <Col xs={12}>

                                        <ConfiguratorOptions
                                            label="Options"
                                            options={[
                                                {
                                                    name: 'Analysis',
                                                    type: localConstants._TYPE_OPTION_ANALYSIS,
                                                    onChange: this.handleOptionsSelection,
                                                    value: options[localConstants._TYPE_OPTION_ANALYSIS],
                                                    disabled: !unlockOptions,
                                                },
                                                {
                                                    name: 'HeatMap',
                                                    type: localConstants._TYPE_OPTION_HEATMAP,
                                                    onChange: this.handleOptionsSelection,
                                                    value: options[localConstants._TYPE_OPTION_HEATMAP],
                                                    disabled: !unlockOptions,
                                                }
                                            ]}/>
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