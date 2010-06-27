/**
 * Chaos Proxy Viewer
 *
 * See more info : http://github.com/yuiseki/chaos_proxy
 */

/*---------------------------------------------------*/


/**
 * For common utilities
 */
var lng = {

  emptyFn : function(){},

  /**
   * Check if object is empty or not.
   *
   * @param {Object} v To check object
   * @param {Boolean} allowEmptyObject Set to true, empty string and empty array returns false
   * @return {Boolean}
   */
  isEmpty : function(v, allowEmptyObject) {
    if (v === null
    || v === undefined
    || (!allowEmptyObject && v === "")
    || (!allowEmptyObject && lng.isArray(v) && v.length === 0)) {
      return true;
    }
    return false;
  },

  /**
   * Check if object is Array or not.
   * @param {Object} v Check object
   */
  isArray : function(v) {
    return Object.prototype.toString.apply(v) === "[object Array]";
  },

  /**
   * Check is object is function
   */
  isFunction : function(f) {
    return typeof(f) == 'function' || f instanceof Function;
  },

  /**
   * Bind this object to the function.
   *
   * @param {Function} fn Call function
   * @param {Object} thisObj This object
   */
  bind : function(fn, thisObj, args) {
    if (args == undefined) {
      return function(){fn.apply(thisObj, arguments)}
    } else {
      return function(){fn.apply(thisObj, args)}
    }
  }

}

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
  BENJO_SERVER_WEBSOCKET_URL : 'ws://chaos.yuiseki.net:4569/',
  TWITTER_SEARCH_KEYWORD : '#hametsulo',
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

/*---------------------------------------------------*/

/**
 *
 */
Chaos.startTwitterSearch = function(config) {
  var queue = config.queue;
  var keyword = config.keyword;
  var animation = new Chaos.animation.ShowTweet();

  Chaos.TwitterCrawler.start(keyword, {}, function(data) {
    queue.push({
      fn : function(callback) {
        animation.setup();
        animation.applyAll(data, callback);
      },
      callback : function() {
        animation.end();
      },
      delay : 1000
    });
  });

}

Chaos.animation.ShowTweet = function() {
  Chaos.animation.ShowTweet.prototype.initialize.call(this);
}

Chaos.animation.ShowTweet.prototype = {

  initialize : function() {
    this.elm = $('#mainmessage');
  },

  setup : function() {
    this.viewArea = $('<div class="tweets">');
    this.viewArea.appendTo(this.elm);
    this.viewAreaWidth = this.viewArea.width();
  },

  applyAll : function(dataArr, callback) {

    var q = new Chaos.Queue({name : 'tweets'});

    dataArr.forEach(function(t) {
      q.push({
        fn : this.show,
        args : [t],
        scope : this,
        delay : 1500,
        callback : lng.emptyFn
      });
    }, this);

    q.push({
      fn : callback,
      delay : 4500,
      callback : lng.emptyFn
    });
  },

  show : function(t, callback) {
    var el = $('<div class="tweet">');
    var icon = $('<img>').attr('src', t.profile_image_url);
    var body = $('<div class="body">').css({
      'width' : this.viewAreaWidth - 200
    });
    var name = $('<div class="username">').text(t.from_user);
    var text = $('<div class="text">').text(t.text);
    var br = $('<br style="clear:both">');

    el.append(icon).append(body.append(name).append(text));
    el.append(br);
    el.hide();
    el.appendTo(this.viewArea);
    el.fadeIn('normal', function() {
      setTimeout(function() {
        el.animate({
          "margin-top" : -1 * el.height() - 40 +'px'
        }, 1000, function() {
          el.remove();
        });
      }, 3500);
    });
    callback();
  },

  end : function() {
    var vArea = this.viewArea;
    vArea.fadeOut('slow', function() {
      vArea.remove();
    });
  }
}

