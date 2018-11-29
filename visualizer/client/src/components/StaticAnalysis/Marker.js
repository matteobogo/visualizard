import React, { Component } from 'react';
import PropTypes from 'prop-types';

import MapPinRed from '../../../public/images/map-pin-darkred.svg';
import MapPinBlue from '../../../public/images/map-pin-darkblue.svg';
import MapPinGreen from '../../../public/images/map-pin-darkgreen.svg';
import MapPinYellow from '../../../public/images/map-pin-darkyellow.svg';
import MapPinPurple from '../../../public/images/map-pin-darkpurple.svg';
import MapPinCiano from '../../../public/images/map-pin-darkciano.svg';

import './Marker.css';

const imageOffset = {
    left: 15,
    top: 31
};

const colors = {

    '#8B0000':      { ref: MapPinRed, r: 139, g: 0, b: 0 },         //DARK_RED
    '#00008B':      { ref: MapPinBlue, r: 0, g: 0, b: 139 },        //DARK_BLUE
    '#008B00':      { ref: MapPinGreen, r: 0, g: 139, b: 0 },       //DARK_GREEN
    '#8B8B00':      { ref: MapPinYellow, r: 139, g: 139, b: 0 },    //DARK_YELLOW
    '#8B008B':      { ref: MapPinPurple, r: 139, g: 0, b: 139 },    //DARK_PURPLE
    '#008B8B':      { ref: MapPinCiano, r: 0, g: 139, b: 139 }      //DARK_CIANO
};

const colorMap = new Map(Object.entries(colors));

export const getAvailablePinColors = () => [...colorMap.keys()];

export default class Marker extends Component {

    constructor(props) {
        super(props);
    }

    // what do you expect to get back with the event
    eventParameters = (event) => ({
        event,
        anchor: this.props.anchor,
        payload: this.props.payload
    });

    componentDidMount () {

        let images = [];
        for (let [_, value] of colorMap) {

            images.push(value.ref);
        }

        images.forEach(image => {
            let img = new window.Image();
            img.src = image
        })
    }

    handleClick = (event) => {
        this.props.onClick && this.props.onClick(this.eventParameters(event))
    };

    handleContextMenu = (event) => {
        this.props.onContextMenu && this.props.onContextMenu(this.eventParameters(event))
    };

    handleMouseOver = (event) => {
        this.props.onMouseOver && this.props.onMouseOver(this.eventParameters(event))
        this.props.handleMarkerHover(true);
    };

    handleMouseOut = (event) => {
        this.props.onMouseOut && this.props.onMouseOut(this.eventParameters(event))
        this.props.handleMarkerHover(false);
    };

    render () {
        const { left, top, onClick, pinColor } = this.props;

        const style = {
            position: 'absolute',
            transform: `translate(${left - imageOffset.left}px, ${top - imageOffset.top}px)`,
            cursor: onClick ? 'pointer' : 'default'
        };

        if (!colorMap.has(pinColor)) return null;

        return (
            <div style={style}
                 className='marker-click-box'
                 onClick={this.handleClick}
                 onContextMenu={this.handleContextMenu}
                 onMouseOver={this.handleMouseOver}
                 onMouseOut={this.handleMouseOut}>
                <img src={colorMap.get(pinColor).ref} width={29} height={34} alt='' />
            </div>
        )
    }

    static propTypes = {
        // input, passed to events
        anchor: PropTypes.array.isRequired,
        payload: PropTypes.any,

        // pin type
        pinColor: PropTypes.string.isRequired,

        // optional modifiers
        hover: PropTypes.bool,

        // callbacks
        onClick: PropTypes.func,
        onContextMenu: PropTypes.func,
        onMouseOver: PropTypes.func,
        onMouseOut: PropTypes.func,

        // pigeon variables
        left: PropTypes.number,
        top: PropTypes.number,

        // pigeon functions
        latLngToPixel: PropTypes.func,
        pixelToLatLng: PropTypes.func
    }
}