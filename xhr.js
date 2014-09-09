var $xhr = function(global_options) {
  var self = this;

  if (!global_options)
    global_options = {};

  self.xhr = null;

  self.default_timeout = global_options.timeout || 10;
  self.default_headers = {
    'X-Requested-With': 'XMLHttpRequest'
  };

  self.prepare_headers = function(options) {
    if (!options.headers)
      options.headers = {};

    var default_headers = self.default_headers,
        headers = options.headers;

    for (var name in default_headers) {
      if (!headers[name])
        headers[name] = default_headers[name];
    }

    return headers;
  };

  self.req = function(method, url, data, options, callback) {
    if (callback === undefined) {
      callback = options;
      options = {};
    }
    else if (!options) {
      options = {};
    }

    if (global_options.reuse_xhr_object && !self.xhr) {
      self.xhr = new XMLHttpRequest();
    }
    var xhr = self.xhr || new XMLHttpRequest(),
        timeout = options.timeout === undefined ? self.default_timeout : options.timeout;

    xhr.open(method, url, true);

    if (timeout) {
      var timeout_id = window.setTimeout(
        function() {
          if (xhr.readyState === 4) {
            window.clearTimeout(timeout_id);
            return;
          }
          xhr.abort();
          callback(self.err('timeout', 'Operation timed out'), null, xhr);
        },
        timeout * 1000
      );
    }

    xhr.onreadystatechange = function() {
      if (xhr.readyState !== 4) {
        return;
      }
      if (!xhr.status && !xhr.responseText) {
        callback(self.err('client', 'Client error.'), xhr.responseText, xhr);
        return;
      }
      if (xhr.status >= 400) {
        var err = self.err('status', 'Request error: ' + xhr.status + ' ' + xhr.statusText);
        callback(err, xhr.responseText, xhr);
        return;
      }
      if (timeout) {
        window.clearTimeout(timeout_id);
      }
      callback(null, xhr.responseText, xhr);
    };

    var headers = self.prepare_headers(options);
    for (var name in headers)
      xhr.setRequestHeader(name, headers[name]);

    xhr.send(data);
  };

  self.err = function(type, msg) {
    var err = function() {
      this.type = type;
      this.msg = msg;
    };
    err.prototype.toString = function() { return this.msg; };
    return new err();
  };

  self.parse_json = function(response) {
    try {
      return {ok: true, parsed: JSON.parse(response)};
    }
    catch (e) {
      return {error: 'Error parsing JSON response'};
    }
  };

  self.reqJSON = function(method, url, data, options, callback) {
    if (callback === undefined) {
      callback = options;
      options = {};
    }
    else if (!options) {
      options = {};
    }

    var parse_response = function(err, response, xhr) {
      if (err && err.type != 'status') {
        callback(err, response, xhr);
        return;
      }
      var result = self.parse_json(response);
      if (result.error) {
        if (err && err.type == 'status') {
          callback(err, response, xhr);
        }
        else {
          callback(self.err('json', result.error), response, xhr);
        }
        return;
      }
      result = result.parsed;
      if (result.error) {
        callback(self.err('response', result.error), result, xhr);
        return;
      }
      callback(null, result, xhr);
    };
    var headers = self.prepare_headers(options);
    if (!headers.Accept) {
      headers.Accept = 'application/json';
    }
    if (data && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    self.req(method, url, data ? JSON.stringify(data) : data, options, parse_response);
  };

  self.getJSON = function(url, options, callback) {
    self.reqJSON('GET', url, null, options, callback);
  };
  self.postJSON = function(url, data, options, callback) {
    self.reqJSON('POST', url, data, options, callback);
  };
  self.deleteJSON = function(url, data, options, callback) {
    self.reqJSON('DELETE', url, data, options, callback);
  };

  self.get = function(url, options, callback) {
    self.req('GET', url, null, options, callback);
  };
  self.post = function(url, data, options, callback) {
    self.req('POST', url, data, options, callback);
  };
};
// $xhr will be an instance. To create a new instance,
// new $xhr.constructor() can be used.
$xhr = new $xhr();
