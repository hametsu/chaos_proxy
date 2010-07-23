require 'rubygems'
require 'drb/drb'
require 'lib/em-websocket'
require 'json/pure'

@channel = EM::Channel.new
DRb.start_service
$ts = DRbObject.new_with_uri('druby://:12345')
Thread.new do
loop {
  hoge = $ts.take(["data", nil, nil])
  @channel.push(JSON.dump({
    'eventName' => hoge[1],
    'data' => hoge[2]
  }))
}
end


EventMachine.run do
  EventMachine::WebSocket.start(:host => "0.0.0.0", :port => 4569, :debug => true) do |ws|
    ws.onopen {
      # @channelになにか入ってきたら全クライアントに送信
      sid = @channel.subscribe { |msg| ws.send msg }
      # クライアントからなにか送られてきたらそれをそのまま全クライアントに送信
      ws.onmessage { |msg|
        # TODO check sequrity token and send only valid message
        @channel.push(msg)
      }
      # 切断時の処理
      ws.onclose {
        @channel.unsubscribe(sid)
      }
    }
  end
end






