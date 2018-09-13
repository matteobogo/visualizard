import React from 'react';

//spinner
import Spinner from 'react-spinkit';

//animate
import Animate from 'react-move/Animate';

const trackStyles = {
    borderRadius: 4,
    position: 'relative',
    margin: '5px 3px 10px',
    width: 250,
    height: 50,
};

export default class PacmanSpinner extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            isMoved: false,
        };
    }

    componentDidMount() {

        this.intervalSpinnerMoving = setInterval(() => {

            this.setState({isMoved: !this.state.isMoved});

        }, 1000);
    }

    componentWillUnmount() {
        clearInterval(this.intervalSpinnerMoving);
    }

    render() {
        return(
            <div>
                <Animate
                    start={() => ({x: 0,})}
                    update={() =>
                        ({
                            x: [this.state.isMoved ? 460 : 0],
                            timing: { duration: 3000},
                        })}>

                    {
                        (state) => {
                            const {x} = state;

                            return (
                                <div style={trackStyles}>
                                    <Spinner name="pacman"
                                             style={{
                                                 position: 'absolute',
                                                 borderRadius: 4,
                                                 WebkitTransform: `translate3d(${x}px, 0, 0)`,
                                                 transform: `translate3d(${x}px, 0, 0)`,
                                             }}
                                    />
                                </div>
                            );
                        }
                    }
                </Animate>
            </div>
        );
    }
}