Chaos.TwitterCrawler = (function() {

  var SEARCH_API = "http://search.twitter.com/search.json?";

  /**
   * default values
   */
  var timer = null;
  var interval = 30*1000;
  var sinceId = 0;
  var rpp = 10;

  var createQuery = function(word) {
    var w = encodeURIComponent(word);
    return SEARCH_API+"q="+w+"&rpp="+rpp+"&since_id="+sinceId+"&callback=?";
  }

  return {
    getSearchResults : function(word, callback) {
      $.getJSON(createQuery(word), _callback);

      function _callback(data){
        if (lng.isEmpty(data.results)){
          // NOP
        } else {
          sinceId = data.max_id;
          data.results.reverse();
          callback(data.results);
        }
      }
    },

    start : function(word, config, callback) {
      interval = config.interval || interval;
      rpp = config.rpp || rpp;

      var fn =  lng.bind(this.getSearchResults, this, [word, callback]);
      timer = setInterval(fn, interval);
    },

    stop : function() {
      clearInterval(timer);
    }
  }
})();

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
      //console.info('Data receive !!:' + eventName);
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

/**
 * Create an image loader
 */
Chaos.startImageLoader = function() {

  var idolCount = 0;
  var animIndex = 0;

  var imagePool = $('#imagePool');
  var currentAnim = getNextAnimation(imagePool);

  // create worker process
  var imageLoader = new Worker('js/worker_image_loader.js');
  imageLoader.onmessage = function(event) {
    var d = JSON.parse(event.data);
    if (d.eventName == 'setup') {
      imageLoader.postMessage(JSON.stringify({eventName:'start'}));
    } else
    if (d.eventName == 'load') {
      renderImages(d.data);
    } else {
      console.error('invalid event received:' + d.eventName);
    }
  };
  imageLoader.postMessage(JSON.stringify({
    eventName:'setup',
    maxRetreiveCount : SETTINGS.MAX_RETREIVE_COUNT,
    interval : SETTINGS.IMAGE_RETREIVE_INTERVAL
  }));

  context.workers.push(imageLoader);

  function storeImage(jqObj, width, height, zIndex, puid) {
    context.loadedImages.push({
      obj : jqObj,
      width : width,
      height : height,
      zIndex : zIndex,
      puid : puid
    });
    if (context.loadedImages.length > SETTINGS.MAX_KEEP_IMAGES_COUNT) {
      removeImage(context.loadedImages.shift());
    }
  }

  function removeImage(data) {
    var jqObj = data.obj;
    if (context.enableCSSAnimation) {
      jqObj.addClass('delete');
      setTimeout(function() {
        jqObj.remove();
      }, 1000);
    } else {
      jqObj.fadeOut('normal', function() {
        jqObj.remove();
      });
    }
  }


  function renderImages(data) {
    if (data.length == 0) {
      idolCount+=2;
      if (idolCount > 5) {
        idolCount = 0;
        changeAnimation();
      }
      return;
    }
    idolCount = 0;
    data.reverse();
    var len = data.length;
    var i = 0;

    var timer = setInterval(function() {

      var url = data[i].uri;
      var puid = data[i].puid;

      var jqObj = $('<img>').attr('src', url);
      Chaos.image.addUserIcon(puid);
      // Put to the tmp area (invisible) and waiting load the image
      imagePool.prepend(jqObj);
      jqObj.bind('load', function(a) {
        var width = a.target.offsetWidth;
        var height = a.target.offsetHeight;
        var imageSize = width + height;

        if (imageSize > SETTINGS.MAX_IMAGE_SIZE) {
          // Remove a big image
          jqObj.remove();
          return;
        }

        jqObj.css({
          width : width,
          height : height
        });
        var posXY = Chaos.effect.getRandomXY(width, height);
        var zIndex = Chaos.effect.getImageZIndex(width, height);

        storeImage(jqObj, width, height, zIndex, puid);
        currentAnim.applyToElm(jqObj, posXY, zIndex, puid, width);

        // create breaked image
//        if (context.hametsuMode && 250 < imageSize && imageSize < 800 && i%3 == 0) {
//          console.info('create breaked image');
//          var breakImageUrl = 'http://chaos.yuiseki.net/imagine_breaker/' + url;
//          var breakImg = $('<img>').attr('src', breakImageUrl);
//          breakImg.css({
//            width : width,
//            height : height
//          });
//          setTimeout(function() {
//            console.info('append breaked image');
//            imagePool.prepend(breakImg);
//            var posXY2 = Chaos.effect.getRandomXY(width, height);
//            breakImg.bind('load', function(b) {
//              console.info('load breaked image');
//              currentAnim.applyToElm(breakImg, posXY2, zIndex, puid, width);
//              storeImage(breakImg, width, height, zIndex, puid);
//            });
//          }, 3000);
//        }

      });
      if (++i>=len) {
        clearInterval(timer);
        if (++currentAnim.roopCount >= currentAnim.roopLimit) {
          changeAnimation();
        } else {
          imageLoader.postMessage(JSON.stringify({eventName:'start'}));
        }
      }
    }, 300);
  }

  function getNextAnimation() {
    var anims = [
      Chaos.animation.Wave,
      Chaos.animation.Tile
    ];
    if (context.enableCSSAnimation) {
      anims.unshift(Chaos.animation.DropDown);
    }
    if ($.browser.safari && context.hametsuMode) {
      anims.unshift(Chaos.animation.Mogra);
    }
    var next = anims[animIndex++ % anims.length];
    var result = new next(imagePool);
    result.setup();
    return result;
  }

  function changeAnimation() {
    imageLoader.postMessage(JSON.stringify({eventName:'stop'}));
    currentAnim.end(function() {
      var next = getNextAnimation();
      next.applyToAll(function() {
        imageLoader.postMessage(JSON.stringify({eventName:'start'}));
        currentAnim = next;
      });
    });
  }
}

