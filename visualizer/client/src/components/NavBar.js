import React from 'react';
import {config} from "../config/config";

//react-bootstrap
import {
    Navbar,
    NavbarBrand,
    NavItem,
    Nav,
} from 'react-bootstrap'

export default class NavBar extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            status: 'offline',
        };
    }

    componentDidMount() {
        this.interval = setInterval(() => {

            fetch(config.API_URL+'/ping')
                .then((res) => res.json())
                .then(res => {
                    if (res.success === true)
                        this.setState({ status: 'online' });
                    else
                        this.setState({ status: 'offline' });
                })
                .catch((err) => {
                    this.setState({ status: 'offline' });
                });
        }, 5000)
    }

    componentWillUnmount() {
        clearInterval(this.interval);
    }

    render() {
        return(
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
                <Navbar.Collapse>
                    <Navbar.Text pullRight>
                        Service is {this.state.status}
                    </Navbar.Text>
                </Navbar.Collapse>
            </Navbar>
        );
    }
}