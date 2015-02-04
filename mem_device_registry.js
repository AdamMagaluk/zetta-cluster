var util = require('util');
var levelup = require('levelup');
var memdown = require('memdown');

module.exports = function(zetta) {
  var Registry = zetta.DeviceRegistry;
  var MemRegistry = function() {
    var db = levelup({ db: memdown });
    Registry.call(this, { db: db, collection: 'devices' } );
  }
  util.inherits(MemRegistry, Registry);
  return MemRegistry;
}

