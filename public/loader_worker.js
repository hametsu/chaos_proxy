var Chaos = {};
var REGEXP_FILTER_IMAGE_URL = /(chaos\.yuiseki\.net)|(www\.google-analytics\.com\/__utm\.gif)/;

importScripts('json2.js', 'loader.js');

var loader;
var maxRetreiveCount;
var interval;
var lastRetreiveTime = "1171815102"; // An enough old time for first time
var blockLoad = false;
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
  maxRetreiveCount = data.maxRetreiveCount;
  interval = data.interval;
  loader = new Chaos.Loader(imageFilter);
  postMessage('end setup');
}

function load() {
  loader.load(createUri(), handleLoad);
}

function stop() {
  clearInterval(timer);
}

function start() {
  clearInterval(timer);
  load();
}

function createUri() {
  return '/update/' + lastRetreiveTime + '?limit=' + maxRetreiveCount;
}

function handleLoad(arr) {
  postMessage(arr);
  if (arr.length == 0) {
    timer = setTimeout(load, interval);
  } else {
    setLatestImageRetreiveTime(arr);
  }
}

function imageFilter(arr) {
  return arr.filter(function(data) {
    return !REGEXP_FILTER_IMAGE_URL.test(data.uri)
  });
}

function setLatestImageRetreiveTime(d) {
  lastRetreiveTime = d[0].accessed_at;
}
