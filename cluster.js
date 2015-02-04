var util = require('util');
var EventEmitter = require('events').EventEmitter;
var http = require('http');
var url = require('url');
var async = require('async');

module.exports = function(opts) {
  return new ZettaTest(opts);
};

var ZettaTest = function(opts) {
  EventEmitter.call(this);

  opts = opts || {};

  this.zetta = opts.zetta;
  if (!this.zetta || !this.zetta.PeerRegistry || !this.zetta.DeviceRegistry) {
    throw new Error('Must pass in zetta as an option, zetta >= 0.19.0');
  }

  this.DeviceRegistry = require('./mem_device_registry')(this.zetta);
  this.PeerRegistry = require('./mem_peer_registry')(this.zetta);

  this.startPort = opts.startPort;
  this._nextPort = this.startPort;
  this.servers = {};
  this._serversUrl = {};
};
util.inherits(ZettaTest, EventEmitter);

ZettaTest.prototype.server = function(name, scouts, peers) {
  var server = this.zetta({ registry: new this.DeviceRegistry(), peerRegistry: new this.PeerRegistry() });
  server.silent();
  server.name(name);

  if (scouts) {
    scouts.forEach(function(Scout) {
      server.use(Scout);
    });
  }

  server.locatePeer = function(id) {
    return encodeURI(id);
  };
 
  server._testPeers = peers || [];
  this.servers[name] = server;
  return this;
};

ZettaTest.prototype.stop = function(callback) {
  var self = this;
  Object.keys(this.servers).forEach(function(key) {
    var server = self.servers[key];
    server.httpServer.server.close();
  });
};

ZettaTest.prototype.run = function(callback) {
  var self = this;
  self.waitForAllPeerConnections(function() {
    self.emit('ready');
  });

  this.startServers(function(err) {
    if (err) {
      return callback(err);
    }

    self.linkServers(function(err) {
      if (err) {
        return callback(err);
      }
    });
  });
  return this;
};

ZettaTest.prototype.linkServers = function(callback) {
  var self = this;
  async.each(Object.keys(this.servers), function(serverKey, next) {
    var server = self.servers[serverKey];
    server._testPeers.forEach(function(peerName, i, peers) {
      var url = null;
      if (peerName.indexOf('http') > -1) {
        url = peerName;
      } else {
        if (!self.servers[peerName]) {
          return;
        }
        url = 'http://localhost:' + self.servers[peerName]._testPort;
        peers[i] = url;
        self._serversUrl[url] = self.servers[peerName];
      }

      self.emit('log', 'Server [' + serverKey + '] Linking to ' + url);
      server.link(url);
    });

    next();
  }, callback);
};

ZettaTest.prototype.startServers = function(callback) {
  var self = this;
  async.each(Object.keys(this.servers), function(serverKey, next) {
    var server = self.servers[serverKey];
    server.listen(0, function(err) {
      if (err) {
        return next(err);
      }
      server._testPort = server.httpServer.server.address().port;
      next();
    });
    
  }, callback);
};

ZettaTest.prototype.waitForAllPeerConnections = function(callback) {
  var self = this;
  async.each( Object.keys(this.servers), function(name, next) {
    var server = self.servers[name];
    self.peersConnected(server, next);
  }, callback);
};

ZettaTest.prototype.peersConnected = function(server, callback) {
  var self = this;
  var length = server._testPeers.length;
  if (length === 0) {
    return callback();
  }
  
  server.pubsub.subscribe('_peer/connect', function(ev, data) {
    if (!data.peer.url) {
      return;
    }

    var p = server._testPeers.filter(function(peer) {
      var pObj = url.parse(peer);
      return (url.parse(peer).host === url.parse(data.peer.url).host);
    });
    
    if (p.length === 0) {
      return;
    }
    
    var found = false;
    async.whilst(
      function () { return !found; },
      function (next) {
        self._checkExternalConnection(server, p[0], function(err) {
          if (!err) {
            found = true;
          }
          setTimeout(next, ((err) ? 5 : 0) );
        });
      },
      function (err) {
        if (p.length > 0) {
          length--;
          if (length === 0) {
            callback();
          }
        }
      }
    );
  });

};

ZettaTest.prototype._checkExternalConnection = function(server, peerUrl, callback) {
  var r = http.get(peerUrl + '/servers/' + encodeURI(server.id), function(res) {
    res.on('data', function() {});
    if (res.statusCode !== 200) {
      return callback(new Error('Not status code 200'));
    }
    callback();
  }).on('error', callback);
};
