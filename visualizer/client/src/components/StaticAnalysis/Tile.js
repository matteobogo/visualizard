import React, { Component } from 'react';
import FakeTile from '../../../public/images/something-went-wrong.svg';

import { LoadingOverlay, Loader } from 'react-overlay-loader';
import 'react-overlay-loader/styles.css';

export default class Tile extends Component {

    constructor() {

        super();

        this.state = {

            isLoading: false,
            isValid: false,
        };

        this.onMouseClick = this.onMouseClick.bind(this);
    }

    componentDidMount() {

        this.tileValidation();
    }

    componentDidUpdate(prevProps, prevState, prevContext) {

        if (this.props.tileURL !== prevProps.tileURL) {

            this.tileValidation();
        }
    }

    tileValidation() {

        this.setState({isLoading: true});

        fetch(this.props.tileURL)
            .then(res => {

                let valid = false;
                if (res.ok && res.status === 200) valid = true;

                this.setState({
                    isLoading: false,
                    isValid: valid,
                })
            })
            .catch(err => {

                this.setState({
                    isValid: false,
                    isLoading: false,
                });
            });
    }

    onMouseClick(event) {

        const { tileID, handleTileMouseClick } = this.props;

        //computes (x,y) pixels coords within the tile
        const bounds = event.target.getBoundingClientRect();
        const pos_x = event.clientX - bounds.left;
        const pos_y = event.clientY - bounds.top;

        handleTileMouseClick({
            tileX: tileID[0],
            tileY: tileID[1],
            imgX: pos_x,
            imgY: pos_y,
        });
    }

    onMouseHoover(event) {


    }

    render() {

        const { isLoading, isValid } = this.state;
        const { tileURL } = this.props;

        return (

            <div className="tile-wrapper">
                <LoadingOverlay className="overlay-loader">
                    {
                        isValid ?
                            <div onClick={(e) => this.onMouseClick(e)}>
                                <img className="tile" src={tileURL}/>
                            </div>
                                :
                            <div>
                                <img className="tile" src={FakeTile}/>
                            </div>
                    }
                    <Loader loading={isLoading}/>
                </LoadingOverlay>
            </div>
        );
    }
}