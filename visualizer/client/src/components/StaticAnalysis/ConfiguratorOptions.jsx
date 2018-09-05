import React from "react";
import PropTypes from 'prop-types';
import Switch from 'rc-switch';
import 'rc-switch/assets/index.css';
import { FormGroup, ControlLabel } from 'react-bootstrap';

import '../../styles/configurator-options.css';

const SwitchComponent = (props) => {

    return (
        <div className="switch-container">
            <span className="switch-label">{props.name}</span>
            <Switch
                onChange={bool => props.onChange({ bool: bool, type: props.type })}
                checked={props.value}
                disabled={props.disabled}
            />
        </div>
    );
};

export const ConfiguratorOptions = (props) => {

    return (

        <FormGroup>
            <ControlLabel>{props.label}</ControlLabel>
            <div className="switches-container">
                {
                    props.options.map((option, index) => (

                        <SwitchComponent
                            key={index}
                            name={option.name}
                            type={option.type}
                            onChange={option.onChange}
                            value={option.value}
                            disabled={option.disabled}/>
                    ))
                }
            </div>
        </FormGroup>
    );
};

ConfiguratorOptions.propTypes = {

    label: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(
        PropTypes.shape({
            name: PropTypes.string.isRequired,
            type: PropTypes.string.isRequired,
            onChange: PropTypes.func.isRequired,
            value: PropTypes.bool.isRequired,
            disabled: PropTypes.bool.isRequired,
        })
    ).isRequired,
};