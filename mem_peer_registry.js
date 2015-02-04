var util = require('util');
var levelup = require('levelup');
var memdown = require('memdown');

module.exports = function(zetta) {
  var PeerRegistry = zetta.PeerRegistry;
  var MemPeerRegistry = function() {
    var db = levelup({ db: memdown });
    PeerRegistry.call(this, { db: db, collection: 'peers' });
  }
  util.inherits(MemPeerRegistry, PeerRegistry);
  return MemPeerRegistry;
}

