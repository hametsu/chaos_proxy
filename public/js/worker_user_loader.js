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
    start();
  } else {
    postMessage('Invalid event name given');
  }
}

function setup(data) {
  interval = data.interval;
  loader = new Chaos.Loader();
  postMessage('end setup');
}

function load() {
  loader.load('/users.json', handleLoad);
}

function stop() {
  clearInterval(timer);
}

function start() {
  clearInterval(timer);
  load();
}


function handleLoad(arr) {
  postMessage(JSON.stringify(arr));
  timer = setTimeout(load, interval);
}

