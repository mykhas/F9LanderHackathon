'use strict'

const request = require('superagent')

// libraries
// const synaptic = require('synaptic');
// const Neuron = synaptic.Neuron
// const Layer = synaptic.Layer
// const Network = synaptic.Network
// const Trainer = synaptic.Trainer
// const Architect = synaptic.Architect

const TIME_STEP = 1.0;
const PANIC_ANGLE = 0.2;
const SAFE_DISTANCE = 1.0;
const DECELERATION_DISTANCE = 40;
const SAFE_SPEED = -5.0;
const DECELERATION_SPEED = -8.0;

const PLATFORM_MARGIN = 1.0;

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
      if(!r.body) throw 'Body not present!'
      if(typeof r.body === 'string') {
        console.log(r.body)
        throw 'Invalid body type!'
      }

      cb( r.body )
    })
}

let prev_velocity = 40.0;


/**
 * 1 Stage - all engines & angle stabilization, move towards middle of the platform + 
 * 2 Stage - Slow down linearly, angle stabilization, move towards middle of the platform  
 * 3 Stage - when almost landed - microoptimizations for engines
 * 4 Stage - wait for successful landing
 */

let stage1ok = false

let _time = 0.0;  // just time counter
let _deltaTime = 0.1;  // adder to count time
let FRAME_STEP = 1.0;  // framestep

function step(state) {
    let newState = 0b1110; // initial state, 1110
    let ax = 0, ay = 0;

    if (state === undefined) state = 14; // all duses are on, 1110

    // delta time counter
    _time += _deltaTime;
    if(_time <= FRAME_STEP) {
      console.log('Do nothing', _time, _deltaTime, FRAME_STEP)
      // do nothing
      executeState(state, (e) => {
          // prev_velocity = rocket.vy;
          setTimeout(() => { step(0b0000) }, TIME_STEP)
      })
    } else {
      // e - data
      executeState(state, (e) => {
          // console.log(e);


          // for ease access to simulation objects
          const platform = e[0];
          const rocket = e[1];
          const other = e[2];

          _time = 0.0;
          _deltaTime = 1 - (1/rocket.vy)


          if (e[1]) {
            if (previousState) {
              e[1].ax = e[1].vx - previousState.vx;
              e[1].ay = e[1].vy - previousState.vy;
            }
            previousState = e[1];
            // console.log(e[1].vy)
            // console.log(e[1].ay)

            // block going up very high
            if(e[1].dist >= 40 && stage1ok) {
              newState = 0b0000;
            } else {
              // e[1].dist >= DECELERATION_DISTANCE
              // do stage 1

              // do maximum acceleartion to stabilize system
              // do Stage 2
              if (e[1].dist <= DECELERATION_DISTANCE) {
                stage1ok = true;
                if (e[1].vy >= SAFE_SPEED) { // we're going up
                  newState &= 0;
                } else if (e[1].vy >= DECELERATION_SPEED) {
                  newState |= 8;
                } else {
                  newState |= 14;
                }

                // 
                // platform 
                if (e[1].dist <= SAFE_DISTANCE) {
                  newState &= 0;
                }

                // Both engines in the rocket
                
                if(e[1].angle > PANIC_ANGLE && e[1].dist >= SAFE_DISTANCE) {
                  newState |= 2;
                } else if (e[1].angle < -PANIC_ANGLE) {
                  newState |= 4;
                }

                // move platform to middle of platform
                // const d = e[1].px - e[0].px;

                // console.log(d, prev_velocity, e[1].vy)

                // if(d > 0.0 && e[1].vy > prev_velocity) {
                //   // move left
                //   newState |= 0b1010;
                // } else {
                //   // move right
                //   newState |= 0b1100;
                // }
              } 
            }


          }
          // prev_velocity = rocket.vy;
          setTimeout(() => { step(newState) }, TIME_STEP)
      })
    }
}

status( data => {
    restart( data => {
        previousState = {};
        step( () => {
            setTimeout(step, TIME_STEP)
        } )
    })
})
