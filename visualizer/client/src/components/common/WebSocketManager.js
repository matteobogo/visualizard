import React, { Component } from 'react';
import PropTypes from 'prop-types';

import io from "socket.io-client";

class WebSocketManager extends Component {

    componentDidMount() {

        const {
            URI,
            transports,
            SSL,
            reconnection,
            reDelay,
            reAttempts,
            handleConnection,
            handleErrored,
        } = this.props;

        this.socket = io
            .connect(URI,
                {
                    transports: transports,
                    secure: SSL,
                    reconnection: reconnection,
                    reconnectionDelay: reDelay,
                    reconnectionAttempts: reAttempts,
                })
            .on('connect', () => {

                handleConnection(true);
            })
            .on('connect_error', () => {

                handleErrored
            })
            .on('disconnect', () => {


            })

    }

    componentDidUpdate() {


    }

    componentWillUnmount() {


    }

    render() {

        return null;
    }
}

WebSocketManager.propTypes = {


};