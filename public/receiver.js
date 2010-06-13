Chaos.startCommandReceiver = function(config) {

  var queue = config.queue;

  config.socket.on('command', handleReceiveCommand);

  function handleReceiveCommand(data) {
    var handler = Chaos.commandReceivers[data.name]
    if (handler) {
      handler.setQueue(queue, data);
    } else {
      console.error('no method called:' + data.name);
    }
  }
}

Chaos.commandReceivers = {};
Chaos.commandReceivers['showMessage'] = (function() {

  var elm = $('#mainmessage');

  var show = function(data, callback) {
    var vArea = $('<div class="notificationMessage">');
    vArea.hide();
    vArea.appendTo(elm);
    vArea.html(data.message);
    if (data.iconUrl.length > 0) {
      vArea.prepend($('<img>').attr('src', data.iconUrl));
    }
    vArea.show(1000);
    setTimeout(function() {
      vArea.fadeOut(1000, function() {
        vArea.remove();
        callback();
      });
    }, data.duration);
  }

  return {
    setQueue : function(queue, data) {
      queue.push({
        fn : show,
        args : [data],
        callback : lng.emptyFn
      });
    }
  }
})();

Chaos.commandReceivers['reloadBrowser'] = (function() {
  return {
    setQueue : function(queue, data) {
      queue.push(function() {
        var url = window.location.href;
        window.location.href = url;
      });
    }
  }
})();