Chaos.animation.Mogra = function(pool) {
  Chaos.animation.Mogra.prototype.initialize.apply(this, [pool]);
}

Chaos.animation.Mogra.prototype = {
  initialize : function(pool) {
    this.dataArr = context.loadedImages;
    this.pool = pool;
    this.contentArea = $('#contentArea');
  },

  roopCount : 0,
  roopLimit : 1,

  railNum : 32,
  // size of center circle
  centerSize : null,
  leftP : null,
  smallRails : null,
  bigRails : null,

  setup : function() {
    this.contentArea.addClass('mograBase');
    this.centerSize = Math.floor(context.screenHeight / 10);
    this.leftP = Math.floor(context.screenWidth/2) - this.centerSize;
    this.smallRails = [];
    this.bigRails = [];
    for(var i=0; i<this.railNum; i++) {
      this.createRail(i);
    }
  },

  createRail : function(num) {
    var r = Math.floor(360/this.railNum*num);
    var offsetL = Math.floor(Math.sin(Math.PI*r/180) * context.screenHeight/3);
    var offsetT = Math.floor(Math.cos(Math.PI*r/180) * context.screenHeight/3);
    var rail = $('<div>');
    rail.css({
      //'border' : '1px solid #000000',
      'position' : 'absolute',
      'left' : this.leftP - offsetL,
      'width' : this.centerSize,
      'height' : Math.floor(context.screenHeight/2),
      'top' : Math.floor(context.screenHeight/4) + offsetT,
      'z-Index' : 100,
    });
    if (num%2==0) {
      rail.css({
        '-webkit-transform' : 'rotateZ(' + r + 'deg) rotateX(20deg) translateZ(-50px)',
        'z-index' : 500
      });
      rail.addClass('fast');
      this.smallRails.push(rail);
    } else {
      rail.css({
        '-webkit-transform' : 'rotateZ(' + r + 'deg) rotateX(5deg) translateZ(-100px)',
        'z-index' : 400
      });
      rail.addClass('slow');
      this.bigRails.push(rail);
    }
    rail.appendTo(this.contentArea);
  },

  end : function(callback) {
    this.contentArea.removeClass('mograBase');

    var self = this;
    $('#contentArea').fadeOut('slow', onsuccess);

    function onsuccess() {
      $.each(self.dataArr, function(idx, d) {
        self.pool.append(d.obj);
      });
      $('#contentArea > div').remove();
      $('#contentArea').show();
      callback();
    }
  },

  applyCount : 0,

  getIcon : function(puid, zIndex) {
    var icon = Chaos.image.getUserIcon(puid);
    icon.css({
      'zIndex' : zIndex + 1,
      'border' : '1px solid #777'
    });
    return icon;
  },

  getRandomRail : function(big) {
    var rails = big ? this.bigRails : this.smallRails;
    var idx = Math.floor(Math.random() * rails.length);
    return rails[idx];
  },

  applyToElm : function(jqObj, xy, zIndex, puid) {
    jqObj.css({
      'top' : null,
      'left' : this.centerSize/2 - jqObj.width()/2,
      'zIndex' : zIndex
    });
    if (zIndex > 140) {
      var rail = this.getRandomRail();
      rail.append(jqObj);
    } else {
      var rail = this.getRandomRail(true);
      rail.append(jqObj);
    }

  },

  applyToAll : function(callback) {
    var i = 0;
    var len = this.dataArr.length;
    if (len == 0) {
      callback();
      return;
    }
    (function() {
      var d = this.dataArr[i++];
      var xy = Chaos.effect.getRandomXY(d.width, d.height);
      this.applyToElm(d.obj, xy, d.zIndex, d.puid);
      if (len > i) {
        setTimeout(lng.bind(arguments.callee, this), 400);
      } else {
        callback();
      }
    }).apply(this);
  }
}

