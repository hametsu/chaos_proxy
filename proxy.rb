#! ruby -Ku
require 'rubygems'
require 'webrick'
require 'webrick/httpproxy'
require 'uri'
require 'tokyotyrant'
include TokyoTyrant
require 'hpricot'
require 'stringio'
require 'zlib'
require 'kconv'
require 'base64'

require 'term/ansicolor'
class String
    include Term::ANSIColor
end
require 'yaml'
$settings = YAML.load_file("settings.yaml")
$allowed_hosts = [
  "twitter.com", "search.twitter.com",
  "s.twimg.com", "a0.twimg.com", "a1.twimg.com", "a2.twimg.com", "a3.twimg.com", "widgets.twimg.com",
  "www.google.com", "www.google.co.jp", "ajax.googleapis.com",
  "clients1.google.co.jp", "maps.google.com", "maps.gstatic.com", "www.google-analytics.com",
  "wiki.github.com"
]
$allowed_ctypes = ["image/jpeg", "image/gif", "image/png", nil]

def check_twitter(puid)
  rdb = RDBTBL::new
  unless rdb.open($settings["twitter"]["host"].to_s, $settings["twitter"]["port"].to_i)
    puts rdb.errmsg(rdb.ecode).red
  end
  qry = RDBQRY::new(rdb)
  qry.addcond("puid", RDBQRY::QCSTREQ, puid.to_s)
  hit = qry.searchget
  rdb.close
  if hit.size == 0
    return false
  else
    puts hit.last.fetch('twitter_name', '!!empty!!').red.bold
    return true
  end
end

handler = Proc.new() {|req,res|
  path = req.unparsed_uri
  puid = "#{req.peeraddr[2]}:#{req.peeraddr[3]}"

  unless check_twitter(puid)
    unless $allowed_hosts.include?(req.host)
      puts req.host.red
      unless $allowed_ctypes.include?(res.header["content-type"])
        puts "force redirect http://twitter.com/login".bold
        res.status = 302
        res.header["location"] = "http://twitter.com/login"
      end
    else
      puts req.host.yellow
    end
  else
    puts req.host.green
  end

  case path
  when /^http:\/\/twitter\.com\/$/
    # twitterへのアクセスだったらpuidとtwitter_nameを紐付け
    body = res.body
    if res.header["content-encoding"] == "gzip"
      Zlib::GzipReader.wrap(StringIO.new(res.body)){|gz| body = gz.read}
      res.header.delete("content-encoding")
      res.header.delete("content-length")
    end
    utf_body = body.toutf8
    #utf_body.gsub!(/。/, 'にょ。')
    doc = Hpricot(utf_body)
    span_me_name = doc.search('span#me_name')
    if span_me_name
      puts 'trying to get twitter name'.yellow
      twitter_name = span_me_name.inner_html
      puts twitter_name.red.bold
      unless twitter_name == ""
        value = {'puid' => puid.to_s, 'twitter_name' => twitter_name.to_s, 'accessed_at' => Time.now.to_i.to_s }
        rdb = RDBTBL::new
        rdb.open($settings["twitter"]["host"].to_s, $settings["twitter"]["port"].to_i)
        key = rdb.rnum + 1
        rdb.put(key, value)
        rdb.close
      end
    end
    code = Kconv.guess(body)
    res.body = utf_body.kconv(code, Kconv::UTF8)

  when /\.(jpg|gif|png)/
    # 画像だったらTTへ保存
    rdb = RDBTBL::new
    rdb.open($settings["tokyotyrant"]["host"].to_s, $settings["tokyotyrant"]["port"].to_i)
    qry = RDBQRY::new(rdb)
    qry.addcond("uri", RDBQRY::QCSTREQ, path)
    hit = qry.searchget
    if hit.size == 0
      # 初回投入
      value = {"uri" => path, "accessed_at" => Time.now.to_i.to_s, "count"=>"1"}
      key = rdb.rnum + 1
      rdb.put(key, value)
    else
      # 既出のURL。カウントアップ
      count = hit.last.fetch("count", "1").to_i+1
      value = {"uri" => path, "accessed_at" => Time.now.to_i.to_s, "count"=>count.to_s}
      key = rdb.rnum + 1
      rdb.put(key, value)
    end
    rdb.close
  end
  #res.header.each{|k,v| puts "#{k} : #{v}".bold }
}

s = WEBrick::HTTPProxyServer.new(
  :Port => $settings["proxy"]["port"].to_i,
  :ProxyVia => false,
  :ProxyURI => URI.parse('http://localhost:3128/'),
  :ProxyContentHandler => handler,
  :AccessLog => [['/dev/null', ''],],
  :Logger => WEBrick::Log::new("tmp/proxy.log", WEBrick::Log::DEBUG)
)
trap('INT') { s.shutdown }
s.start
