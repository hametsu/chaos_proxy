Chaos.startCommandReceiver = function(config) {

  var queue = config.queue;

  config.socket.on('command', handleReceiveCommand);

  function handleReceiveCommand(data) {
    console.info('Receive Command');
    console.dir(data);
  }
}
