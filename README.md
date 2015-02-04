# Zetta Cluster

Crate a cluster of zetta instances using in memory registry.

## Install

`npm install zetta-cluster`

## Usage

```js
var cluster = require('zetta-cluster');
var zetta = require('zetta');
var SineWave = require('zetta-sine-wave');
var LED = require('zetta-mock-led');

cluster({ zetta: zetta })
  .server('cloud')
  .server('detroit', [SineWave, LED], ['cloud'])
  .server('san jose', [SineWave, LED], ['cloud'])
  .server('london', [SineWave, LED], ['cloud'])
  .server('bangalore', [SineWave, LED], ['cloud'])
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
```

## Licence

MIT
