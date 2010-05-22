require 'rubygems'
require 'lib/em-websocket'

#EM.kqueue = true
FILE_NAME = '/tmp/fs/proxy.log'
@channel = EM::Channel.new

Thread.new do
  last_accessed = Time.now.to_i
  while true do
    last_modified = File::mtime(FILE_NAME).to_i
    if last_modified != last_accessed
      last_accessed = last_modified
      File.open(FILE_NAME, 'r'){|f| @channel.push(f.read) }
    end
    sleep 0.2
  end
end



EventMachine.run do
  EventMachine::WebSocket.start(:host => "0.0.0.0", :port => 4569, :debug => true) do |ws|
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
end







