'use strict'

const request = require('superagent')

// libraries
// const synaptic = require('synaptic');
// const Neuron = synaptic.Neuron
// const Layer = synaptic.Layer
// const Network = synaptic.Network
// const Trainer = synaptic.Trainer
// const Architect = synaptic.Architect

const TIME_STEP = 0;
let PANIC_ANGLE = 0.2;
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
  // console.log(state)
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
        // console.log(r.body)
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
let stage2ok = false
let stage3ok = false
let stage4ok = false
let stage5ok = false
let current_stage = 0;
let final_stage = false;


let _time = 0.0;  // just time counter
let _deltaTime = 0.1;  // adder to count time
let FRAME_STEP = 0.05;  // framestep

let newState = 0b1110; // initial state, 1110

const stateHistory = []

let last_minimum_y;

function step(state) {
    stateHistory.push(state)
    let ax = 0, ay = 0;

    // if (state === undefined) state = 14; // all duses are on, 1110

    // delta time counter
    _time += _deltaTime;
    if(!final_stage && _time <= FRAME_STEP) {
      console.log('Do nothing', _time, _deltaTime, FRAME_STEP)
      // do nothing
      executeState(0b0000, (e) => {
          // prev_velocity = rocket.vy;
          // setTimeout(() => { step(0b0000) }, TIME_STEP)
          step(0b0000)
      })
    } else {
      _time = 0.0;

      executeState(state, data => {

          if(stateHistory.length > 10) {
            stateHistory.shift()
          }

          const platform = data[0];
          const rocket = data[1];
          const other = data[2];

          newState = 0b0000

          // calc max angle
          PANIC_ANGLE = (1.0/Math.abs(rocket.wind)) * 80.0;

          // do physics logic
          if(current_stage == 0) {
            console.log('stage 0')

            newState = 0b1110;

            if(rocket.dist < 40.0) {
              current_stage = 1;
            }
            
          } else if(current_stage == 1) {
            console.log('stage 1')

            newState = 0b1000;

            if(rocket.dist < 30.0) {
              current_stage = 2;
            }

          } else if(current_stage == 2) {
            console.log('stage 2')

            newState = 0b0110;
            FRAME_STEP = 0.05;
            
            if(rocket.dist < 17.3) {
              current_stage = 3
            }

          } else if(current_stage == 3) {
            console.log('stage 3')

            // try to land
            newState = 0b1000;
            FRAME_STEP = 0.13;

            if(rocket.angle > 1.4 && rocket.dist >= 1.1) {
              newState |= 0b0010;
            } else if (rocket.angle < -1.4 && rocket.dist >= 1.1) {
              newState |= 0b0100;
            }

            if(rocket.dist > 9) {
              current_stage = 4;
            }

            console.log('dist', rocket.dist)
            if(rocket.dist < 5.0) {
              FRAME_STEP = 0.7
              current_stage = 4;
            }

          } else if(current_stage == 4){ // landing state
            console.log('stage 4')
            final_stage = true

            const PLATFORM_LEFT_MARGIN = platform.px - 8.0;
            const PLATFORM_RIGHT_MARGIN = platform.px + 8.0;

            if(rocket.px < PLATFORM_LEFT_MARGIN ) {
              newState |= 0b1010;
            } else if(rocket.px > PLATFORM_RIGHT_MARGIN){
              newState |= 0b1100;
            }


            if(rocket.angle > 1.6) {
              newState |= 0b0010;
            } else if (rocket.angle < -1.6) {
              newState |= 0b0100;
            }

            // landing state
            // newState = 0b1000;

            if(rocket.dist < 1.1) {
              newState = 0b0000
            }

            FRAME_STEP = 0.04;
          }


          // do margin correction
          

          /*if(rocket.px < PLATFORM_LEFT_MARGIN ) {
            newState |= 0b1010;
          } else if(rocket.px > PLATFORM_RIGHT_MARGIN){
            newState |= 0b1100;
          }*/

          // do angle correction
          if(!final_stage) {
            if(rocket.angle > PANIC_ANGLE && rocket.dist >= 1.1) {
              newState |= 0b0010;
            } else if (rocket.angle < -PANIC_ANGLE && rocket.dist >= 1.1) {
              newState |= 0b0100;
            }
          }
          


          // console.log(rocket.py, last_minimum_y + 3)
          // if(rocket.py > last_minimum_y + 3) {
          //   newState = 0b0000;
          // }

          last_minimum_y = rocket.py
          // prev_velocity = rocket.vy;
          // setTimeout(() => { step(0b0000) }, TIME_STEP)
          step(newState)
      })

    }
      // e - data
      /*executeState(state, (e) => {
          // console.log(e);
          // for ease access to simulation objects
          const platform = e[0];
          const rocket = e[1];
          const other = e[2];

          // do angle correction
          PANIC_ANGLE = (1.0/Math.abs(rocket.wind)) * 80.0;
          console.log( 'PANIC_ANGLE', PANIC_ANGLE )

          // do delta time correction
          // _deltaTime = 1.0 - (1.0/rocket.vy)


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
      })*/
    // }
}

status( data => {
    restart( data => {
        previousState = {};
        step(0b0000);

        stateHistory.push(0b0000)
        // step( () => {
        //     setTimeout(step, TIME_STEP)
        // } )
    })
})
