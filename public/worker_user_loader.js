var Chaos = {};

importScripts('json2.js', 'loader.js');

var loader;
var interval;
var timer = 0;

onmessage = function(e) {
  var data = e.data;
  if (data.eventName == 'setup') {
    setup(data);
  } else
  if (data.eventName == 'stop') {
    stop();
  } else
  if (data.eventName == 'start') {
    start();
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
  postMessage(arr);
  timer = setTimeout(load, interval);
}

