var cluster = require('../cluster');
var SineWave = require('zetta-sine-wave');
var LED = require('zetta-mock-led');

var servers = ['cloud', 'detroit', 'san jose', 'london', 'bangalore'];

var c = cluster({ startPort: 20000 });

servers.forEach(function(server, idx) {
  servers.splice(idx, 1);
  c.server(server, [SineWave, LED], servers);
  servers.splice(idx, 0, server);
});

c.on('log', console.log)
  .on('ready', function() {
    // called when all server are connected to all of their peers
    console.log('cluster peers all connected')
  })
  .run(function(err) {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    // called once all peers run zetta.listen()    
  });
