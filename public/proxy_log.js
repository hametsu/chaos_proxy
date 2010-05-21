Chaos.startProxyLog = function() {
  var connected = false;
  var ws;
  var logCount = 0;

  var targetEl = $('#logScreen');
  openConnection();

  function openConnection() {
    ws = new WebSocket("ws://chaos.yuiseki.net:4569/");
    ws.onclose = function() { 
      console.error("socket closed"); 
      connected = false;
      // retry
      setTimeout(openConnection, 5000);
    };

    ws.onopen = function() {
      connected = true;
      console.info("connected...");
    };

    ws.onmessage = function(evt) { 
      //var arr = evt.data.split('\n');
      //arr.forEach(function(d) {
        var d = evt.data;
        var data = d.split(' ');
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
      //});
    };
  }

}
