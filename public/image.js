/**
 * Create an image loader
 */
Chaos.startImageLoader = function() {
  var REGEXP_FILTER_IMAGE_URL = /(chaos\.yuiseki\.net)|(www\.google-analytics\.com\/__utm\.gif)/;

  var idol = false;
  var idolCount = 0;
  var animIndex = 0;

  var imagePool = $('#imagePool');
  var currentAnim = getNextAnimation(imagePool);

  var imageLoader = new Worker('loader_worker.js');
  imageLoader.onmessage = function(d) {
    imageLoader.onmessage = function(e) {
      renderImages(e.data);
    }
    imageLoader.postMessage({eventName:'start'});
  };
  imageLoader.postMessage({
    eventName:'setup', 
    maxRetreiveCount : SETTINGS.MAX_RETREIVE_COUNT,
    interval : SETTINGS.IMAGE_RETREIVE_INTERVAL
  });


  function setLatestImageRetreiveTime(d) {
    context.lastRetreiveTime = d[0].accessed_at;
  }

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
    setLatestImageRetreiveTime(data);
    data.reverse();
    var len = data.length;
    var i = 0;
    var timer = setInterval(function() {

      var url = data[i].uri;
      var puid = data[i].puid;
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
      Chaos.image.addUserIcon(puid);
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

          storeImage(jqObj, width, height, zIndex, puid);
          currentAnim.applyToElm(jqObj, posXY, zIndex, puid, width);
        }
      });
      if (++i>=len) {
        clearInterval(timer);
        if (currentAnim.roopCount++ > currentAnim.roopLimit) {
          changeAnimation();
        } else {
          imageLoader.postMessage({eventName:'start'});
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
    var next = anims[animIndex++ % anims.length];
    var result = new next(imagePool);
    result.setup();
    return result;
  }

  function changeAnimation() {
    imageLoader.postMessage({eventName:'stop'});
    currentAnim.end22(function() {
      var next = getNextAnimation();
      next.applyToAll(function() {
        imageLoader.postMessage({eventName:'start'});
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

  end22 : function(callback) {
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

  applyToElm : function(jqObj, xy, zIndex, puid) {
    jqObj.css({
      'top' : null,
      'left' : xy.x,
      'zIndex' : zIndex
    });
    var icon = Chaos.image.getUserIcon(puid);
    icon.css({
      'zIndex' : zIndex + 1,
      'border' : '1px solid #777'
    });
    if (zIndex > 150) {
      icon.css({'width' : 20, 'left' : xy.x - 10});
      if (this.applyCount++%3 == 0) {
        this.imageLayerVerySmall.append(jqObj);
        this.imageLayerVerySmall.append(icon); 
      } else {
        this.imageLayerSmall.append(jqObj)
        this.imageLayerSmall.append(icon)
      }
    } else
    if (zIndex > 120) {
      icon.css({'width' : 40, 'left' : xy.x+5, 'margin-top' : 5})
      this.imageLayerMiddle.append(jqObj);
      this.imageLayerMiddle.append(icon);
    } else {
      icon.css({'width' : 60, 'left' : xy.x+10, 'margin-top':10})
      this.imageLayerLarge.append(jqObj);
      this.imageLayerLarge.append(icon);
    }

  },

  applyToAll : function(callback) {
    var i = 0;
    var len = this.dataArr.length;
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

  applyToElm : function(jqObj, xy, zIndex, puid) {
    jqObj.css({
      'top' : xy.y,
      'left' : xy.x,
      'zIndex' : zIndex
    });
    var icon = Chaos.image.getUserIcon(puid);
    icon.css({
      'zIndex' : zIndex + 1,
      'border' : '1px solid #777'
    });
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

  applyToElm : function(jqObj, xy, zindex, puid) {
    this.imageLayer.prepend(jqObj);
  },

  applyToAll : function(callback) {
    var i = 0;
    var len = this.dataArr.length;
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

