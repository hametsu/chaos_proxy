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
    this.viewTitle.append($('<span>').text('Users in NishiAzabu BULLET\'S'));
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