Chaos.animation.DropDown = function(pool) {
  Chaos.animation.DropDown.prototype.initialize.apply(this, [pool]);
}

Chaos.animation.DropDown.prototype = {

  initialize : function(pool) {
    this.dataArr = context.loadedImages;
    this.pool = pool;
  },

  roopCount : 0,
  roopLimit : 14,

  setup : function() {
    var area0 = $('<div>').addClass('dropDownFast2');
    var area1 = $('<div>').addClass('dropDownFast');
    var area2 = $('<div>').addClass('dropDownMiddle');
    var area3 = $('<div>').addClass('dropDownSlow');
    $('#contentArea').append(area0);
    $('#contentArea').append(area1);
    $('#contentArea').append(area2);
    $('#contentArea').append(area3);
    this.imageLayerLarge  = area3;
    this.imageLayerMiddle = area2;
    this.imageLayerSmall  = area1;
    this.imageLayerVerySmall  = area0;
  },

  end : function(callback) {
    var self = this;
    $('#contentArea').fadeOut('slow', onsuccess);

    function onsuccess() {
      $.each(self.dataArr, function(idx, d) {
        self.pool.append(d.obj);
      });
      $('#contentArea > div').remove();
      $('#contentArea').show();
      callback();
    }
  },

  applyCount : 0,

  getIcon : function(puid, zIndex) {
    var icon = Chaos.image.getUserIcon(puid);
    icon.css({
      'zIndex' : zIndex + 1,
      'border' : '1px solid #777'
    });
    return icon;
  },

  applyToElm : function(jqObj, xy, zIndex, puid) {
    jqObj.css({
      'top' : null,
      'left' : xy.x,
      'zIndex' : zIndex
    });
    if (zIndex > 150) {
      if (this.applyCount++%3 == 0) {
        this.imageLayerVerySmall.append(jqObj);
      } else {
        this.imageLayerSmall.append(jqObj)
      }
    } else
    if (zIndex > 120) {
      var icon = this.getIcon(puid, zIndex);
      icon.css({'width' : 40, 'left' : xy.x+5, 'margin-top' : 5})
      this.imageLayerMiddle.append(jqObj);
      this.imageLayerMiddle.append(icon);
    } else {
      var icon = this.getIcon(puid, zIndex);
      icon.css({'width' : 60, 'left' : xy.x+10, 'margin-top':10})
      this.imageLayerLarge.append(jqObj);
      this.imageLayerLarge.append(icon);
    }

  },

  applyToAll : function(callback) {
    var i = 0;
    var len = this.dataArr.length;
    if (len == 0) {
      callback();
      return;
    }
    (function() {
      var d = this.dataArr[i++];
      var xy = Chaos.effect.getRandomXY(d.width, d.height);
      this.applyToElm(d.obj, xy, d.zIndex, d.puid);
      if (len > i) {
        setTimeout(lng.bind(arguments.callee, this), 300);
      } else {
        callback();
      }
    }).apply(this);
  }
}


