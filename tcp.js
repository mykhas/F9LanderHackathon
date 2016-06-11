var net = require('net');
var client = new net.Socket();

client.connect(50007, '127.0.0.1', function() {
    console.log('Connected');

    client.end( str(START) )

    step()
})

client.on('close', function() {
    console.log('Connection closed');
})

client.on('error', function(err) {
    console.log('ERROR:', err.code || err);

    client.destroy();
})

function step() {
    // if(client.writable) {
        client.end( str(p) )
        
        step()
        setTimeout(step, TIME_STEP)
    // }
}
