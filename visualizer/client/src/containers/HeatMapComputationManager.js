/**
 * HeatMapComputationManager - Container Component
 */
import React, { Component } from 'react';
import { connect } from 'react-redux';

//redux
import * as actionTypes from '../store/types/actionTypes';
import { notify } from '../store/actions/notificationsAction';

//websockets - socket.io
import io from 'socket.io-client';

class HeatMapComputationManager extends Component {

    constructor() {
        super();

        this.state = {
            connected: false,
        };
    }

    componentDidMount() {

        this.socket = io
            .connect('http://localhost:3000',   //endpoint
                {
                    transports: ['websocket'],  //options
                    //secure: true,             //https
                })
            .connect('/ws')                     //namespace

            .on('connect', () => {
                if (!this.state.connected) {
                    this.setState({connected: true});
                    this.props.notify(
                        'connection established', notifications_type.NOTIFICATION_TYPE_SUCCESS);
                }
            })
            .on('connect_error', () => {
                if (this.state.connected) {
                    this.setState({connected: false});
                    this.props.notify(
                        'connection error', notifications_type.NOTIFICATION_TYPE_ERROR);
                }
            })
            .on('disconnect', () => {
                if (this.state.connected) {
                    this.setState({connected: false});
                    this.props.notify(
                        'disconnected', notifications_type.NOTIFICATION_TYPE_ERROR);
                }
            });
    }

    render() {
        return null;
    }
}

const mapStateToProps = state => {


};

const mapDispatchToProps = (dispatch) => {

    return {
        notify: (status, msgType) => dispatch(notify(status, msgType))
    }
};

export default connect(mapStateToProps, mapDispatchToProps)(HeatMapComputationManager);