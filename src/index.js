var request = require('request');
var EventSource = require('eventsource');
var tuid = require('timer-uid').tuid;
var body2Query = require('body-to-query').body2Query;

var rest = {
  get: restRequest('GET'),
  post: restRequest('POST'),
  put: restRequest('PUT'),
  patch: restRequest('PATCH'),
  delete: restRequest('DELETE')
};

function FirebaseOnRest(uri, auth) {
  this.uri = uri.replace(/\/$/, '');
  this._query = {};
  this.setAuth(auth);
}

FirebaseOnRest.prototype.on = function(type, cb) {
  var self = this;
  cb = cb || noop;
  var es = new EventSource(this.uri + '.json');
  es.onerror = function(err) {
    console.log('onerror');
    console.log(err);
  }
  es.addEventListener(type, function(data) {
    cb(new DataSnapshot(self, JSON.parse(data.data).data));
  });
}

FirebaseOnRest.prototype.setAuth = function(auth) {
  if(auth) this._auth = auth;
  return this;
}

FirebaseOnRest.prototype.unauth = function() {
  delete this._auth;
  return this;
}

FirebaseOnRest.prototype.toString = function() {
  return this.uri;
}

FirebaseOnRest.prototype.key = function() {
  return this.uri.split('/').pop();
}

FirebaseOnRest.prototype.root = function() {
  return new FirebaseOnRest('https://' + this.uri.split('/')[2], this._auth);
}

FirebaseOnRest.prototype.parent = function() {
  var s = this.uri.split('/');
  s.pop();
  return new FirebaseOnRest(s.join('/'), this._auth);
}

FirebaseOnRest.prototype.orderByChild = function(name) {
  this._query.orderBy = '"' + name + '"';
  return this;
}

FirebaseOnRest.prototype.limitToFirst = function(num) {
  if(!this._query.orderBy) this.orderByKey();
  delete this._query.limitToLast;
  this._query.limitToFirst = num;
  return this;
}

FirebaseOnRest.prototype.limitToLast = function(num) {
  if(!this._query.orderBy) this.orderByKey();
  delete this._query.limitToFirst;
  this._query.limitToLast = num;
  return this;
}

FirebaseOnRest.prototype.orderByKey = function() {
  this._query.orderBy = '"$key"';
  return this;
}

FirebaseOnRest.prototype.orderByValue = function() {
  this._query.orderBy = '"$value"';
  return this;
}

FirebaseOnRest.prototype.orderByPriority = function() {
  this._query.orderBy = '"$priority"';
  return this;
}

FirebaseOnRest.prototype.startAt = function(value) {
  this._query.startAt = value;
  return this;
}

FirebaseOnRest.prototype.endAt = function(value) {
  this._query.endAt = value;
  return this;
}

FirebaseOnRest.prototype.equalTo = function(value) {
  this._query.equalTo = value;
  return this;
}

FirebaseOnRest.prototype.push = function(data, cb) {
  var ref = this.child(tuid());
  if(!data) return ref;

  ref.set(data, cb);
}

FirebaseOnRest.prototype.child = function(path) {
  return new FirebaseOnRest(this.uri + '/' + path, this._auth);
}

FirebaseOnRest.prototype.once = function(event, cb) {
  if(event !== 'value') return;
  var self = this;
  var body = self._query;
  self._query = {};
  rest.get(self, body, function(err, data) {
    if(err) return console.log(err);

    (cb || noop)(new DataSnapshot(self, data));
  });
}

FirebaseOnRest.prototype.set = function(data, cb) {
  rest.put(this, data, onError(cb));
}

FirebaseOnRest.prototype.update = function(data, cb) {
  rest.patch(this, data, onError(cb));
}

FirebaseOnRest.prototype.remove = function(cb) {
  rest.delete(this, null, onError(cb));
}

function noop() {}

function onError(cb) {
  return function(err) {
    if(err) {
      console.log(err.error);
      (cb || noop)(err);
    }
  };
}

function DataSnapshot(ref, data) {
  this._ref = ref;
  this._data = data;
}

DataSnapshot.prototype.key = function() {
  return this._ref.key();
}

DataSnapshot.prototype.val = function() {
  return this._data;
}

DataSnapshot.prototype.ref = function() {
  return this._ref;
}

DataSnapshot.prototype.numChildren = function() {
  return this._data ? Object.keys(this._data).length : 0;
}

function restRequest(method) {
  return function(ref, data, cb) {
    cb = cb || noop;
    data = data || {};
    var opt = {
      url: ref.uri + '.json',
      method: method,
      json: true
    };

    if(['POST', 'PUT', 'PATCH'].indexOf(method) != -1) {
      if(ref._auth) {
        opt.url += '?auth=' + ref._auth;
      }
      opt.body = data;
    } else {
      if(ref._auth) {
        data.auth = ref._auth;
      }
      opt.url += body2Query(data);
    }

    request(opt, function(err, res, json) {
      if(res.statusCode > 300) {
        err = json;
        json = null;
      }
      cb(err, json);
    });
  };
}

module.exports = FirebaseOnRest;