Chaos.animation.Wave = function(pool) {
  Chaos.animation.Wave.prototype.initialize.apply(this, [pool]);
}

Chaos.animation.Wave.prototype = {

  initialize : function(pool) {
    this.dataArr = context.loadedImages;
    this.pool = pool;
  },

  roopCount : 0,
  roopLimit : 4,

  setup : function() {
    var area1 = $('<div>').addClass('z1');
    var area2 = $('<div>').addClass('z2');
    var area3 = $('<div>').addClass('z3');
    $('#contentArea').append(area1);
    $('#contentArea').append(area2);
    $('#contentArea').append(area3);
    this.imageLayerLarge  = area1;
    this.imageLayerMiddle = area2;
    this.imageLayerSmall  = area3;
    area1.fadeTo(0, 0.8);
  },

  end : function(callback) {
    var self = this;
    self.imageLayerLarge.fadeOut(600, function() {
      self.imageLayerMiddle.fadeOut(700, function() {
        self.imageLayerSmall.fadeOut(800, function() {
          $.each(self.dataArr, function(idx, d) {
            self.pool.append(d.obj);
          });
          self.imageLayerLarge.remove();
          self.imageLayerMiddle.remove();
          self.imageLayerSmall.remove();
          callback();
        });
      });
    });
  },

  getIcon : function(puid, zIndex) {
    var icon = Chaos.image.getUserIcon(puid);
    icon.css({
      'zIndex' : zIndex + 1,
      'border' : '1px solid #777'
    });
    return icon;
  },

  applyToElm : function(jqObj, xy, zIndex, puid) {
    jqObj.css({
      'top' : xy.y,
      'left' : xy.x,
      'zIndex' : zIndex
    });
    var icon = this.getIcon(puid, zIndex);
    if (zIndex > 140) {
      icon.css({'width' : 20, 'left' : xy.x - 10, 'top' : xy.y - 10});
      this.imageLayerSmall.append(jqObj);
      this.imageLayerSmall.append(icon);
    } else
    if (zIndex > 120) {
      icon.css({'width' : 40, 'left' : xy.x + 5, 'top' : xy.y + 5});
      this.imageLayerMiddle.append(jqObj);
      this.imageLayerMiddle.append(icon);
    } else {
      icon.css({'width' : 60, 'left' : xy.x + 10, 'top' : xy.y + 10});
      this.imageLayerLarge.append(jqObj);
      this.imageLayerLarge.append(icon);
    }
    if (context.enableCSSAnimation) {
      jqObj.addClass('show');
    } else {
      jqObj.hide().fadeIn('normal');
    }
  },

  applyToAll : function(callback) {
    var i = 0;
    var len = this.dataArr.length;
    if (len == 0) {
      callback();
      return;
    }
    (function() {
      var d = this.dataArr[i++];
      var xy = Chaos.effect.getRandomXY(d.width, d.height);
      this.applyToElm(d.obj, xy, d.zIndex, d.puid);
      if (len > i) {
        setTimeout(lng.bind(arguments.callee, this), 200);
      } else {
        callback();
      }
    }).apply(this);
  }
}


