require 'lib/em-websocket'
require 'directory_watcher'

EM.kqueue = true
FILE_NAME = 'proxy.tmp.log'

#@em = DirectoryWatcher::EmScanner.new {|event| 
#  puts event
#}
#
#@em.files={}
#@em.glob='*'
#@em.interval=1
#@em.start
#@em.join

@channel = EM::Channel.new

dw = DirectoryWatcher.new '.', :glob => FILE_NAME, :interval => 1
dw.add_observer {|*args| args.each {|event| 
  File.open(FILE_NAME, 'r') {|f|
    @channel.push(f.read)
  }
}}
dw.start

EventMachine::WebSocket.start(:host => "0.0.0.0", :port => 8080, :debug => true) do |ws|

  ws.onopen {
    sid = @channel.subscribe { |msg| ws.send msg }
    @channel.push "#{sid} connected!"

    ws.onmessage { |msg|
      puts 'onmessage'
      @channel.push "<#{sid}>: #{msg}"
    }

    ws.onclose {
      @channel.unsubscribe(sid)
    }
  }
end

puts 'WebSocket Server Started!!'

