
require 'rubygems'
require 'directory_watcher'
FILE_NAME = '/tmp/fs/proxy.log'

dw = DirectoryWatcher.new '/tmp/fs/', :glob => 'proxy.log', :interval => 1
dw.add_observer {|*args| args.each {|event|
  puts event
  File.open(FILE_NAME, 'r') {|f|
    puts f.read
  }
}}
dw.start
gets
dw.stop