Chaos.animation.Tile = function(pool) {
  Chaos.animation.Tile.prototype.initialize.apply(this, [pool]);
}

Chaos.animation.Tile.prototype = {

  initialize : function(pool) {
    this.dataArr = context.loadedImages;
    this.pool = pool;
  },

  roopCount : 0,
  roopLimit : 2,

  setup : function() {
    var area = $('<div>').addClass('tile');
    $('#contentArea').append(area);
    this.imageLayer  = area;
  },

  end : function(callback) {
    var self = this;
    if (context.enableCSSAnimation) {
      this.imageLayer.addClass('endTile');
      setTimeout(onsuccess, 3000);
    } else {
      this.imageLayer.fadeOut('normal', onsuccess);
    }

    function onsuccess() {
      $.each(self.dataArr, function(idx, d) {
        self.pool.append(d.obj);
      });
      self.imageLayer.remove();
      callback();
    }
  },

  applyToElm : function(jqObj, xy, zindex, puid) {
    this.imageLayer.prepend(jqObj);
  },

  applyToAll : function(callback) {
    var i = 0;
    var len = this.dataArr.length;
    if (len == 0) {
      callback();
      return;
    }
    (function() {
      var d = this.dataArr[i++];
      this.applyToElm(d.obj, null, null, d.puid);
      if (len > i) {
        setTimeout(lng.bind(arguments.callee, this), 300);
      } else {
        callback();
      }
    }).apply(this);
  }
}

/*---------------------------------------------------*/

/**
 *
 */
Chaos.startUserList = function(config) {
  var animation = new Chaos.animation.UserList();
  var queue = config.queue;

  var loader = new Worker('js/worker_user_loader.js');
  loader.onmessage = function(event) {
    var d = JSON.parse(event.data);
    if (d.eventName == 'setup') {
      loader.postMessage(JSON.stringify({eventName : 'start'}));
    } else
    if (d.eventName == 'load') {
      renderUserList(d.data, function() {
        loader.postMessage(JSON.stringify({
          eventName : 'start',
          defer : true
        }));
      });
    } else
    if (d.eventName == 'log') {
      console.info(d.message);
    }
  }
  loader.onerror = function(e) {
    console.info('onerror!!');
    console.dir(e);
  }
  loader.postMessage(JSON.stringify({
    eventName : 'setup',
    interval : SETTINGS.USER_LIST_RETREIVE_INTERVAL
  }));

  // save reference to worker object
  context.workers.push(loader);

  function renderUserList(dataArr, callback) {
    if (dataArr.length == 0) {
      return;
    }
    dataArr = dataArr.slice(0, 16);

    queue.push({
      fn : function(callback) {
        animation.setup();
        animation.applyToAll(dataArr, callback);
      },
      callback : function() {
        animation.end();
        callback();
        console.info('end user list!!:' +new Date());
      }
    });
  }
}

Chaos.animation.UserList = function() {
  Chaos.animation.UserList.prototype.initialize.apply(this);
}

