var Chaos = {};

importScripts('../lib/json2.js', 'loader.js');

var loader;
var interval;
var timer = 0;

onmessage = function(e) {
  var data = JSON.parse(e.data);
  if (data.eventName == 'setup') {
    setup(data);
  } else
  if (data.eventName == 'stop') {
    stop();
  } else
  if (data.eventName == 'start') {
    start(data.defer);
  } else
  if (data.eventName == 'ping') {
    log('ping:' + new Date());
  } else {
    postMessage('Invalid event name given');
  }
}

function setup(data) {
  interval = data.interval;
  loader = new Chaos.Loader();
  postMessage(JSON.stringify({
    eventName : 'setup'
  }));
}

function load() {
  loader.load('/users.json', handleLoad);
}

function stop() {
  clearInterval(timer);
}

function start(defer) {
  clearInterval(timer);
  if (defer) {
    timer = setTimeout(load, interval);
  } else {
    load();
  }
}


function handleLoad(arr) {
  postMessage(JSON.stringify({
    eventName : 'load',
    data : arr
  }));
}

function log(msg, d) {
  postMessage(JSON.stringify({
    eventName : 'log',
    data : d,
    message : msg
  }));
}

