var thisScript = (function (e) {
  if(e.nodeName.toLowerCase() == 'script') return e;
  return arguments.callee(e.lastChild) }
)(document);

var loadScriptUrl = thisScript && thisScript.src && thisScript.src.split('#')[1];

$(function() {
  var tstmp = String(+new Date());
  $.getScript(loadScriptUrl + '?' + tstmp);
});
