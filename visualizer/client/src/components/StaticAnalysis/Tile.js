import React, { Component } from 'react';
import FakePreview from '../../components/StaticAnalysis/FakePreview';

import * as localConstants from '../../utils/constants';

import { LoadingOverlay, Loader } from 'react-overlay-loader';
import 'react-overlay-loader/styles.css';

import ScrollLock from 'react-scrolllock';

export default class Tile extends Component {

    constructor() {

        super();

        this.state = {

            isLoading: false,
            isValid: false,
            lockScroll: false,
        };

        this.onMouseInteraction = this.onMouseInteraction.bind(this);
        this.onMouseClick = this.onMouseClick.bind(this);
        this.onMouseHoover = this.onMouseHoover.bind(this);
        this.onMouseWheel = this.onMouseWheel.bind(this);
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

    onMouseInteraction(event, type) {

        const { tileID, handleTileMouseInteraction } = this.props;

        //computes (x,y) pixels coords within the tile
        const bounds = event.target.getBoundingClientRect();
        let pos_x = Math.round(event.clientX - bounds.left);
        let pos_y = Math.round(event.clientY - bounds.top);

        pos_x = pos_x < 0 ? 0 : pos_x;
        pos_y = pos_y < 0 ? 0 : pos_y;

        handleTileMouseInteraction({
            coordinates: {
                tileX: tileID[0],
                tileY: tileID[1],
                imgX: pos_x,
                imgY: pos_y,
            },
            type: type,
        });
    }

    onMouseClick(event) {

        this.onMouseInteraction(event, localConstants._TYPE_MOUSE_CLICK);
    }

    onMouseHoover(event) {

        this.onMouseInteraction(event, localConstants._TYPE_MOUSE_HOOVER);
    }

    onMouseWheel(event) {

        const { tileID, handleTileMouseInteraction } = this.props;

        handleTileMouseInteraction({
            coordinates: {
                tileX: tileID[0],
                tileY: tileID[1],
                imgX: 0,
                imgY: 0,
            },
            zoomTick: event.deltaY,
            type: localConstants._TYPE_MOUSE_WHEEL,
        });
    }

    render() {

        const { isLoading, isValid, lockScroll } = this.state;
        const { tileURL } = this.props;

        return (

            <div className="tile-wrapper">
                <LoadingOverlay className="overlay-loader">
                    {
                        isValid ?
                            <div className="tile-container"
                                 onClick={(e) => this.onMouseClick(e)}
                                 onMouseMove={(e) => this.onMouseHoover(e)}
                                 onWheel={(e) => this.onMouseWheel(e)}
                                 onMouseEnter={() => this.setState({lockScroll: true})}
                                 onMouseLeave={() => this.setState({lockScroll: false})}>

                                <img className="tile" src={tileURL}/>
                                {
                                    lockScroll ? <ScrollLock/> : null
                                }
                            </div>
                                :
                            <FakePreview/>
                    }
                    <Loader loading={isLoading}/>
                </LoadingOverlay>
            </div>
        );
    }
}