var Chaos = {};
var REGEXP_FILTER_IMAGE_URL = /(chaos\.yuiseki\.net)|(www\.google-analytics\.com\/__utm\.gif)/;

importScripts('json2.js', 'loader.js');

var loader;
var maxRetreiveCount;
var interval;
var lastRetreiveTime = "1171815102"; // An enough old time for first time
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
  // replace image url to smaller size (flickr, tumblr)
  var result = arr.map(function(d) {
    var url = d.uri;
    if (url.match(/media.tumblr.com/)) {
      url = url.replace(/(http.*)(500|400)(.jpg|.png)$/, '$1250$3');
    }
    if (url.match(/data.tumblr.com/)) {
      url = url.replace(/(http.*)(1280)(.jpg|.png)(\?AWSAccessKeyId.*)$/, '$1400$3');
    }
    if (url.match(/farm5.static.flickr.com/)) {
      url = url.replace(/(http.*)(_b.jpg|_o.jpg)$/, '$1.jpg');
    }
    d.uri = url;
    return d;
  });
  postMessage(JSON.stringify(result));

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
