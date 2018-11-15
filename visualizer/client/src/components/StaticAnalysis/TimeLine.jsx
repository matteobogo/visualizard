import React from "react";
import PropTypes from 'prop-types';

import { config } from '../../config/config';

import './TimeLine.css';

const timestampBox = (props) => {

    let stylor = {};
    if (props.style === 'start') stylor = { textAlign: "left" };
    if (props.style === 'end') stylor = { textAlign: "right" };

    return(
        <div key={props.id} className="timestamp-box" style={{width: props.width}}>
            <div className="timestamp" style={stylor}>
                <p>{props.value}</p>
            </div>
        </div>
    );
};

export const TimeLine = (props) => {

    if (props.data.length < 2) return null;

    const timelineData = props.data.slice(0);

    const startTimestamp = timelineData.shift();
    const endTimestamp = timelineData.pop();

    return(
        <div className="timeline-area" style={{width: props.width}}>

            <svg width={props.width} height="5">
                <line className="horizontal-line" x1="0" y1="0" x2={props.width} y2="0"/>
                {
                    props.data.map((k,idx) => (
                        <line
                            key={idx}
                            className="vertical-line"
                            x1={config.TILE_SIZE * idx}
                            y1="0"
                            x2={config.TILE_SIZE * idx}
                            y2="20"/>
                    ))
                }
            </svg>

            <div className="timestamp-boxes-area">

                <div className="timestamp-box">
                    {
                        timestampBox({
                            id: 0,
                            value: startTimestamp,
                            width: (config.TILE_SIZE - config.TILE_SIZE / 2),
                            style: 'start',
                        })
                    }
                </div>

                {
                    timelineData.length !== 0 &&

                    timelineData.map((k,idx) => (
                        <div key={idx} className="timestamp-box-middle">
                            {
                                timestampBox({id: idx + 1, value: k, width: config.TILE_SIZE})
                            }
                        </div>
                        ))
                }

                <div id="timestamp-box">
                    {
                        timestampBox({
                            id: timelineData.length - 1,
                            value: endTimestamp,
                            width: (config.TILE_SIZE - config.TILE_SIZE / 2),
                            style: 'end',
                        })
                    }
                </div>

            </div>
        </div>
    );
};