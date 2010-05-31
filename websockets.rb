require 'rubygems'
require 'drb/drb'
require 'lib/em-websocket'

@channel = EM::Channel.new
DRb.start_service
$ts = DRbObject.new_with_uri('druby://:12345')
Thread.new do
loop {
  hoge = $ts.take(["data", nil])
  @channel.push hoge[1]
}
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






