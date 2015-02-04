var cluster = require('../cluster');
var zetta = require('zetta');
var SineWave = require('zetta-sine-wave');
var LED = require('zetta-mock-led');

var cloud = 'http://hello-zetta.herokuapp.com';

cluster({ zetta: zetta })
  .server('t-detroit', [SineWave, LED], [cloud])
  .server('t-san jose', [SineWave, LED], [cloud])
  .server('t-london', [SineWave, LED], [cloud])
  .server('t-bangalore', [SineWave, LED], [cloud])
  .on('log', console.log)
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
