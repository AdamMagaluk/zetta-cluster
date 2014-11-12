var cluster = require('../cluster');
var SineWave = require('zetta-sine-wave');
var LED = require('zetta-mock-led');

var cloud = 'http://hello-zetta.herokuapp.com';

cluster({ startPort: 20000 })
  .server('detroit', [SineWave, LED], [cloud])
  .server('san jose', [SineWave, LED], [cloud])
  .server('london', [SineWave, LED], [cloud])
  .server('bangalore', [SineWave, LED], [cloud])
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
