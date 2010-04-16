require 'rubygems'
require 'webrick'
require 'webrick/httpproxy'
require 'uri'
require 'tokyotyrant'
include TokyoTyrant
require 'yaml'
settings = YAML.load_file("settings.yaml")

handler = Proc.new() {|req,res|
  # requestされたパス
  path = req.unparsed_uri
  if path =~ /\.(jpg|gif|png)/
    rdb = RDBTBL::new
    rdb.open(settings["tokyotyrant"]["host"].to_s, settings["tokyotyrant"]["port"].to_i)

    qry = RDBQRY::new(rdb)
    qry.addcond("uri", RDBQRY::QCSTREQ, path)
    hit = qry.searchget
    if hit.size == 0
      # 初回投入
      value = {"uri" => path, "accessed_at" => Time.now.to_i.to_s, "count"=> "0"}
      key = rdb.rnum + 1
      rdb.put(key, value)
    else
      # 既出のURL。カウントアップ
      count = hit.fetch("count", "0").to_i+1
      value = {"uri" => path, "accessed_at" => Time.now.to_i.to_s, "count"=>count.to_s}
      key = rdb.rnum + 1
      rdb.put(key, value)
    end
    rdb.close
  end
}

s = WEBrick::HTTPProxyServer.new(
  :Port => settings["proxy"]["port"].to_i,
  :ProxyVia => false,
  :ProxyContentHandler => handler
)
trap('INT') { s.shutdown }
s.start
