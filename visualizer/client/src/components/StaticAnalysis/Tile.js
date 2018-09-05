import React, { Component } from 'react';
import FakeTile from '../../../public/images/something-went-wrong.svg';

import { LoadingOverlay, Loader } from 'react-overlay-loader';
import 'react-overlay-loader/styles.css';

export default class Tile extends Component {

    constructor() {
        super();

        this.state = {

            imgSrc: FakeTile,
            isLoading: false,
        };
    }

    componentDidMount() {


    }

    componentDidUpdate(prevProps, prevState, prevContext) {

        if (prevProps !== this.props) {

            const { tileURL } = this.props;

            //init (heatmap config not loaded)
            if (tileURL === null) this.setState({imgSrc: FakeTile});
            else {

                this.setState({ isLoading: true });

                fetch(tileURL)
                    .then(res => {

                        if (!res.ok || res.status !== 200) this.setState({imgSrc: FakeTile});
                        else this.setState({imgSrc: tileURL});
                    })
                    .catch(err => {

                        this.setState({imgSrc: tileURL});
                    })
                    .then(() => this.setState({ isLoading: false }));
            }
        }

    }

    render() {

        const { imgSrc, isLoading } = this.state;

        return (

            <div className="tile-wrapper">
                <LoadingOverlay className="overlay-loader">
                    <img className="tile" src={imgSrc}/>
                    <Loader loading={isLoading}/>
                </LoadingOverlay>
            </div>
        );
    }
}