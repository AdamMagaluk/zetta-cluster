var util = require('util');
var EventEmitter = require('events').EventEmitter;
var url = require('url');
var async = require('async');
var MemRegistry = require('./mem_registry');
var MemPeerRegistry = require('./mem_peer_registry');
var portscanner = require('./portscanner');

module.exports = function(opts) {
  return new ZettaTest(opts);
};

var ZettaTest = function(opts) {
  EventEmitter.call(this);

  opts = opts || {};

  this.zetta = opts.zetta || require('zetta');

  this.startPort = opts.startPort;
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
  var server = this.zetta({ registry: reg, peerRegistry: peerRegistry });
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
//  server._testPort = this._nextPort++;
  this.servers[name] = server;
  return this;
};

ZettaTest.prototype.assignPorts = function(cb) {
  var self = this;
  var obj = { count: Object.keys(this.servers).length };
  if (this.startPort) {
    obj.startingPort = this.startPort;
  }
  
  portscanner(obj, function(err, ports) {
    if (err) {
      return cb(err);
    }
    
    if (typeof ports === 'number') {
      ports = [ports];
    }

    Object.keys(self.servers).forEach(function(key, i) {
      self.servers[key]._testPort = ports[i];
    });
    
    cb();
  });
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

  this.assignPorts(function(err) {
    if (err) {
      return callback(err);
    }
    
    Object.keys(self.servers).forEach(function(key) {
      var server = self.servers[key];
      server._testPeers.forEach(function(peerName) {        
        var url = null;
        if (peerName.indexOf('http') > -1) {
          url = peerName;
        } else {
          if (!self.servers[peerName]) {
            return;
          }

          url = 'http://localhost:' + self.servers[peerName]._testPort;
          self._serversUrl[url] = self.servers[peerName];
        }

        self.emit('log', 'Server [' + key + '] Linking to ' + url);
        server.link(url);
      });
    });

    self.waitForAllPeerConnections(function() {
      self.emit('ready');
    });

    async.each( Object.keys(self.servers), function(name, next) {
      var server = self.servers[name];
      self.emit('log', 'Server [' + name + '] Started on port ' + server._testPort);
      server.listen(server._testPort, next);
    }, callback);
    
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

    var p = server._peers.filter(function(peer) {
      var pObj = url.parse(peer);
      return (url.parse(peer).host === url.parse(data.peer.url).host);
    });

    if (p.length > 0) {
      length--;
      if (length === 0) {
        callback();
      }
    }
  });

};