Chaos.animation.UserList.prototype = {

  initialize : function() {
    this.pool = $('#userIconPool');
    this.elm = $('#mainmessage');
  },

  setup : function() {
    this.viewArea = $('<div class="userList">');
    this.viewArea.hide();
    this.viewArea.appendTo(this.elm);
    this.viewTitle = $('<div class="userListTitle">');
    this.viewTitle.append($('<span>').text(SETTINGS.PLACE_NAME));
    this.viewTitle.hide();
    this.viewTitle.appendTo(this.elm);
    this.viewTitle.show('1000');
  },

  end : function() {
    var self = this;
    this.viewTitle.fadeOut('normal');
    this.viewArea.fadeOut('slow', function() {
      self.viewTitle.remove();
      self.viewArea.remove();
    });
  },

  applyToAll : function(arr, callback) {
    var self = this;
    this.createTable(arr, function(){
      var i = 0;
      var len = arr.length;
      var tableWidth = self.viewArea.width();
      var puid_cells = self.table.find('td.puid');
      (function() {
        var d = arr[i];
        Chaos.effect.pourText($(puid_cells[i]), d.twitter_name);
        i++;
        if ( len > i) {
          setTimeout(arguments.callee, 400);
        } else {
          setTimeout(callback, 2000);
        }
      })();
    });
  },

  createTable : function(arr, callback) {
    var tableWidth = Math.floor(context.screenWidth * 0.8) - 60;
    var puidWidth = Math.floor((tableWidth - 220)/2);
    var table = $('<table>').width(tableWidth);
    table.hide();
    if (arr.length % 2 != 0) arr.push({user_icon:"", twitter_name:" "});
    var i=0;
    while (i < arr.length) {
      table.append($('<tr>')
        .append($('<td class="user_icon">').append($('<div>').append($('<img>').attr('src', arr[i++].user_icon))))
        .append($('<td class="puid">').width(puidWidth))
        .append($('<td class="user_icon">').append($('<div>').append($('<img>').attr('src', arr[i++].user_icon))))
        .append($('<td class="puid">').width(puidWidth))
      )
    }
    this.viewArea.append(table);
    this.table = table;
    this.viewArea.show(1000, function() {
      table.show();
      table.addClass('animation');
      setTimeout(callback, 500);
    });
  }
}

/*---------------------------------------------------*/

Chaos.startProxyLog = function(config) {
  var connected = false;
  var logCount = 0;

  var targetEl = $('#logScreen');

  config.socket.on('proxylog', handleReceive);

  function handleReceive(data) {
    data = data.split(' ');
    if (data.length <= 3) return;
    targetEl.append("<p class='log'>" +
    data[0] + ' ' + data[1] + ' <span class="twitterName">' + data[2] + '</span> ' + data[3] + ' ' + data[4] + "</p>");
    logCount++;
    if (logCount > 50) {
      $('#logScreen :first').remove();
    }
    if (logCount%5 == 0) {
      targetEl.append("<p class='space'>&nbsp;</p>");
    }
  }
}

/*---------------------------------------------------*/

Chaos.startCommandReceiver = function(config) {

  var queue = config.queue;

  config.socket.on('command', handleReceiveCommand);

  function handleReceiveCommand(data) {
    var handler = Chaos.commandReceivers[data.name]
    if (handler) {
      handler.setQueue(queue, data);
    } else {
      console.error('no method called:' + data.name);
    }
  }
}

Chaos.commandReceivers = {};
Chaos.commandReceivers['showMessage'] = (function() {

  var elm = $('#mainmessage');

  var show = function(data, callback) {
    var vArea = $('<div class="notificationMessage">');
    vArea.hide();
    vArea.appendTo(elm);
    vArea.html(data.message);
    if (data.iconUrl.length > 0) {
      vArea.prepend($('<img>').attr('src', data.iconUrl));
    }
    vArea.show(1000);
    setTimeout(function() {
      vArea.fadeOut(1000, function() {
        vArea.remove();
        callback();
      });
    }, data.duration);
  }

  return {
    setQueue : function(queue, data) {
      queue.push({
        fn : show,
        args : [data],
        callback : lng.emptyFn
      });
    }
  }
})();

Chaos.commandReceivers['reloadBrowser'] = (function() {
  return {
    setQueue : function(queue, data) {
      queue.push(function() {
        var url = window.location.href;
        window.location.href = url;
      });
    }
  }
})();

/*---------------------------------------------------*/

/**
 * Bootstrap of this Application
 */
