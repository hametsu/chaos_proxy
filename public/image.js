/**
 * Create an image loader
 */
Chaos.setupImageLoader = function() {
  var REGEXP_FILTER_IMAGE_URL = /(chaos\.yuiseki\.net)|(www\.google-analytics\.com\/__utm\.gif)/;

  var blockLoad = false;

  var imageLayerLarge  = $('#contentArea div.z1');
  var imageLayerMiddle = $('#contentArea div.z2');
  var imageLayerSmall  = $('#contentArea div.z3');
  var imagePool = $('#imagePool');

  var imageLoader = new Chaos.Loader(imageFilter); 
  (function() {
    if (!blockLoad) {
      imageLoader.load(createUri(), renderImages);
    }
    setTimeout(arguments.callee, SETTINGS.IMAGE_RETREIVE_INTERVAL);
  })();

  function createUri() {
    return '/update/' + context.lastRetreiveTime + '?limit=' + SETTINGS.MAX_RETREIVE_COUNT;
  }

  function imageFilter(arr) {
    return arr.filter(function(data) {
      return !REGEXP_FILTER_IMAGE_URL.test(data.uri)
    });
  }

  function setLatestImageRetreiveTime(d) {
    context.lastRetreiveTime = d[0].accessed_at;
  }

  function storeImages(jqObj) {
    context.loadedImages.push(jqObj);
    if (context.loadedImages.length > SETTINGS.MAX_KEEP_IMAGES_COUNT) {
      context.loadedImages.shift().remove();
    }
  }

  function renderImages(data) {
    blockLoad = true;
    setLatestImageRetreiveTime(data);
    data.reverse();
    var len = data.length;
    var i = 0;
    var timer = setInterval(function() {
      var jqObj = $('<img>').attr('src', data[i].uri);
      storeImages(jqObj);
      imagePool.prepend(jqObj);
      jqObj.bind('load', function(a) {
        var width = a.target.offsetWidth;
        var height = a.target.offsetHeight;
        var posXY = Chaos.effect.getRandomeXY(width, height);
        var zIndex = Chaos.effect.getImageZIndex(width, height);
        jqObj.css({
          'top' : posXY.y,
          'left' : posXY.x,
          'zIndex' : zIndex
        });
        if (zIndex > 140) {
          imageLayerSmall.append(jqObj);
        } else
        if (zIndex > 110) {
          imageLayerMiddle.append(jqObj);
        } else {
          imageLayerLarge.append(jqObj);
        }
      });
      if (++i>=len) {
        clearInterval(timer);
        blockLoad = false;
      }
    }, 200);
  }
}

