var ws = new Chaos.WebSocket({
  url : SETTINGS.BENJO_SERVER_WEBSOCKET_URL,
  autoRecovery : true,
  listeners : {
    open : function() {
      console.info('onopen!!');
    },
    close : function() {
      console.info('close!!!');
    },
    command : onReceiveMessage,
  }
});

function handleSendMsgTextBtn() {
  if (!ws.alive) {
    alert('Connection is not enable');
    return;
  }
  var message = $('#sendMessageText').val();
  if (message == '') {
    alert('message is empty');
    return;
  }
  ws.send('command', {
    "name" : "showMessage",
    "iconUrl" : $('#iconUrl').val(),
    "message" : message,
    "duration" : $('#duration').val()
  });
}

function handleReloadBrowserBtn() {
  if (!ws.alive) {
    alert('Connection is not enable');
    return;
  }
  ws.send('command', {
    "name" : "reloadBrowser"
  });
}

function onReceiveMessage(data, socketKey, pid) {
  if (ws.socketKey == socketKey) {
    alert('Your command is broadcasted');
  } else {
    alert('Another user send message:' + data.name);
  }
}

$(function() {
  $('#sendMessageBtn').click(handleSendMsgTextBtn);
  $('#reloadBrowserBtn').click(handleReloadBrowserBtn);
});

