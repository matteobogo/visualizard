import React from "react";
import PropTypes from 'prop-types';
import { Clock, Activity } from 'react-feather';
import { ControlLabel } from 'react-bootstrap';

import './HeatMapSelectionBox.css';

export const HeatMapSelectionBox = (props) => {

    return (
        <div className="main-box-container">
            <ControlLabel>{props.label}</ControlLabel>
            <div className="properties-container">
                <div className="icon-box">
                    <Clock/>
                </div>
                <div className="property-box">
                    <p>{props.timestamp}</p>
                </div>
                <div className="icon-box">
                    <Activity/>
                </div>
                <div className="property-box">
                    <p>{props.machine}</p>
                </div>
            </div>
        </div>
    );
};

HeatMapSelectionBox.propTypes = {
    label: PropTypes.string.isRequired,
    timestamp: PropTypes.string.isRequired,
    machine: PropTypes.string.isRequired,
};