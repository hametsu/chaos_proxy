/**
 * Chaos Proxy Viewer
 *
 * See more info : http://github.com/yuiseki/chaos_proxy
 */

/*---------------------------------------------------*/

/************** Global valiables **************/
var SETTINGS = {
  MAX_KEEP_IMAGES_COUNT : 100,
  MAX_RETREIVE_COUNT : 100,
  IMAGE_RETREIVE_INTERVAL : 7000,
  USER_LIST_RETREIVE_INTERVAL : 60*1000*5,
  FLASH_EFFECT_INTERVAL : 13000,
  MESSAGE_SPEED : 40,
  MAX_IMAGE_SIZE : 1300,
  BENJO_SERVER_WEBSOCKET_URL : 'ws://chaos.yuiseki.net:4569/'
}

var MESSAGES = {
  INIT_SCREEN : 'Initializing a chaos proxy viewer...',
  INIT_SCREEN_FINISH : '......Done',
  ERROR : 'Error!!',
  DETECTED_IE : 'Internet explorer cannnot boot this page.',
  DETECTED_FIREFOX : 'Detected Firefox...',
  DETECTED_OPERA : 'Detected Opera....',
  ANIMATION_OFF : 'Animation : OFF',
  BROWSER_NOTICE : 'Full version is enable in Safari 4...'
}


var context = {
  hametsuMode : false,
  enableCSSAnimation : false,
  screenHeight : 0,
  screenWidth : 0,
  loadedImages : [],
  userIcons : {},
  lastRetreiveTime : "1171815102" // An enough old time for first time
}

/**
 * Name space for functions
 */
var Chaos = window.Chaos || {};
Chaos.animation = {};

/**********************************************/

/**
 * Effect functions
 */
Chaos.effect = {
  /**
   *
   */
  pourText : function(targetBox, text, callback) {
    var len = text.length;
    var i=0;
    var target = $('<span>');
    targetBox.append(target).append($('<br />'));
    var time = setInterval(function() {
      target.text(text.slice(0, i));
      if (i++>=len) {
        clearInterval(time);
        if (callback) callback();
      }
    }, SETTINGS.MESSAGE_SPEED);
  },

  /**
   *
   */
  pourMessages : function(target, msgArr, callback) {
    (function pourMessage() {
      Chaos.effect.pourText(target, msgArr.shift(), function() {
        if (msgArr.length > 0) {
          pourMessage();
        } else {
          if (callback) callback();
        }
      });
    })();
  },

  getRandomXY : function(imageWidth, imageHeight) {
    var x = Math.floor(Math.random() * (context.screenWidth - imageWidth));
    var y = Math.floor(Math.random() * (context.screenHeight - imageHeight));
    return {x : x, y : y}
  },

  getImageZIndex : function(width, height) {
    var size = width + height;
    return size > 900 ? 100 :
      size > 800 ? 105 :
      size > 700 ? 110 :
      size > 600 ? 120 :
      size > 500 ? 130 :
      size > 400 ? 140 :
      size > 300 ? 150 :
      size > 200 ? 160 : 170;
  }
}

Chaos.image = {
  addUserIcon : function(puid) {
    if (context.userIcons[puid]) {
      return;
    } else {
      var el = $('<img>').attr('src', 'http://chaos.yuiseki.net/icon/' + puid);
      $('#imagePool').append(el);
      context.userIcons[puid] = el;
    }
  }
  ,

  getUserIcon : function(puid) {
    return context.userIcons[puid].clone();
  }
}


/**
 * Queueing asyncronous functions. And calls them syncronous.
 *
 * Usage:
 * var queue = new Chaos.Queue({ name : 'notification' });
 *
 * queue.push({
 *   // latest argument is callback function
 *   fn : function(a, b, callback) {
 *     doAsync(function(result) {
 *       callback(result);
 *     }
 *   },
 *   callback : function(result) {
 *     print(result)
 *   }
 * }
 *
 * queue.push({
 *   ...
 * });
 *
 *
 */
Chaos.Queue = function(config) {
  Chaos.Queue.prototype.initialize.call(this, config);
}

Chaos.Queue.prototype = {
  initialize : function(config) {
    this.name = config.name;
    this.running = false;
    this.queue = [];
  },

  /**
   * @param (Object, Function) fnConf
   *
   * Object properties
   * @param fn Function (requre)
   * @param scope Object Scope for fn (default : null)
   * @param delay Number Delay to Start fn (default : 0)
   * @param args Array Arguments for fn (default : [])
   * @param callback Function Callback function (default : null)
   *
   */
  push : function(fnConf) {
    if (lng.isFunction(fnConf)) {
      fnConf = { fn : fnConf }
    }

    this.queue.push({
      fn : fnConf.fn,
      scope : fnConf.scope || null,
      delay : fnConf.delay || 0,
      args : fnConf.args || [],
      callback : fnConf.callback
    });
    if (!this.running) {
      this._exec();
    }
  },

  _exec : function() {
    var self = this;

    this.running = true;
    var q = this.queue.shift();
    if (q.callback) {
      q.args.push(createCallback());
    }
    setTimeout(function(){
      q.fn.apply(q.scope, q.args);
      if (!q.callback) {
        self._next();
      }
    }, q.delay);

    function createCallback() {
      return function(){
        self._next();
        var args = Array.prototype.slice.call(arguments);
        q.callback.apply(q.scope, args);
      }
    }
  },

  _next : function() {
    if (this.queue.length > 0) {
      this._exec();
    } else {
      this.running = false;
    }
  }
}


