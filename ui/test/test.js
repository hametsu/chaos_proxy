module('Queue');

asyncTest('Test Syncronus Functions', function(){

  var queue = new Chaos.Queue({
    name : 'test1'
  });

  var result = [];

  queue.push(function(){
    result.push('AAA');
  });

  queue.push(function(){
    result.push('BBB');
  });

  queue.push({
    fn : function(callback) {
      result.push('CCC');
      callback();
    },
    callback : function() {
      result.push('DDD');
    }
  });

  setTimeout(function() {
    equals(result[0], 'AAA', 'Result of queue1');
    equals(result[1], 'BBB', 'Result of queue2');
    equals(result[2], 'CCC', 'Result of queue3');
    equals(result[3], 'DDD', 'Result of queue4');
    start();
  }, 100);
});

asyncTest('Test Syncronus test with arguments', function() {

  var queue = new Chaos.Queue({
    name : 'test2'
  });

  var result = [];

  var fn1 = function() {
    result.push('AAA');
    result.push('BBB');
  }

  var fn2 = function(a, b) {
    result.push(a);
    result.push(b);
    result.push('EEE');
  }

  var fn3 = function(a) {
    result.push(a);
  }

  queue.push({
    fn : fn1
  });

  queue.push({
    fn : fn2,
    args : ['CCC', 'DDD']
  });

  queue.push({
    fn : fn3,
    args : ['FFF']
  });

  queue.push(function(){
    result.push('END');
  });

  setTimeout(function() {
    equals(result[0], 'AAA', 'Value by static');
    equals(result[1], 'BBB', 'Value by static');
    equals(result[2], 'CCC', 'Value by argument1');
    equals(result[3], 'DDD', 'Value by argument2');
    equals(result[4], 'EEE', 'Value by static');
    equals(result[5], 'FFF', 'Value by argument1');
    equals(result[6], 'END', 'Final value');
    start();
  }, 100);
});

asyncTest('Test syncronus test with Scope', function() {

  var result = [];

  var queue = new Chaos.Queue({
    name : 'test3'
  });

  var Ninja = function(name){
    this.name = name;
  }
  Ninja.prototype = {
    getName : function(r) {
      r.push(this.name);
    },
    setWeapon : function(w) {
      this.weapon = w;
    },
    getWeapon : function(r) {
      r.push(this.weapon);
    }
  }

  var sasuke = new Ninja('sasuke');

  queue.push({
    fn : sasuke.getName,
    args : [result],
    scope : sasuke
  });

  queue.push({
    fn : sasuke.setWeapon,
    args : ['katana'],
    scope : sasuke
  });

  queue.push({
    fn : sasuke.getWeapon,
    args : [result],
    scope : sasuke
  });

  setTimeout(function() {
    equals(result[0], 'sasuke', 'Value in scope');
    equals(result[1], 'katana', 'Value in scope');
    start();
  }, 100);
});


asyncTest('Test asyncronus test', function() {

  var result = [];

  var queue = new Chaos.Queue({
    name : 'test4'
  });

  var Ninja = function(name){
    this.name = name;
  }
  Ninja.prototype = {
    getName : function(r, callback) {
      var result = this.name;
      setTimeout(function() {
        callback(result);
      }, 100);
    },
    setWeapon : function(w, callback) {
      var self = this;
      setTimeout(function() {
        self.weapon = w;
        callback();
      });
    },
    getWeapon : function(r, callback) {
      var result = this.weapon;
      setTimeout(function() {
        callback(result);
      }, 100);
    }
  }

  var sasuke = new Ninja('sasuke');

  queue.push({
    fn : sasuke.getName,
    args : [result],
    scope : sasuke,
    callback : function(name) {
      result.push(name);
    }
  });

  queue.push({
    fn : sasuke.setWeapon,
    args : ['katana'],
    scope : sasuke,
    callback : function(){}
  });

  queue.push({
    fn : sasuke.getWeapon,
    args : [result],
    scope : sasuke,
    callback : function(wep) {
      result.push(wep);
    }
  });

  queue.push(function(){
    result.push('END');
  });

  result.push('First');

  setTimeout(function() {
    equals(result[0], 'First', 'Value add syncronus');
    equals(result[1], 'sasuke', 'Value in callback');
    equals(result[2], 'katana', 'Value in callback');
    equals(result[3], 'END', 'End Value');
    start();
  }, 300);
});
