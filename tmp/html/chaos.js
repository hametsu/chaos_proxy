var MESSAGES = {
  INIT_SCREEN : 'Initializing a chaos proxy viewer...',
  INIT_SCREEN_FINISH : '......Done'
}

var context = {
  height : 0,
  width : 0
} 

var imageTarget = $('#contentArea');


$(function() {
  initMessageArea(initScreen);
});

function initScreen() {
  context.screenHeight = $(window).height();
  context.screenWidth = $(window).width();
  $('#initialMask').css({
    'height' : context.screenHeight,
    'width' :  context.screenWidth,
  });
  $('#contentArea').css({
    'height' : context.screenHeight,
    'width' :  context.screenWidth
  });
  $(document.body).css({
    'background' : 'url(./back.jpg) 50% 50% #FFF no-repeat'
  });
  // Wait for background image load
  setTimeout(function() {
    $('#initialMask').fadeTo('slow', 0.01, function() {
      showMessage($('#message2'), MESSAGES.INIT_SCREEN_FINISH, function() {
        clearMessageArea();
        setupImageLoader();
        flashBackimage();
      });
    });
  }, 1000);
}

function flashBackimage() {
  var mask = $('#initialMask');
  setInterval(function() {
    mask.fadeTo('normal', 0.4, function() {
      mask.fadeTo('slow', 0.01);
    });
  }, 10000);
}

function initMessageArea(callback) {
  $('#messageArea').fadeTo('normal', 0.6, function() {
    showMessage($('#message1'), MESSAGES.INIT_SCREEN, callback);
  }).show();
}

function clearMessageArea() {
  $('#messageArea').fadeOut(1000);
}

function showMessage(target, msg, callback) {
  var len = msg.length;
  var i=0;
  var time = setInterval(function() {
    target.text(msg.slice(0, i));
    if (i++>=len) {
      clearInterval(time);
      callback();
    }
  }, 40);
}

var blockLoad = false;

function setupImageLoader() {
  getImages(manipulateImage);
  setInterval(function() {
    if (!blockLoad) {
      getImages(manipulateImage);
    }
  }, 5000);
}

function manipulateImage(data) {
  if (data.length == 0) {return;}
  blockLoad = true;
  lastRetreiveTime = data[0].accessed_at;
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


var lastRetreiveTime = "1171815102";
var limit = '70';

function getImages(callback) {
  if (location.hostname == 'chaos.yuiseki.net') {
    getImagesFromSameDomain(callback);
  } else {
    getImagesFromAnotherDomain(callback);
  }
}

function getImagesFromSameDomain(callback) {
  var baseUrl = '/update/';
  $.getJSON(baseUrl + lastRetreiveTime + '?limit=' + limit, {}, function(response, status) {
    callback(response);
  });
}

function getImagesFromAnotherDomain(callback) {
  var baseUrl = 'http://chaos.yuiseki.net/update/';
  var xhr = new XMLHttpRequest();
  xhr.open("GET", baseUrl + lastRetreiveTime + '?limit=' + limit, true);
  xhr.onreadystatechange = function(){
    if ( xhr.readyState == 4 ) {
      if ( xhr.status == 200 ) {
        var data = JSON.parse(xhr.responseText);
        callback(data);
      } else {
        //console.error('Error #getImageFromAnotherDomain');
        //console.error(xhr.responseText);
      }
    }
  };
  xhr.send(null);
}

var lng = {
  emptyFn : function(){}
}
