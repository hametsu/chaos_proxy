require 'rubygems'
require 'webrick'
require 'webrick/httpproxy'
require 'uri'

require 'tokyotyrant'
include TokyoTyrant

handler = Proc.new() {|req,res|
  # proxyに入ってきたパス
  path = req.unparsed_uri
  # 以下の拡張子を含んでいたら…
  if path =~ /\.(jpg|gif|png)/
    # TTに投入するバリュー
    value = {"uri" => path, "accessed_at" => Time.now.to_i.to_s}
    #puts value.inspect

    rdb = RDBTBL::new
    rdb.open('localhost', 1978)
    # TTに投入するキー
    key = rdb.rnum+1
    # 挿入実行
    rdb.put(key, value)
    rdb.close
  end
}

s = WEBrick::HTTPProxyServer.new(
  # 起動するポート
  :Port => 3000,
  # ログ出力制限
  :Logger => WEBrick::Log::new("webrick.log", WEBrick::Log::WARN),
  :ProxyVia => false,
  :ProxyContentHandler => handler
)

trap('INT') { s.shutdown }

s.start

