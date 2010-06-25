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
      delay : 2000,
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
  var rpp = 20;

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

      var fn =  lng.bind(this.getSearchResults, this);
      fn(word, callback);
      timer = setInterval(fn, interval);
    },

    stop : function() {
      clearInterval(timer);
    }
  }
})();