Chaos.bootstrap = function() {

  var messageBox = $('#bootMessageArea');

  initSettings();
  initMessageArea(initScreen);

  function initSettings() {
    var maxsize = location.href.match(/maxsize=([0-9]+)/);
    if (maxsize) {
      SETTINGS.MAX_IMAGE_SIZE=maxsize[1];
    }
    var hametsu = location.href.match(/hametsu=(true|false)/i);
    if (hametsu) {
      context.hametsuMode = !!hametsu;
    }
  }

  function initScreen() {
    context.enableCSSAnimation = $.browser.safari;
    context.screenHeight = $(window).height();
    context.screenWidth = $(window).width();
    $('#initialMask').css({
      'height' : context.screenHeight,
      'width' :  context.screenWidth
    });
    $('#background').css({
      'height' : context.screenHeight + 50,
      'width' :  context.screenWidth + 50
    });
    $('#contentArea').css({
      'height' : context.screenHeight,
      'width' :  context.screenWidth
    });
    $('#mainmessage').css({
      'height' : context.screenHeight,
      'width' :  context.screenWidth
    });
    $('#aboutUsArea').css({
      'top' : '180px',
      'right' : '-186px'
    });
    $('#aboutChaosProxyArea').css({
      'top' : '225px',
      'right' : '-186px'
    });
    $('div.slideMenu').fadeTo(0, 0.8).show().hover(function() {
      $(this).animate({
        'right' : '-1px',
        'opacity' : 1
      }, 'normal');
    }, function() {
      $(this).animate({
        'right' : '-186px',
        'opacity' : 0.8
      }, 'normal');
    });

    // Wait for background image load
    setTimeout(function() {
      $('#initialMask').fadeTo('slow', 0.01, function() {
        if ($.browser.msie) {
          onFailure();
        } else {
          onSuccess();
        }
      });
    }, 1000);
  }

  function onSuccess() {
    msgs = [];
    if ($.browser.mozilla) {
      msgs.push(MESSAGES.DETECTED_FIREFOX);
      msgs.push(MESSAGES.ANIMATION_OFF);
      msgs.push(MESSAGES.BROWSER_NOTICE);
    }
    if ($.browser.opera) {
      msgs.push(MESSAGES.DETECTED_OPERA);
      msgs.push(MESSAGES.ANIMATION_OFF);
      msgs.push(MESSAGES.BROWSER_NOTICE);
    }
    msgs.push(MESSAGES.INIT_SCREEN_FINISH);
    Chaos.effect.pourMessages(messageBox, msgs, start);
  }

  function onFailure() {
    Chaos.effect.pourMessages(messageBox, [MESSAGES.ERROR, MESSAGES.DETECTED_IE]);
  }

  function start() {
    var ws = new Chaos.WebSocket({
      url : SETTINGS.BENJO_SERVER_WEBSOCKET_URL,
      autoRecovery : true
    });
    var q = new Chaos.Queue({name : 'notification'});
    clearMessageArea();
    flashBackimage();
    animateBackground();
    Chaos.startUserList({
      queue : q
    });
    Chaos.startProxyLog({
      socket : ws
    });
    Chaos.startTwitterSearch({
      queue : q,
      keyword : SETTINGS.TWITTER_SEARCH_KEYWORD
    });
    Chaos.startCommandReceiver({
      socket : ws,
      queue : q
    });
    setTimeout(Chaos.startImageLoader, 3000);
  }

  function animateBackground() {
    if (context.enableCSSAnimation) {
      $('#background').addClass('moveBackGround');
    }
  }

  function flashBackimage() {
    var mask = $('#initialMask');
    if (context.enableCSSAnimation) {
      mask.addClass('flashback');
    } else {
      setInterval(function() {
        mask.fadeTo('normal', 0.4, function() {
          mask.fadeTo('slow', 0.01);
        });
      }, SETTINGS.FLASH_EFFECT_INTERVAL);
    }
  }

  function initMessageArea(callback) {
    messageBox.fadeTo('normal', 0.6, function() {
      Chaos.effect.pourText(messageBox, MESSAGES.INIT_SCREEN, callback);
    }).show();
  }

  function clearMessageArea() {
    messageBox.fadeOut(1000);
  }
}

$(function() {
  Chaos.bootstrap();
});

/*---------------------------------------------------*/