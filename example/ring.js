var cluster = require('../cluster');
var SineWave = require('zetta-sine-wave');
var LED = require('zetta-mock-led');

cluster({ startPort: 20000 })
  .server('cloud', [SineWave, LED], ['bangalore'])
  .server('detroit', [SineWave, LED], ['cloud'])
  .server('san jose', [SineWave, LED], ['detroit'])
  .server('london', [SineWave, LED], ['san jose'])
  .server('bangalore', [SineWave, LED], ['london'])
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
