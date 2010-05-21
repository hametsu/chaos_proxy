#! ruby -Ku
require 'rubygems'
require 'webrick'
require 'webrick/httpproxy'
require 'net/http'
require 'uri'
require 'tokyotyrant'
include TokyoTyrant
require 'hpricot'
require 'stringio'
require 'zlib'
require 'kconv'

require 'term/ansicolor'
class String
    include Term::ANSIColor
end
require 'yaml'
$settings = YAML.load_file("settings.yaml")
$allowed_hosts = [
  "twitter.com", "m.twitter.com", "mobile.twitter.com",
  "search.twitter.com", "api.twitter.com",
  "s.twimg.com", "a0.twimg.com", "a1.twimg.com", "a2.twimg.com", "a3.twimg.com", "widgets.twimg.com",
  "www.google.com", "www.google.co.jp", "ajax.googleapis.com",
  "clients1.google.co.jp", "maps.google.com", "maps.gstatic.com", "www.google-analytics.com",
  "wiki.github.com",
  "clife-stg.cerevo.com", "clife.cerevo.com",
  "www.ustream.tv", "rgw.ustream.tv"
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

def logging_image(path, puid)
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



handler = Proc.new() {|req,res|
  puts ''
  path = req.unparsed_uri
  puid = "#{req.peeraddr[2]}:#{req.peeraddr[3]}:#{req.header['x-forwarded-for']}"
  puts Time.now.to_s

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
    foo = File.open("/tmp/fs/proxy.log", 'w')
    foo.puts "#{puid} as #{twitter_name} at #{req.host}"
    foo.close
  end

  case path
  when /^http:\/\/twitter\.com\/$/
    # 通常ブラウザのTwitter認証
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
    # モバイル端末のTwitter認証
    body = res.body
    if res.header["content-encoding"] == "gzip"
      Zlib::GzipReader.wrap(StringIO.new(res.body)){|gz| body = gz.read}
      res.header.delete("content-encoding")
      res.header.delete("content-length")
    end

  when /\.(jpg|gif|png)/
    unless req.header.has_key?('authorization') or req.header.has_key?('Authorization')
      logging_image(path, puid)
    end
  end
=begin
  foo = File.open("tmp/proxy.log", 'a')
  foo.puts "resquest headers : "
  req.header.each{|k,v| foo.puts "#{k} : #{v}" }
  foo.puts "response headers : "
  res.header.each{|k,v| foo.puts "#{k} : #{v}" }
  foo.puts ""
  foo.close
=end
}









# Webrickのデータ逐次送信、ストリーミング対応のProxyクラスらしいで。
# http://d.hatena.ne.jp/ousttrue/20091118/1258539308
module WEBrick
  class HTTPResponse
    attr_accessor :stream_query

    def send_response(socket)
      begin
        if @stream_query
          send_stream(socket)
        else
          setup_header()
          send_header(socket)
          send_body(socket)
        end
      rescue Errno::EPIPE, Errno::ECONNRESET, Errno::ENOTCONN => ex
        @logger.debug(ex)
        @keep_alive = false
      rescue Exception => ex
        @logger.error(ex)
        @keep_alive = false
      end
    end

    def send_stream(socket)
      ::Net::HTTP.start(@request_uri.host, @request_uri.port, \
                @stream_query[:proxy][0], @stream_query[:proxy][1]) do |http|
        req = ::Net::HTTP::Get.new(@stream_query[:path], @stream_query[:header])
        http.request(req) do |tmp_res|
          @stream_query[:call_back].call self, tmp_res
          setup_header()
          send_header(socket)

          tmp_res.read_body do |chunk|
            socket << chunk
            self.body << chunk
          end
        end
                end
                        @stream_query[:stream][:after_call].call @stream_query[:req], self
    end
  end

  class StreamProxy < WEBrick::HTTPProxyServer

    def proxy_service(req, res)
      # Proxy Authentication
      proxy_auth(req, res)

      # Create Request-URI to send to the origin server
      uri  = req.request_uri
      path = uri.path.dup
      path << "?" << uri.query if uri.query

      # Choose header fields to transfer
      header = Hash.new
      choose_header(req, header)
      set_via(header)

      # select upstream proxy server
      if proxy = proxy_uri(req, res)
        proxy_host = proxy.host
        proxy_port = proxy.port
        if proxy.userinfo
          credentials = "Basic " + [proxy.userinfo].pack("m*")
          credentials.chomp!
          header['proxy-authorization'] = credentials
        end
      end

      response = nil
      begin
        http = Net::HTTP.new(uri.host, uri.port, proxy_host, proxy_port)
        http.start{
          if @config[:ProxyTimeout]
            ##################################   these issues are
            http.open_timeout = 30   # secs  #   necessary (maybe bacause
            http.read_timeout = 60   # secs  #   Ruby's bug, but why?)
            ##################################
          end
        case req.request_method
        when "GET"  then
          if uri.host.include?('nicovideo') or uri.host.include?('youtube')
            response = ::Net::HTTPResponse.new("1.1", "200", "OK")

            res.stream_query = {:req => req, :path => path, :header => header, \
              :proxy => [proxy_host, proxy_port], :stream => @streaming}

            res.stream_query[:call_back] = Proc.new do |webrick_res, net_res|
              webrick_res.status = net_res.code.to_i
              choose_header(net_res, webrick_res)
              set_cookie(net_res, webrick_res)
              set_via(webrick_res)
            end
          else
            response = http.get(path, header)
          end
        when "POST" then response = http.post(path, req.body || "", header)
        when "HEAD" then response = http.head(path, header)
        else
          raise HTTPStatus::MethodNotAllowed, "unsupported method `#{req.request_method}'."
        end
        }
      rescue => err
        logger.debug("#{err.class}: #{err.message}")
        raise HTTPStatus::ServiceUnavailable, err.message
      end

      res['proxy-connection'] = "close"
      res['connection'] = "close"

      res.status = response.code.to_i
      choose_header(response, res)
      set_cookie(response, res)
      set_via(res)
      res.body = response.body unless res.stream_query
      if handler = @config[:ProxyContentHandler]
        handler.call(req, res)
      end
    end
  end
end







config = {
  :Port => $settings["proxy"]["port"].to_i,
  :ProxyVia => false,
  #:ProxyURI => URI.parse('http://localhost:3128/'),
  :ProxyContentHandler => handler,
  :AccessLog => [['/dev/null', ''],],
  :Logger => WEBrick::Log::new("tmp/proxy.log", WEBrick::Log::FATAL)
}

stream_proxy = WEBrick::StreamProxy.new(config)
[:INT, :TERM].each { |signal| Signal.trap(signal){stream_proxy.shutdown} }
stream_proxy.start


