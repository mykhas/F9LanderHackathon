'use strict'

const request = require('superagent')

// libraries
// const synaptic = require('synaptic');
// const Neuron = synaptic.Neuron
// const Layer = synaptic.Layer
// const Network = synaptic.Network
// const Trainer = synaptic.Trainer
// const Architect = synaptic.Architect

const START = [0, 0, 0, 1]
const p = [1, 1, 1, 0]

const TIME_STEP = 1;
const PANIC_ANGLE = 0.2;
const SAFE_DISTANCE = 1;
const DECELERATION_DISTANCE = 30;
const SAFE_SPEED = -5;
const DECELERATION_SPEED = -8;

let previousState;

function req(cmd, cb) {
    request
        .get('127.0.0.1:50007/' + cmd.toString())
        .end(cb)
}

/**
 * Commands helper
 */
function status(cb) {
    req('0000', (e, r) => {
        cb( r.body )
    })
}

function restart(cb) {
    req('0001', (e, r) => {
        cb( r.body )
    })
}

function executeState(state, cb) {
    switch (Number(state).toString(2).length) {
      case 3:
        state = '0' + Number(state).toString(2);
        break;
      case 2:
        state = '00' + Number(state).toString(2);
        break;
      case 1:
        state = '000' + Number(state).toString(2);
        break;
      case 0:
        state = '0000' + Number(state).toString(2);
        break;
      default:
        state = Number(state).toString(2);
        break;
    }

    req(state, (e, r) => {
        cb( r.body )
    })
}

function step(state) {
    let newState = 0; // initial state, 1000
    let ax = 0, ay = 0;

    if (state === undefined) state = 14; // all duses are on, 1110

    executeState(state, (e, r) => {
        console.log(e, r);

        if (e[1]) {
          if (previousState) {
            e[1].ax = e[1].vx - previousState.vx;
            e[1].ay = e[1].vy - previousState.vy;
          }
          previousState = e[1];
          console.log(- 7 - 0.55 * e[1].py)
          console.log(e[1].vy)

          if (e[1].vy <= - 0.55 * e[1].py) { // we're going up
            if (e[1].vy <= - 0.8 * e[1].py) {
              newState |= 14;
            } else {
              newState |= 8;
            }
          } else {
            newState &= 0;
          }

          if(e[1].angle > PANIC_ANGLE) {
            newState |= 2;
          } else if (e[1].angle < -PANIC_ANGLE) {
            newState |= 4;
          }
        }

        setTimeout(() => { step(newState) }, TIME_STEP)
    })


}

status( data => {

    restart( data => {

        previousState = {};

        step( () => {
            setTimeout(step, TIME_STEP)
        } )

    })

})