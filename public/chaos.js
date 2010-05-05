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


var context = {
  enableCSSAnimation : false,
  screenHeight : 0,
  screenWidth : 0,
  loadedImages : [],
  lastRetreiveTime : "1171815102" // An enough old time for first time
} 

/**
 * Name space for functions
 */
var Chaos = {};

/**********************************************/

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
  },

  getRandomeXY : function(imageWidth, imageHeight) {
    var x = Math.floor(Math.random() * (context.screenWidth - imageWidth));
    var y = Math.floor(Math.random() * (context.screenHeight - imageHeight));
    return {x : x, y : y} 
  },

  getImageZIndex : function(width, height) {
    var size = width + height;
    return size > 600 ? 100 :
      size > 500 ? 105 :
      size > 400 ? 110 :
      size > 300 ? 120 :
      size > 200 ? 130 :
      size > 100 ? 140 :
      size > 50  ? 150 :
      size > 25 ? 160 : 170;
  }
}

/**
 * For common utilities
 */
var lng = {
  emptyFn : function(){}
}