/**
 * For common utilities
 */
var lng = {
  emptyFn : function(){},

  bind : function(fn, thisObj) {
    return function(){
      args = Array.prototype.slice.call(arguments);
      fn.apply(thisObj, args);
    }
  },

  isFunction : function(f) {
    return typeof(f) == 'function' || f instanceof Function;
  }
}

/*---------------------------------------------------*/

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
 *   "pid" : 0,
 *   "socketKey" : "8GzBJq42m9"
 * }
 * </code>
 * pid is sequencial number for this instance. socketKey is a random string to identify this socket.
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
 * var ws = new Chaos.WebSocket({
 *   url:"localhost:8080",
 *   listeners : {
 *     open : function(){console.info('onopen!!')},
 *     close : function(){console.info('onclose!!')}
 *   }
 * });
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
  socketKey : null,

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
    if (config.listeners) {
      var listeners = config.listeners;
      for (action in listeners) {
        if (typeof(listeners[action]) == 'function' || listeners[action] instanceof Function){
          this.on(action, listeners[action]);
        } else {
          this.on(action, listeners[action].fn, listeners[action].scope);
        }
      }
    }
    this.socketKey = this._createKey();
    this._open();
  },

  _createKey : function() {
    var result = '';
    var source = 'abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (var i=0; i<10; i++) {
      result+=source[Math.floor(Math.random()*source.length)];
    }
    return result;
  },

  /**
   * @private
   */
  _open : function() {
    try {
      console.info('start open:' + this.config.url);
      this.ws = new WebSocket(this.config.url);
      this.ws.onopen = lng.bind(this._onopen, this);
      this.ws.onmessage = lng.bind(this._onmessage, this);
      this.ws.onclose = lng.bind(this._onclose, this);
    } catch (e) {
      console.error('Failed to open the websocket connection');
      console.error(e);
    }
  },

  /**
   * @private
   */
  _onopen : function() {
    this.alive = true;
    this._fire('open');
  },

  /**
   * @private
   */
  _onmessage : function(event) {
    try {
      var d = JSON.parse(event.data);
      var eventName = d.eventName.toLowerCase();
      console.info('Data receive !!:' + eventName);
      this._fire(eventName, d, d.socketKey, d.pid);
    } catch(e) {
      console.error(e);
    }
  },

  /**
   * @private
   */
  _fire : function(eventName, data, socketKey, pid) {
    data = data || {};
    var fns = this.events[eventName];
    if (fns) {
      $.each(fns, function(idx, f) {
        f.fn.call(f.scope, data.data, socketKey, pid);
      });
    }
  },

  /**
   * @private
   */
  _onclose : function() {
    this.alive = false;
    this._fire('close');
    if (this.autoRecovery) {
      // retry after 10 seconds
      setTimeout(lng.bind(this._open, this), 10000);
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
      pid : this.pid++,
      socketKey : this.socketKey
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

/*---------------------------------------------------*/

var ws = new Chaos.WebSocket({
  url : SETTINGS.BENJO_SERVER_WEBSOCKET_URL,
  autoRecovery : true,
  listeners : {
    open : function() {
      console.info('onopen!!');
    },
    close : function() {
      console.info('close!!!');
    },
    command : onReceiveMessage,
  }
});

function handleSendMsgTextBtn() {
  if (!ws.alive) {
    alert('Connection is not enable');
    return;
  }
  var message = $('#sendMessageText').val();
  if (message == '') {
    alert('message is empty');
    return;
  }
  ws.send('command', {
    "name" : "showMessage",
    "iconUrl" : $('#iconUrl').val(),
    "message" : message,
    "duration" : $('#duration').val()
  });
}

function handleReloadBrowserBtn() {
  if (!ws.alive) {
    alert('Connection is not enable');
    return;
  }
  ws.send('command', {
    "name" : "reloadBrowser"
  });
}

function onReceiveMessage(data, socketKey, pid) {
  if (ws.socketKey == socketKey) {
    alert('Your command is broadcasted');
  } else {
    alert('Another user send message:' + data.name);
  }
}

$(function() {
  $('#sendMessageBtn').click(handleSendMsgTextBtn);
  $('#reloadBrowserBtn').click(handleReloadBrowserBtn);
});

/*---------------------------------------------------*/