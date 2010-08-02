require "uri"
require "rubygems"
require "eventmachine"
require "em-websocket"
require "yajl/http_stream"
require "json"

@channel = EM::Channel.new

EventMachine::run {
  EventMachine::defer {
    puts "server start"
    EM::WebSocket.start(:host => "0.0.0.0", :port => 4566) do |ws|
      ws.onopen do
        sid = @channel.subscribe {|msg| ws.send msg}
        puts "#{sid} connected"

        ws.onmessage {|msg|
          puts "<#{sid}>: #{msg}"
        }

        ws.onclose {
          @channel.unsubscribe(sid)
          puts "#{sid} closed"
        }
      end
    end
  }

  EventMachine::defer {
    puts "stream start"
    100.times do |i|
      puts 'hoge'*i
      @channel.push 'hoge'*i
    end
  }
}



