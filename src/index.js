var request = require('request');
var tuid = require('timer-uid').tuid;
var body2Query = require('body-to-query').body2Query;

var rest = {
  get: restRequest('GET'),
  post: restRequest('POST'),
  put: restRequest('PUT'),
  delete: restRequest('DELETE')
};

function FirebaseOnRest(uri) {
  this.uri = uri;
  this._query = {};
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
  return new FirebaseOnRest(this.uri + '/' + path);
}

FirebaseOnRest.prototype.once = function(cb) {
  var self = this;
  var body = self._query;
  self._query = {};
  rest.get(self.uri, body, function(err, data) {
    (cb || noop)(new DataSnapshot(self, data));
  });
}

FirebaseOnRest.prototype.set = function(data, cb) {
  var self = this;
  rest.put(self.uri, data, function(err, data) {
  });
}

FirebaseOnRest.prototype.remove = function(cb) {
  rest.delete(this.uri, null, cb);
}

function noop() {}

function DataSnapshot(ref, data) {
  this._ref = ref;
  this._data = data;
}

DataSnapshot.prototype.key = function() {
  return this._key;
}

DataSnapshot.prototype.val = function() {
  return this._data;
}

DataSnapshot.prototype.ref = function() {
  return this._ref;
}

function restRequest(method) {
  return function(uri, data, cb) {
    var opt = {
      url: uri + '.json',
      method: method,
      json: true
    };

    if(['POST', 'PUT'].indexOf(method) != -1) {
      opt.body = data;
    } else {
      opt.url += body2Query(data);
    }

    request(opt, function(err, body, json) {
      (cb || noop)(err, json);
    });
  };
}

module.exports = FirebaseOnRest;
