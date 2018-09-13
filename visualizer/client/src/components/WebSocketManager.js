import React, { Component } from 'react';

import { config } from "../config/config";
import * as localConstants from "../utils/constants";
import * as wsTypes from "../commons/wsEvents";

import io from "socket.io-client";

import { connect } from 'react-redux';

import { notify } from "../store/actions/notificationsAction";
import { setConnection, resetConnection, addItem, removeItem } from "../store/actions/webSocketAction";

import { getConnectionStatus, getRequestsQueue } from "../store/selectors/webSocketSelector";
import { } from '../store/selectors/computationSelector';

class WebSocketManager extends Component {

    constructor() {
        super();

        this.state = {

            connected: false,
            connectionAttempts: 0,
        }
    }

    componentDidMount() {

        const { notify, setConnection, resetConnection, addResponse } = this.props;

        this.socket = io
            .connect(`${config.API_PROTOCOL}://${config.API_HOSTNAME}:${config.API_PORT}/ws/static`,
                {
                    transports: ['polling','websocket'],  //options
                    //secure: true,             //https
                    reconnection: config.WS_ENABLE_RECONNECTION,
                    reconnectionDelay: config.WS_RECONNECTION_DELAY,
                    reconnectionAttempts: config.WS_RECONNECTION_ATTEMPTS,
                });
            //.of('/ws/heatmap');           //namespace

        this.socket
            .on('connect', () => {

                setConnection({
                    connected: true,
                });

                notify({
                    enable: true,
                    message: `You are connected!`,
                    type: localConstants.NOTIFICATION_TYPE_SUCCESS,
                    delay: localConstants.NOTIFICATION_DELAY,
                });

                this.setState({ connected: true, connectionAttempts: 0 });
            })
            .on('connect_error', () => {

                notify({
                    enable: true,
                    message: `connection failed, attempt to reconnect..`,
                    type: localConstants.NOTIFICATION_TYPE_ERROR,
                    delay: config.WS_RECONNECTION_DELAY,
                });

                this.setState({ connected: false, connectionAttempts: ++this.state.connectionAttempts });
            })
            .on('disconnect', () => {

                notify({
                    enable: true,
                    message: `You have been disconnected!`,
                    type: localConstants.NOTIFICATION_TYPE_WARNING,
                    delay: localConstants.NOTIFICATION_DELAY,
                });
            });

        this.socket
            .on(wsTypes.COMPUTATION_ERROR, (error) => {

                notify({
                    enable: true,
                    message: `${error.message}`,
                    type: localConstants.NOTIFICATION_TYPE_ERROR,
                    delay: localConstants.NOTIFICATION_DELAY,
                })
            })
            .on(wsTypes.COMPUTATION_SUCCESS, (response) => {

                addResponse({
                    uuid: response.uuid,
                    operation: response.type,
                    data: response.data,
                });

                notify({
                    enable: true,
                    message: `${response.type} completed`,
                    type: localConstants.NOTIFICATION_TYPE_SUCCESS,
                    delay: localConstants.NOTIFICATION_DELAY,
                });
            });
    }

    componentWillUnmount() {

        this.socket.close();
    }

    componentDidUpdate(prevProps, prevState, prevContext) {

        const { notify, requestsQueue, removeRequest } = this.props;

        if (this.state.connectionAttempts > config.WS_RECONNECTION_ATTEMPTS) {
            notify({
                enable: true,
                message: `Cannot establish a connection with the server, try later`,
                type: localConstants.NOTIFICATION_TYPE_ERROR,
                delay: Number.MAX_SAFE_INTEGER
            })
        }

        if (requestsQueue.length > 0) {

            requestsQueue.slice().reverse().forEach((request, index) => {

                //send request with ws
                this.socket.emit(wsTypes.COMPUTATION_REQUEST, {
                    ...request.data,
                    type: request.operation,
                    uuid: request.uuid,
                });

                //remove from the queue
                removeRequest();
            });
        }
    }

    render() {

        return null;
    }
}

const mapStateToProps = state => {

    return {

        connectionStatus: getConnectionStatus(state),
        requestsQueue: getRequestsQueue(state),
    }
};

const mapDispatchToProps = (dispatch) => {

    return {

        notify: (notification) => dispatch(notify(notification)),
        setConnection: (connection) => dispatch(setConnection(connection)),
        resetConnection: () => dispatch(resetConnection()),
        addResponse: (response) => dispatch(addItem({...response, queueType: localConstants._TYPE_RESPONSES_QUEUE})),
        removeRequest: () => dispatch(removeItem({queueType: localConstants._TYPE_REQUESTS_QUEUE})),
    }
};

export default connect(mapStateToProps, mapDispatchToProps)(WebSocketManager);