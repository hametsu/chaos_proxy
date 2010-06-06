Chaos.startProxyLog = function(config) {
  var connected = false;
  var logCount = 0;

  var targetEl = $('#logScreen');

  config.socket.on('proxylog', handleReceive);

  function handleReceive(data) {
    data = data.split(' ');
    if (data.length <= 3) return;
    targetEl.append("<p class='log'>" + 
    data[0] + ' ' + data[1] + ' <span class="twitterName">' + data[2] + '</span> ' + data[3] + ' ' + data[4] + "</p>"); 
    logCount++;
    if (logCount > 50) {
      $('#logScreen :first').remove();
    }
    if (logCount%5 == 0) {
      targetEl.append("<p class='space'>&nbsp;</p>"); 
    }
  }
}
