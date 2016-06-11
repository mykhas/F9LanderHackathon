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
const PANIC_ANGLE = 0.3;
const SAFE_DISTANCE = 1;

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
    let newState = 8; // initial state, 1000

    if (state === undefined) state = 14; // all duses are on, 1110

    executeState(state, (e, r) => {
        console.log(e, r);

        if (e[1]) {
          if(e[1].angle > PANIC_ANGLE) {
            newState |= 2;
          } else if (e[1].angle < -PANIC_ANGLE) {
            newState |= 4;
          }

          if (e[1].dist <= SAFE_DISTANCE) {
            newState &= 0;
          }
        }

        setTimeout(() => { step(newState) }, TIME_STEP)
    })


}

status( data => {

    restart( data => {

        step( () => {
            setTimeout(step, TIME_STEP)
        } )

    })

})
