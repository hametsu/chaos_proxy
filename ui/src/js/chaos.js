/************** Global valiables **************/
var SETTINGS = {
  MAX_KEEP_IMAGES_COUNT : 100,
  MAX_RETREIVE_COUNT : 100,
  IMAGE_RETREIVE_INTERVAL : 7000,
  USER_LIST_RETREIVE_INTERVAL : 60*1000*5,
  FLASH_EFFECT_INTERVAL : 13000,
  MESSAGE_SPEED : 40,
  MAX_IMAGE_SIZE : 1300,
  BENJO_SERVER_WEBSOCKET_URL : 'ws://chaos.yuiseki.net:4569/',
  TWITTER_SEARCH_KEYWORD : '#chaos2010',
  PLACE_NAME : 'Users in Hametsu Lounge'
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
  lastRetreiveTime : "1171815102", // An enough old time for first time
  workers : []
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


