import React, { Component } from 'react';

import { config } from '../../config/config';

import './FakePreview.css';

export default class FakePreview extends Component {

    componentDidMount() {
        this.updateCanvas();
    }

    updateCanvas() {
        const ctx = this.refs.canvas.getContext("2d");

        ctx.fillStyle = "rgb(255,255,255)";
        ctx.fillRect(0, 0, config.TILE_SIZE, config.TILE_SIZE);
    }

    render() {

        return (
            <div className="preview-image-container">
                <canvas ref="canvas" width={config.TILE_SIZE} height={config.TILE_SIZE} />
            </div>
        )
    }
}