import React from 'react';

import {
    Navbar,
    NavItem,
    Nav,
} from 'react-bootstrap'

import './NavBar.css';

export default class NavBar extends React.Component {

    constructor(props) {
        super(props);

    }

    render() {

        return(
            <div>
                <Navbar staticTop fluid>
                    <Navbar.Header>
                        <Navbar.Brand>
                            <a href="#home">Visualizard</a>
                        </Navbar.Brand>
                        <Navbar.Toggle/>
                    </Navbar.Header>
                    <Navbar.Collapse>
                        <Nav>
                            <NavItem eventKey={1} href="#">
                                Static Analysis
                            </NavItem>
                            <NavItem eventKey={3} href="#">
                                About
                            </NavItem>
                        </Nav>
                    </Navbar.Collapse>
                </Navbar>
            </div>
        );
    }
}