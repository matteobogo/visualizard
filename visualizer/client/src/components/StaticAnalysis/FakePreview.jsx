import React from "react";
import PropTypes from 'prop-types';

import SomethingWrongImage from '../../../public/images/something-went-wrong.svg';

import './FakePreview.css';

export const FakePreview = () => {

    return (
        <div className="preview-image-container">
            <img src={SomethingWrongImage}/>
        </div>
    )
};

