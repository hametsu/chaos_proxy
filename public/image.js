/**
 * Create an image loader
 */
Chaos.startImageLoader = function() {
  var REGEXP_FILTER_IMAGE_URL = /(chaos\.yuiseki\.net)|(www\.google-analytics\.com\/__utm\.gif)/;

  var blockLoad = false;
  var idol = false;
  var count = 0;
  var animIndex = 0;

  var imagePool = $('#imagePool');
  var currentAnim = getNextAnimation(imagePool);


  var imageLoader = new Chaos.Loader(imageFilter); 
  (function() {
    if (!blockLoad) {
      blockLoad = true;
      imageLoader.load(createUri(), renderImages);
    }
    setTimeout(arguments.callee, SETTINGS[idol ? 'IMAGE_RETREIVE_INTERVAL_IDOL' : 'IMAGE_RETREIVE_INTERVAL']);
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

  function storeImage(jqObj, width, height, zIndex) {
    context.loadedImages.push({
      obj : jqObj,
      width : width,
      height : height,
      zIndex : zIndex
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
      idol = true;
      blockLoad = false;
      count+=2;
      if (count > 5) {
        count = 0;
        changeAnimation();
      }
      return;
    }
    count++;
    idol = false;
    setLatestImageRetreiveTime(data);
    data.reverse();
    var len = data.length;
    var i = 0;
    var timer = setInterval(function() {

      var url = data[i].uri;
      if (url.match(/media.tumblr.com/)) {
        url = url.replace(/(http.*)(500|400)(.jpg|.png)$/, '$1250$3');
      }
      if (url.match(/data.tumblr.com/)) {
        url = url.replace(/(http.*)(1280)(.jpg|.png)(\?AWSAccessKeyId.*)$/, '$1400$3');
      }
      if (url.match(/farm5.static.flickr.com/)) {
        url = url.replace(/(http.*)(_b.jpg|_o.jpg)$/, '$1.jpg');
      }

      var jqObj = $('<img>').attr('src', url);
      context.textdata.push(url);
      // Put to the tmp area (invisible) and waiting load the image
      imagePool.prepend(jqObj);
      jqObj.bind('load', function(a) {
        var width = a.target.offsetWidth;
        var height = a.target.offsetHeight;
        if (height + width > SETTINGS.MAX_IMAGE_SIZE) {
          jqObj.remove();
        } else {
          jqObj.css({ 
            width : width, 
            height : height
          });
          var posXY = Chaos.effect.getRandomXY(width, height);
          var zIndex = Chaos.effect.getImageZIndex(width, height);

          storeImage(jqObj, width, height, zIndex);
          currentAnim.applyToElm(jqObj, posXY, zIndex);
        }
      });
      if (++i>=len) {
        clearInterval(timer);
        blockLoad = false;
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
    var next = anims[animIndex++ % anims.length];
    var result = new next(imagePool);
    result.setup();
    return result;
  }

  function changeAnimation() {
    blockLoad = true;
    currentAnim.end22(function() {
      var next = getNextAnimation();
      next.applyToAll(function() {
        blockLoad = false;
        currentAnim = next;
      });
    });
  }

}

Chaos.animation.DropDown = function(pool, dataArr) {
  Chaos.animation.DropDown.prototype.initialize.apply(this, [pool]);
}

Chaos.animation.DropDown.prototype = {

  initialize : function(pool) {
    this.dataArr = context.loadedImages;
    this.pool = pool;
  },

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

  end22 : function(callback) {
    var self = this;
    this.imageLayerVerySmall.fadeOut('slow');
    this.imageLayerSmall.fadeOut('slow', onsuccess);

    function onsuccess() {
      $.each(self.dataArr, function(idx, d) {
        self.pool.append(d.obj);
      });
      self.imageLayerLarge.remove();
      self.imageLayerMiddle.remove();
      self.imageLayerSmall.remove();
      self.imageLayerVerySmall.remove();
      callback();
    }
  },

  applyCount : 0,

  applyToElm : function(jqObj, xy, zIndex) {
    jqObj.css({
      'top' : null,
      'left' : xy.x,
      'zIndex' : zIndex
    });
    if (zIndex > 150) {
      if (this.applyCount++%3 == 0) {
        this.imageLayerVerySmall.append(jqObj)
      } else {
        this.imageLayerSmall.append(jqObj)
      }
    } else
    if (zIndex > 120) {
      this.imageLayerMiddle.append(jqObj);
    } else {
      this.imageLayerLarge.append(jqObj);
    }
  },

  applyToAll : function(callback) {
    var i = 0;
    var len = this.dataArr.length;
    (function() {
      var d = this.dataArr[i++];
      var xy = Chaos.effect.getRandomXY(d.width, d.height);
      this.applyToElm(d.obj, xy, d.zIndex); 
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

  end22 : function(callback) {
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

  applyToElm : function(jqObj, xy, zIndex) {
    jqObj.css({
      'top' : xy.y,
      'left' : xy.x,
      'zIndex' : zIndex
    });
    if (zIndex > 140) {
      this.imageLayerSmall.append(jqObj);
    } else
    if (zIndex > 120) {
      this.imageLayerMiddle.append(jqObj);
    } else {
      this.imageLayerLarge.append(jqObj);
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
    (function() {
      var d = this.dataArr[i++];
      var xy = Chaos.effect.getRandomXY(d.width, d.height);
      this.applyToElm(d.obj, xy, d.zIndex); 
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

  setup : function() {
    var area = $('<div>').addClass('tile');
    $('#contentArea').append(area);
    this.imageLayer  = area;
  },

  end22 : function(callback) {
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

  applyToElm : function(jqObj, xy, zIndex) {
    this.imageLayer.prepend(jqObj);
  },

  applyToAll : function(callback) {
    var i = 0;
    var len = this.dataArr.length;
    (function() {
      var d = this.dataArr[i++];
      var xy = Chaos.effect.getRandomXY(d.width, d.height);
      this.applyToElm(d.obj, xy, d.zIndex); 
      if (len > i) {
        setTimeout(lng.bind(arguments.callee, this), 500);
      } else {
        callback();
      }
    }).apply(this);
  }
}

