/**
 * WebSocketErrorHandler - Error Boundary for managing WebSocket errors
 */
import React, { Component } from 'react';

export default class WebSocketErrorHandler extends Component {

    constructor() {

        super();
        this.state = {hasError: false}
    }

    componentDidCatch(error, info) {

        this.setState({hasError: true});
    }

    render() {

        const { hasError } = this.state;

        if (hasError) {

            return <img src="/images/connection-error.png"/>;

        }
        return this.props.children;
    }
}