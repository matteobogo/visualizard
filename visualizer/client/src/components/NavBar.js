import React from 'react';
import * as config from "../config/config";

//react-bootstrap
import {
    Navbar,
    NavbarBrand,
    NavItem,
    Nav,
} from 'react-bootstrap'

//react toasts
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const _TIMEOUT_PING = 5000;
const _TOAST_SETTINGS = {

    position: toast.POSITION.BOTTOM_LEFT,
    autoClose: _TIMEOUT_PING
};

export default class NavBar extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            isOnline: true,
        };
    }

    componentDidMount() {
        this.interval = setInterval(() => {

            fetch(config.API_URL+'/ping')
                .then((res) => res.json())
                .then(res => {
                    if (this.state.isOnline === false) {
                        this.notifyToast('Great! Server is now online!', 'success');
                    }
                    if (res.success === true) {
                        this.setState({isOnline: true});
                    }
                })
                .catch((err) => {
                    if (this.state.isOnline === true) {
                        this.notifyToast('Sorry! Service is offline! Try Later!', 'error');
                    }
                    this.setState({ isOnline: false });
                });
        }, _TIMEOUT_PING)
    }

    componentWillUnmount() {
        clearInterval(this.interval);
    }

    notifyToast(message, type) {

        switch(type) {

            case 'success':
                toast.success(message, {
                    position: _TOAST_SETTINGS.position,
                    autoClose: _TOAST_SETTINGS.autoClose
                });
                break;

            case 'error':
                toast.error(message, {
                    position: _TOAST_SETTINGS.position,
                    autoClose: _TOAST_SETTINGS.autoClose
                });
                break;
        }
    }

    render() {
        return(
            <div>
                <ToastContainer/>
                <Navbar staticTop inverse fluid>
                    <Navbar.Header>
                        <Navbar.Brand>
                            <a href="#home">Visualizard</a>
                        </Navbar.Brand>
                    </Navbar.Header>
                    <Nav>
                        <NavItem eventKey={1} href="#">
                            Static Analysis
                        </NavItem>
                        <NavItem eventKey={2} href="#">
                            Real-time Analysis
                        </NavItem>
                        <NavItem eventKey={3} href="#">
                            About
                        </NavItem>
                    </Nav>
                </Navbar>
            </div>
        );
    }
}