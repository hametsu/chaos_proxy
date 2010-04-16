require 'rubygems'
require 'webrick'
require 'webrick/httpproxy'
require 'uri'
require 'yaml'

require 'tokyotyrant'
include TokyoTyrant

settings = YAML.load_file("settings.yaml")

handler = Proc.new() {|req,res|
  # proxyに入ってきたパス
  path = req.unparsed_uri
  # 以下の拡張子を含んでいたら…
  if path =~ /\.(jpg|gif|png)/
    # TTに投入するバリュー
    value = {"uri" => path, "accessed_at" => Time.now.to_i.to_s}
    #puts value.inspect

    rdb = RDBTBL::new
    unless rdb.open(settings["tokyotyrant"]["host"].to_s, settings["tokyotyrant"]["port"].to_i)
      ecode = rdb.ecode
      STDERR.printf("open error: %s\n", rdb.errmsg(ecode))
    end
    # TTに投入するキー
    key = rdb.rnum+1
    # 挿入実行
    unless rdb.put(key, value)
      ecode = rdb.ecode
      STDERR.printf("open error: %s\n", rdb.errmsg(ecode))
    end
    rdb.close
  end
}

s = WEBrick::HTTPProxyServer.new(
  # 起動するポート
  :Port => settings["proxy"]["port"].to_i,
  # ログ出力制限
  :Logger => WEBrick::Log::new("webrick.log", WEBrick::Log::WARN),
  :ProxyVia => false,
  :ProxyContentHandler => handler
)

trap('INT') { s.shutdown }

s.start

