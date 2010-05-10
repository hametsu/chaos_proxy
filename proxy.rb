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
  "twitter.com", "m.twitter.com", "mobile.twitter.com", "search.twitter.com",
  "s.twimg.com", "a0.twimg.com", "a1.twimg.com", "a2.twimg.com", "a3.twimg.com", "widgets.twimg.com",
  "www.google.com", "www.google.co.jp", "ajax.googleapis.com",
  "clients1.google.co.jp", "maps.google.com", "maps.gstatic.com", "www.google-analytics.com",
  "wiki.github.com"
]
$allowed_ctypes = ["image/jpeg", "image/gif", "image/png", nil]

def auth_twitter(puid)
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
    return hit.last.fetch('twitter_name', '!!empty!!')
  end
end

def regist_twitter(puid, twitter_name, user_icon)
  value = {'puid' => puid.to_s, 'twitter_name' => twitter_name.to_s, 'user_icon' => user_icon.to_s, 'accessed_at' => Time.now.to_i.to_s }
  rdb = RDBTBL::new
  rdb.open($settings["twitter"]["host"].to_s, $settings["twitter"]["port"].to_i)
  key = rdb.rnum + 1
  rdb.put(key, value)
  rdb.close
end

handler = Proc.new() {|req,res|
  puts ''
  path = req.unparsed_uri
  puid = "#{req.peeraddr[2]}:#{req.peeraddr[3]}:#{req.header['x-forwarded-for']}"
  puts Time.now.to_s

  # 特定のホストからのアクセスかどうかをチェック（会場内だったらtrue）
  # jsではstring 型の真偽は1文字以上あれば true、0文字の場合は false。（文字列"0"も true）
  #local_access = ''
  #if req.peeraddr[2] == 'pl440.nas93g.p-tokyo.nttpc.ne.jp'
  #  local_access = '1'
  #end

  unless twitter_name = auth_twitter(puid)
    unless $allowed_hosts.include?(req.host)
      puts "#{puid} at #{req.host.red}"
      unless $allowed_ctypes.include?(res.header["content-type"])
        puts "force redirect twitter login page".bold
        res.status = 302
        res.header["location"] = "http://twitter.com/login"
      end
    else
      puts "#{puid} as #{'anonymous '.red} at #{req.host.yellow.on_black}"
    end
  else
    puts "#{puid} as #{twitter_name.magenta.bold.on_blue} at #{req.host.green.on_black}"
  end


  #if bauth = req.header.fetch('authorization', false) and req.host == 'twitter.com'
  #  puts "twitter basic auth"
  #  twitter.comへのbasic認証だったらぶっこぬき
  #  auth = bauth.split(/\s/)
  #  puts auth.inspect
  #end


  case path
  when /^http:\/\/twitter\.com\/$/
    # twitterへのアクセスだったら
    body = res.body
    if res.header["content-encoding"] == "gzip"
      Zlib::GzipReader.wrap(StringIO.new(res.body)){|gz| body = gz.read}
      res.header.delete("content-encoding")
      res.header.delete("content-length")
    end
    utf_body = body.toutf8
    #utf_body.gsub!(/。/, 'にょ。')
    doc = Hpricot(utf_body)

    # twitter_nameとuser_iconを特定
    span_me_name = doc.search('span#me_name')
    div_user_icon = doc.search('img.side_thumb').first
    if span_me_name
      twitter_name = span_me_name.inner_html

      user_icon = ''
      user_icon = div_user_icon.attributes['src'] if div_user_icon

      unless twitter_name == ""
        # puidと、twitter_nameとimageを紐付け
        puts "regist #{puid} as #{twitter_name.red.bold}"
        puts "profile image is #{user_icon}"
        regist_twitter(puid, twitter_name, user_icon)
      end
    end

    # レスポンスのファイナライズ
    code = Kconv.guess(body)
    res.body = utf_body.kconv(code, Kconv::UTF8)

  when /^http:\/\/mobile\.twitter\.com\/$/
    body = res.body
    if res.header["content-encoding"] == "gzip"
      Zlib::GzipReader.wrap(StringIO.new(res.body)){|gz| body = gz.read}
      res.header.delete("content-encoding")
      res.header.delete("content-length")
    end

  when /\.(jpg|gif|png)/
    if req.header.has_key?('authorization') or req.header.has_key?('Authorization')
      # 画像だったらTTへ保存
      rdb = RDBTBL::new
      rdb.open($settings["tokyotyrant"]["host"].to_s, $settings["tokyotyrant"]["port"].to_i)
      qry = RDBQRY::new(rdb)
      qry.addcond("uri", RDBQRY::QCSTREQ, path)
      hit = qry.searchget
      if hit.size == 0
        # 初回投入
        value = {"uri" => path, "accessed_at" => Time.now.to_i.to_s, "count"=>"1", "puid" =>puid}
        key = rdb.rnum + 1
        rdb.put(key, value)
      else
        # 既出のURL。カウントアップ
        count = hit.last.fetch("count", "1").to_i+1
        value = {"uri" => path, "accessed_at" => Time.now.to_i.to_s, "count"=>count.to_s, "puid"=>puid}
        key = rdb.rnum + 1
        rdb.put(key, value)
      end
      rdb.close
    end
  end
  foo = File.open("tmp/proxy.log", 'a')
  foo.puts "resquest headers : "
  req.header.each{|k,v| foo.puts "#{k} : #{v}" }
  foo.puts "response headers : "
  res.header.each{|k,v| foo.puts "#{k} : #{v}" }
  foo.puts ""
  foo.close
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
