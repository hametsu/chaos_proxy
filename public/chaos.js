/************** Global valiables **************/
var SETTINGS = {
  MAX_KEEP_IMAGES_COUNT : 200,
  MAX_RETREIVE_COUNT : 80,
  IMAGE_RETREIVE_INTERVAL : 5000,
  FLASH_EFFECT_INTERVAL : 13000,
  MESSAGE_SPEED : 40
}

var MESSAGES = {
  INIT_SCREEN : 'Initializing a chaos proxy viewer...',
  INIT_SCREEN_FINISH : '......Done',
  ERROR : 'Error!!',
  DETECTED_IE : 'Internet explorer cannnot boot this page.'
}


var REGEXP_FILTER_IMAGE_URL = /(chaos\.yuiseki\.net)|(www\.google-analytics\.com\/__utm\.gif)/;

var imageTarget = $('#contentArea');

var context = {
  height : 0,
  width : 0,
  loadedImagesCount : 0,
  lastRetreiveTime : "1171815102" // An enough old time for first time
} 

/**
 * Name space for functions
 */
var Chaos = {};

/**********************************************/

$(function() {
  Chaos.bootstrap();
});

/**
 * Bootstrap of this Application
 */
Chaos.bootstrap = function() {

  initMessageArea(initScreen);

  function initScreen() {
    context.screenHeight = $(window).height();
    context.screenWidth = $(window).width();
    $('#initialMask').css({
      'height' : context.screenHeight,
      'width' :  context.screenWidth
    });
    $('#dummy').css({
      'height' : context.screenHeight
    });
    $('#background').css({
      'height' : context.screenHeight + 50,
      'width' :  context.screenWidth + 50,
      'top' : -25,
      'left' : -25,
      'background' : 'url(./back.jpg) 50% 50% #FFF repeat'
    });
    $('#contentArea').css({
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
    Chaos.effect.pourText($('#message2'), MESSAGES.INIT_SCREEN_FINISH, function() {
      clearMessageArea();
      flashBackimage();
      animateBackground();
      Chaos.setupImageLoader();
    });
  }

  function onFailure() {
    Chaos.effect.pourText($('#message2'), MESSAGES.ERROR, function() {
      Chaos.effect.pourText($('#message3'), MESSAGES.DETECTED_IE, lng.emptyFn);
    });
  }

  function animateBackground() {
    // todo
  }

  function flashBackimage() {
    var mask = $('#initialMask');
    setInterval(function() {
      mask.fadeTo('normal', 0.4, function() {
        mask.fadeTo('slow', 0.01);
      });
    }, SETTINGS.FLASH_EFFECT_INTERVAL);
  }

  function initMessageArea(callback) {
    $('#messageArea').fadeTo('normal', 0.6, function() {
      Chaos.effect.pourText($('#message1'), MESSAGES.INIT_SCREEN, callback);
    }).show();
  }

  function clearMessageArea() {
    $('#messageArea').fadeOut(1000);
  }
}

/**
 * Effect functions
 */
Chaos.effect = {
  /**
   *
   */
  pourText : function(target, text, callback) {
    var len = text.length;
    var i=0;
    var time = setInterval(function() {
      target.text(text.slice(0, i));
      if (i++>=len) {
        clearInterval(time);
        callback();
      }
    }, SETTINGS.MESSAGE_SPEED);
  },

  /**
   *
   */
  pourMessages : function(target, msgArr, callback) {
    // todo 
  }
}


/**
 * Create an image loader
 */
Chaos.setupImageLoader = function() {
  var imageLoader = new Chaos.Loader(imageFilter); 
  var blockLoad = true;

  imageLoader.load(createUri(), manipulateImage);
  setInterval(function() {
    if (!blockLoad) {
      imageLoader.load(createUri(), manipulateImage);
    }
  }, SETTINGS.IMAGE_RETREIVE_INTERVAL);

  function createUri() {
    return '/update/' + context.lastRetreiveTime + '?limit=' + SETTINGS.MAX_RETREIVE_COUNT;
  }

  function imageFilter(arr) {
    return arr.filter(function(data) {
      return !REGEXP_FILTER_IMAGE_URL.test(data.uri)
    });
  }

  function manipulateImage(data) {
    blockLoad = true;
    context.lastRetreiveTime = data[0].accessed_at;
    data.reverse();
    var len = data.length;
    var i = 0;
    var timer = setInterval(function() {
      imageTarget.prepend($('<img>').attr('src', data[i].uri));
      if (++i>=len) {
        clearInterval(timer);
        blockLoad = false;
      }
    }, 200);
  }
}


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
        //console.info('beforeFilter:' + data.length);
        data = this.filterFn(data);
        //console.info('afterFilter:' + data.length);
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


var lng = {
  emptyFn : function(){}
}

