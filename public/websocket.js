/**
 * WebSocket wrapper for multi use
 *
 * WebSocket sends next format data (JSON)
 * <code>
 * {
 *   "eventName" : "imageUrl",
 *   "data" : {
 *     "lastRetreiveTime" : "1171815102"
 *   },
 *   "pid" : 0
 * }
 * </code>
 *
 * And receive data format is
 * <code>
 * {
 *   "eventName" : "imageUrl",
 *   "data" : {[
 *      ....
 *   ]},
 *   "pid" : 0
 * }
 * </code>
 *
 *
 * Usage:
 * <code>
 * var ws = new Chaos.WebSocket({url:"localhost:8080"});
 * // wait push event from server
 * ws.on('newUser', function(data) {
 *   console.dir(data);
 * });
 *
 * // data request and reveive
 * ws.on('imageUrl', handleImageUrl); 
 * ws.send('imageUrl', {lastRetrieveTime : 0000000000});
 *
 * function handleImageUrl(data) {
 *  doSomething(data);
 * }
 *
 * // unfollow event
 * ws.un('imageUrl', handleImageUrl);
 *
 * // close
 * ws.close();
 * </code>
 */
Chaos.WebSocket = function(config) {
  Chaos.WebSocket.prototype.initialize.call(this, config);
}

Chaos.WebSocket.prototype = {
  events : null,
  pid : 0,

  /**
   * @constructor
   * @param object config
   * <code>
   * {
   *   url : "ws://chaos.yuiseki.net:4569",
   *   autoRecovery : true
   * }
   * </code>
   */
  initialize : function(config) {
    this.alive = false;
    this.events = {};
    this.autoRecovery = config.autoRecovery || false;
    this.config = config;
    this.open();
  },

  /**
   * @private
   */
  open : function() {
    try {
      console.info('start open:' + this.config.url);
      this.ws = new WebSocket(this.config.url);
      this.ws.onopen = lng.bind(this.onopen, this);
      this.ws.onmessage = lng.bind(this.onmessage, this);
      this.ws.onclose = lng.bind(this.onclose, this);
    } catch (e) {
      console.error('Failed to open the websocket connection');
      console.error(e);
    }
  },

  /**
   * @private
   */
  onopen : function() {
    this.alive = true;
    console.info('open websocket');
  },

  /**
   * @private
   */
  onmessage : function(event) {
    try {
      var d = JSON.parse(event.data);
      var eventName = d.eventName.toLowerCase();
      var fns = this.events[eventName];
      if (fns) {
        $.each(fns, function(idx, f) {
          f.fn.call(f.scope, d.data, d.pid); 
        });
      }
    } catch(e) {
      console.error(e);
    }
  },

  /**
   * @private
   */
  onclose : function() {
    this.alive = false;
    if (this.autoRecovery) {
      // retry after 10 seconds
      setTimeout(lng.bind(this.open, this), 10000);
    }
  },
  
  /**
   * Send message to server
   * @public
   */
  send : function(eventName, data) {
    data = data || {};
    this.ws.send(JSON.stringify({
      eventName : eventName,
      data : data,
      pid : this.pid++
    }));
  },

  /**
   * Close this socket
   * @public
   */
  close : function() {
    this.autoRecovery = false;
    this.ws.close();
  },

  /**
   * Add event listener
   * @public
   */
  on : function(eventName, fn, scope) {
    eventName = eventName.toLowerCase();
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }

    var fns = this.events[eventName];
    fns.push({
      fn : fn, scope : scope
    });
  },

  /**
   * Remove event listener
   * @public
   */
  un : function(eventName, fn, scope) {
    eventName = eventName.toLowerCase();
    var fns = this.events[eventName];
    if (fns) {
      for (var i=0; i<fns.length; i++) {
        if (fns[i].fn == fn && fns[i].scope == scope) {
          fns.splice(i, 1);
          return true;
        }
      }
    }
    return false;
  }
}
