import React from "react";
import PropTypes from 'prop-types';
import { DropdownList, DateTimePicker } from 'react-widgets';
import { FormGroup, ControlLabel } from 'react-bootstrap';

import '../../styles/dropdown.css'

export const DropdownClassic = (props) => {

    return (
        <FormGroup>
            <ControlLabel>{props.label}</ControlLabel>
            <div className="dropdowns-container">
                <DropdownList
                    id={props.id}
                    placeholder={props.placeholder}
                    busy={props.loading}
                    busySpinner={<span className="fas fa-sync fa-spin" />}
                    data={props.data}
                    value={props.value}
                    onChange={value => props.onChange({ value: value, type: props.type })}
                    disabled={props.disabled}
                />
            </div>
        </FormGroup>
    );
};

DropdownClassic.propTypes = {

    label: PropTypes.string.isRequired,
    id: PropTypes.string.isRequired,
    placeholder: PropTypes.string,
    loading: PropTypes.bool.isRequired,
    data: PropTypes.array.isRequired,
    type: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool.isRequired,
};

DropdownClassic.defaultProps = {
    disabled: false
};

const handleTime = (value) => {

    return new Date(value);
};

export const DropdownDateTime = (props) => {

    return (
        <FormGroup>
            <ControlLabel>{props.label}</ControlLabel>
            <div className="dropdowns-container">
                <DateTimePicker
                    id={props.id}
                    placeholder={props.placeholder}
                    min={handleTime(props.min)}
                    max={handleTime(props.max)}
                    step={props.step}
                    value={props.value && handleTime(props.value)}  //during init receives 'null' (i.e. !props.value)
                    onChange={value => {

                        return props.onChange({ value: value, type: props.type });
                    }}
                    disabled={props.disabled}>
                </DateTimePicker>
            </div>
        </FormGroup>
    );
};

DropdownDateTime.propTypes = {
    label: PropTypes.string.isRequired,
    id: PropTypes.string.isRequired,
    placeholder: PropTypes.string,
    min: PropTypes.any,
    max: PropTypes.any,
    step: PropTypes.number.isRequired,
    type: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool.isRequired,
};