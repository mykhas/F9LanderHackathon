'use strict'

const request = require('superagent')

const START = [0, 0, 0, 1]
const p = [1, 1, 1, 0]

const TIME_STEP = 1;

const PANIC_ANGLE = 0.1;
const PANIC_ANGLE_ON_PLATFORM = 0.1;

const SAFE_DISTANCE = 1;
const DECELERATION_DISTANCE = 30;

const SAFE_SPEED = -5;
const DECELERATION_SPEED = -8;
const SPEED_TO_PY = 0.35;

const X_CENTER = 50;
const X_SAFE_DISTANCE = 10;

let previousState, firstState;
let predictionByX;

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
    cb(r.body)
  })
}

function restart(cb) {
  req('0001', (e, r) => {
    cb(r ? r.body : undefined)
  })
}

function executeState(stateNumber, cb) {
  let state = Number(stateNumber).toString(2).length;
  while (state.length < 4) {
    state = '0' + state;
  }

  req(state, (e, r) => {
    cb(r ? r.body : undefined)
  })
}

function step(state, data) {
  let newState = 0; // initial state, 0000
  let ax = 0,
    ay = 0;

  if (state === undefined) state = 14; // all duses are on, 1110

  executeState(state, (e, r) => {
    if (e && e[1]) {
      if (previousState.px) {
        e[1].ax = e[1].vx - previousState.vx;
        e[1].ay = e[1].vy - previousState.vy;

        // TODO: don't calculate wind influence on late steps
        // predictionByX = (Math.tan(e[1].angle) * e[1].py) + e[1].px;
        predictionByX = (((e[1].px - firstState.px) / (e[1].py - firstState.py)) * -firstState.py) + Math.abs(firstState.px) + firstState.wind * 0.3;
        console.log(predictionByX);

        if (predictionByX > X_CENTER + X_SAFE_DISTANCE) {
          newState |= 4;
        } else if (predictionByX < X_CENTER - X_SAFE_DISTANCE) {
          newState |= 2;
        }
      } else {
        firstState = e[1];
      }
      previousState = e[1];

      // let speedC = Math.abs(firstState.wind) / 50 - 0.5;
      let speedC = SPEED_TO_PY;
      if (e[1].vy <= -speedC * e[1].py) { // we're going up
        if (e[1].vy <= -(speedC + 0.1) * e[1].py) {
          newState |= 14;
        } else {
          newState |= 8;
        }
      } else {
        newState &= 0;
      }

      if (e[1].py < 10 && e[1].vy <= 3 && e[1].px > X_CENTER - X_SAFE_DISTANCE && e[1].px < X_CENTER + X_SAFE_DISTANCE) {
        newState &= 0;
      }

      let panicAngle = (e[1].px > 3) ? PANIC_ANGLE : PANIC_ANGLE_ON_PLATFORM;

      if (e[1].angle > panicAngle) {
        newState |= 2;
      } else if (e[1].angle < -panicAngle) {
        newState |= 4;
      }

      if (e && e[2] && e[2].is_terminal_state) {
        restart(() => {
          data => {

            previousState = {};
            firstState = {};
            predictionByX = undefined;

            step((undefined, data) => {
              setTimeout(step, TIME_STEP)
            })

          }
        });
      }
    }

    setTimeout(() => {
      step(newState)
    }, TIME_STEP)
  })


}

status(data => {

  restart(data => {

    previousState = {};
    firstState = {};
    predictionByX = undefined;

    step((undefined, data) => {
      setTimeout(step, TIME_STEP)
    })

  })

})