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

//redux
import { connect } from 'react-redux';
import * as actionTypes from '../store/types/actionTypes';
import { getNotification } from '../store/selectors/notificationsSelector';

const _TIMEOUT_PING = 5000;
const _TOAST_SETTINGS = {

    position: toast.POSITION.BOTTOM_LEFT,
    autoClose: _TIMEOUT_PING
};

class NavBar extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            isOnline: true,
        };
    }

    componentDidMount() {
        // this.interval = setInterval(() => {
        //
        //     fetch(config.API_URL+'/ping')
        //         .then((res) => res.json())
        //         .then(res => {
        //             if (this.state.isOnline === false) {
        //                 this.notifyToast('Great! Server is now online!', 'success');
        //             }
        //             if (res.success === true) {
        //                 this.setState({isOnline: true});
        //             }
        //         })
        //         .catch((err) => {
        //             if (this.state.isOnline === true) {
        //                 this.notifyToast('Sorry! Service is offline! Try Later!', 'error');
        //             }
        //             this.setState({ isOnline: false });
        //         });
        // }, _TIMEOUT_PING)

        //websockets
        //const socket = io.connect('http://localhost:3000/ws');
        //console.log('a');
        // socket
        //     .on("connect", () => {
        //
        //         console.log('connected!');

        // socket
        //     .on('connect', () => {
        //         socket.emit('computeHeatMap', 'test');
        //     });

            // .send(
            //     "computeHeatMap",
            //     {
            //         type: 'all',
            //         dbname: 'google_cluster',
            //         policy: 'autogen',
            //         start_interval: '2011-02-01T00:15:00.000Z',
            //         end_interval: '2011-02-04T13:30:00.000Z',
            //         field: 'mean_cpu_usage_rate',
            //         n_measurements: 10,
            //         period: 300
            //     });
            // });
    }

    // componentWillUnmount() {
    //     clearInterval(this.interval);
    // }

    notifyToast(message, type) {

        switch(type) {

            case actionTypes.NOTIFICATION_TYPE_SUCCESS:
                toast.success(message, {
                    position: _TOAST_SETTINGS.position,
                    autoClose: _TOAST_SETTINGS.autoClose
                });
                break;

            case actionTypes.NOTIFICATION_TYPE_ERROR:
                toast.error(message, {
                    position: _TOAST_SETTINGS.position,
                    autoClose: _TOAST_SETTINGS.autoClose
                });
                break;

            case actionTypes.NOTIFICATION_TYPE_WARNING:
                toast.warn(message, {
                    position: _TOAST_SETTINGS.position,
                    autoClose: _TOAST_SETTINGS.autoClose
                });
                break;
        }
    }

    render() {

        if (this.props.notification.status !== "") {

            this.notifyToast(
                this.props.notification.status,
                this.props.notification.notificationType);
        }

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

const mapStateToProps = state => {

    return {

        notification: getNotification(state),
    }
};

export default connect(mapStateToProps, null)(NavBar);