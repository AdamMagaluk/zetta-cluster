var util = require('util');
var EventEmitter = require('events').EventEmitter;
var url = require('url');
var async = require('async');
var zetta = require('zetta');
var MemRegistry = require('./mem_registry');
var MemPeerRegistry = require('./mem_peer_registry');

module.exports = function(opts) {
  return new ZettaTest(opts);
};

var ZettaTest = function(opts) {
  EventEmitter.call(this);

  opts = opts || {};
  this.startPort = opts.startPort || Math.floor(2000 + Math.random() * 1000);
  this._nextPort = this.startPort;
  this.servers = {};
  this.RegType = opts.Registry || MemRegistry;
  this.PeerRegType = opts.PeerRegistry || MemPeerRegistry;
  this._serversUrl = {};
};
util.inherits(ZettaTest, EventEmitter);

ZettaTest.prototype.registry = function(Type) {
  this.RegType = Type;
  return this;
};

ZettaTest.prototype.peerRegistry = function(Type) {
  this.PeerRegType = Type;
  return this;
};

ZettaTest.prototype.server = function(name, scouts, peers) {
  var reg = new this.RegType();
  var peerRegistry = new this.PeerRegType();
  var server = zetta({ registry: reg, peerRegistry: peerRegistry });
  server.name(name);

  if (scouts) {
    scouts.forEach(function(Scout) {
      server.use(Scout);
    });
  }

  server.locatePeer = function(id) {
    return id;
  };
 
  server._testPeers = peers || [];
  server._testPort = this._nextPort++;
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
  Object.keys(this.servers).forEach(function(key) {
    var server = self.servers[key];
    server._testPeers.forEach(function(peerName) {
      if (!self.servers[peerName]) {
        return;
      }

      var url = 'http://localhost:' + self.servers[peerName]._testPort;
      self.emit('log', 'Server [' + key + '] Linking to ' + url);
      self._serversUrl[url] = self.servers[peerName];
      server.link(url);
    });
  });

  async.each( Object.keys(this.servers), function(name, next) {
    var server = self.servers[name];
    self.emit('log', 'Server [' + name + '] Started on port ' + server._testPort);
    server.listen(server._testPort, next);
  }, callback);

  self.waitForAllPeerConnections(function() {
    self.emit('ready');
  });

  return this;
};


ZettaTest.prototype.waitForAllPeerConnections = function(callback) {
  var self = this;
  async.each( Object.keys(this.servers), function(name, next) {
    var server = self.servers[name];
    self.peersConnected(server, next);
  }, callback);
};

ZettaTest.prototype.peersConnected = function(server, callback) {
  var length = server._peers.length;
  if (length === 0) {
    return callback();
  }
  
  server.pubsub.subscribe('_peer/connect', function(ev, data) {
    if (!data.peer.url) {
      return;
    }
    var idx = server._peers.indexOf('http://' + url.parse(data.peer.url).host);
    if (idx > -1) {
      length--;
      if (length === 0) {
        callback();
      }
    }
  });

};