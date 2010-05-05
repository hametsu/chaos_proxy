/**
 * A JSON loader for same/cross domain
 *
 * @class Chaos.Loader
 * @params {Function} filterFn Function for data filter
 */
Chaos.Loader = function(filterFn) {
  Chaos.Loader.prototype.initialize.call(this, filterFn);
}

Chaos.Loader.prototype = {
  /**
   * @params {Function} filterFn
   */
  initialize : function(filterFn) {
    if (location.hostname == 'chaos.yuiseki.net') {
      this._load = this._loadFromSameDomain; 
    } else {
      this._load = this._loadFromAnotherDomain;
    }
    this.filterFn = filterFn;
  },

  /**
   * Load data and returns filtered result
   * @params {String} uri 
   * @params {Function} callback
   */
  load : function(uri, callback) {
    this._load(uri, function(data) {
      if (this.filterFn) {
        data = this.filterFn(data);
      }
      if (data.length > 0) {
        callback(data);
      }
    });
  },

  _load : null,

  /**
   * Gets server data from specified uri.
   * This method is effective under 'chaos.yuiseki.net' only.
   * @params {String} uri 
   * @params {Function} callback
   */
  _loadFromSameDomain : function(uri, callback) {
    var self = this;
    $.getJSON(uri, {}, function(response, status) {
      callback.call(self, response);
    });
  },

  /**
   * For test.
   * This method is effective under another domain (ex.localhsot)
   * @params {String} uri 
   * @params {Function} callback
   */
  _loadFromAnotherDomain : function(uri, callback) {
    var baseUrl = 'http://chaos.yuiseki.net';
    var url = baseUrl + uri;
    var self = this;
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function(){
      if ( xhr.readyState == 4 ) {
        if ( xhr.status == 200 ) {
          var data = JSON.parse(xhr.responseText);
          callback.call(self, data);
        } else {
          console.error('Error #getImageFromAnotherDomain');
          console.error(xhr.responseText);
        }
      }
    };
    xhr.send(null);
  }
}

