var request = require('request');
var tuid = require('timer-uid').tuid;
var body2Query = require('body-to-query').body2Query;

var rest = {
  get: restRequest('GET'),
  post: restRequest('POST'),
  put: restRequest('PUT'),
  patch: restRequest('PATCH'),
  delete: restRequest('DELETE')
};

function FirebaseOnRest(uri) {
  this.uri = uri.replace(/\/$/, '');
  this._query = {};
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
  return new FirebaseOnRest('https://' + this.uri.split('/')[2]).setAuth(this._auth);
}

FirebaseOnRest.prototype.parent = function() {
  var s = this.uri.split('/');
  s.pop();
  return new FirebaseOnRest(s.join('/')).setAuth(this._auth);
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
  return new FirebaseOnRest(this.uri + '/' + path).setAuth(this._auth);
}

FirebaseOnRest.prototype.once = function(cb) {
  var self = this;
  var body = self._query;
  self._query = {};
  rest.get(self, body, function(err, data) {
    if(data && data.error) return console.log(data.error);

    (cb || noop)(new DataSnapshot(self, data));
  });
}

FirebaseOnRest.prototype.set = function(data, cb) {
  rest.put(this, data, function(err, data) {
    if(err || (data && data.error)) return (cb || noop)(err || data);
  });
}

FirebaseOnRest.prototype.update = function(data) {
  rest.patch(this, data, function(err, data) {
    if(err || (data && data.error)) return (cb || noop)(err || data);
  });
}


FirebaseOnRest.prototype.remove = function(cb) {
  rest.delete(this, null, function(err, data) {
    if(err || (data && data.error)) return (cb || noop)(err || data);
  });
}

function noop() {}

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

    request(opt, function(err, body, json) {
      (cb || noop)(err, json);
    });
  };
}

module.exports = FirebaseOnRest;
