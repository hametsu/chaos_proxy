Chaos.startUserList = function() {
  var animation = new Chaos.animation.UserList();
  var api = '/users.json';

  var userListLoader = new Chaos.Loader();
  load();

  function load() {
    userListLoader.load(api, renderUserList);
  }

  function renderUserList(dataArr) {
    if (dataArr.length == 0) {
      return;
    }
    animation.setup();
    animation.applyToAll(dataArr, function(){
      setTimeout(load, SETTINGS.USER_LIST_RETREIVE_INTERVAL);
    });
  }
}

Chaos.animation.UserList = function() {
  Chaos.animation.UserList.prototype.initialize.apply(this);
}

Chaos.animation.UserList.prototype = {
  initialize : function() {
    this.pool = $('#userIconPool');
  },

  setup : function() {
    this.viewArea = $('<div class="userList">');
    this.viewArea.hide();
    this.viewArea.appendTo('#contentArea');
    this.viewTitle = $('<div class="userListTitle">');
    this.viewTitle.append($('<span>').text('Now in the Hametsu Rounge...'));
    this.viewTitle.hide();
    this.viewTitle.appendTo('#contentArea');
    this.viewTitle.fadeTo('slow', 0.9).show('1000');
  },

  end : function() {
    var self = this;
    this.viewTitle.fadeOut('normal');
    this.viewArea.fadeOut('slow', function() {
      self.viewTitle.remove();
      self.viewArea.remove();
    });
  },

  applyToText : function(data, callback) {
    var message = data.url;
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
          setTimeout(lng.bind(self.end, self), 2000);
          callback();
        }
      })();
    });
  },

  createTable : function(arr, callback) {
    var tableWidth = Math.floor(context.screenWidth * 0.8) - 60;
    var puidWidth = Math.floor((tableWidth - 220)/2);
    var table = $('<table>').width(tableWidth);
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
    this.viewArea.fadeTo('slow', 0.9).show(1000, callback);
    this.table = table;
  }
}
