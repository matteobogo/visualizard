import React from "react";
import PropTypes from 'prop-types';
import { Alert } from 'react-bootstrap';

import * as localConstants from '../../utils/constants';

import '../../styles/notification-bar.css';

export const NotificationBar = (props) => {

    let alertStyle;
    let alertTitle;

    switch(props.type) {

        case localConstants.NOTIFICATION_TYPE_SUCCESS:

            alertStyle = "success";
            alertTitle = 'Fantastic!';
            break;

        case localConstants.NOTIFICATION_TYPE_ERROR:

            alertStyle = "danger";
            alertTitle = "Oh snap! You got an error!";
            break;

        case localConstants.NOTIFICATION_TYPE_WARNING:

            alertStyle = "warning";
            alertTitle = "Be careful!";
            break;

        case localConstants.NOTIFICATION_TYPE_INFO:

            alertStyle = "info";
            alertTitle = "Just an info..";
            break;
    }

    return(
        <div className="notification-bar-container">
            {
                !props.disabled ?

                    <Alert className="alert" bsStyle={alertStyle} onDismiss={props.onDismiss}>
                        <h4>{alertTitle}</h4>
                        <p>{props.message}</p>
                    </Alert>

                    : null
            }
        </div>
    );
};

NotificationBar.propTypes = {

    type: PropTypes.oneOf([
        localConstants.NOTIFICATION_TYPE_SUCCESS,
        localConstants.NOTIFICATION_TYPE_ERROR,
        localConstants.NOTIFICATION_TYPE_WARNING,
        localConstants.NOTIFICATION_TYPE_INFO
    ]).isRequired,
    message: PropTypes.string.isRequired,
    onDismiss: PropTypes.func.isRequired,
    disabled: PropTypes.bool.isRequired,
};