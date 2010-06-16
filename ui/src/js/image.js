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

