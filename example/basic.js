var zetta = require('zetta');
var cluster = require('../');
var Photocell = require('zetta-photocell-mock-driver');
var LED = require('zetta-led-mock-driver');

cluster({ zetta: zetta })
  .server('cloud')
  .server('detroit1', [LED, Photocell], ['cloud'])
  .server('detroit2', [LED, Photocell], ['cloud'])
  .on('ready', function() {
    console.log('all peers connected')
  })
  .run(function(err) {
    console.log(err);
  })
