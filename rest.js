'use strict'

const request = require('superagent')

// libraries
const synaptic = require('synaptic');
const Neuron = synaptic.Neuron
const Layer = synaptic.Layer
const Network = synaptic.Network
const Trainer = synaptic.Trainer
const Architect = synaptic.Architect

const START = [0, 0, 0, 1]
const p = [1, 1, 1, 0]

const TIME_STEP = 500

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

function left(cb) {
    req('1000', (e, r) => {
        cb( r.body )
    })
}

function center(cb) {
    req('0100', (e, r) => {
        cb( r.body )
    })
}

function right(cb) {
    req('0010', (e, r) => {
        cb( r.body )
    })
}

function step(cmd) {

    center( (e, r) => {
    console.log(e, r)


        setTimeout(step, TIME_STEP)
    })

    
}

status( data => {

    restart( data => {
        
        step( () => {
            setTimeout(step, TIME_STEP)
        } )

    })
    
})
