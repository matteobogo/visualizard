import React, { Component } from 'react';

import * as localConstants from "../utils/constants";

import { connect } from 'react-redux';
import { getNotification } from '../store/selectors/notificationsSelector';
import { notify, reset } from '../store/actions/notificationsAction';

import { ToastContainer, toast, Flip } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.min.css';

import './NotificationArea.css';

class NotificationArea extends Component {

    constructor() {
        super();

        this.handleNotificationDismiss = this.handleNotificationDismiss.bind(this);
    }

    notify = ({...options}) => {

        const toastConfig = {
            position: "bottom-right",
            autoClose: options.delay,
            newestOnTop: false,
            hideProgressBar: false,
            closeOnClick: true,
            onClose: this.handleNotificationDismiss,
            rtl: false,
            pauseOnVisibilityChange: true,
            pauseOnHover: false,
            draggable: true,
            draggablePercent: 100,
            transition: Flip,
        };

        switch(options.type) {

            case localConstants.NOTIFICATION_TYPE_SUCCESS:

                toast.success(options.message, toastConfig);
                break;

            case localConstants.NOTIFICATION_TYPE_ERROR:

                toast.error(options.message, toastConfig);
                break;

            case localConstants.NOTIFICATION_TYPE_WARNING:

                toast.warn(options.message, toastConfig);
                break;

            case localConstants.NOTIFICATION_TYPE_INFO:

                toast.info(options.message, toastConfig);
                break;
        }
    };

    handleNotificationDismiss() {

        this.props.reset();
    }

    componentDidUpdate(prevProps, prevState, prevContext) {

        if (prevProps !== this.props) {

            const { notification } = this.props;

            if (notification.enable) this.notify({...notification})
        }
    }
    
    render() {

        return (

            <div className="notification-area-container">
                <ToastContainer/>
            </div>
        );
    }
}

const mapStateToProps = state => {

    return {

        notification: getNotification(state),
    }
};

const mapDispatchToProps = (dispatch) => {

    return {

        notify: (notification) => dispatch(notify(notification)),
        reset: () => dispatch(reset()),
    }
};

export default connect(mapStateToProps, mapDispatchToProps)(NotificationArea);