require 'rubygems'
require 'sinatra'
require 'erb'
require 'yaml'
require 'net/http'
require 'uri'
require 'tokyotyrant'
include TokyoTyrant

require 'glitch'
require 'wave'

require 'json/pure'

require 'open-uri'
require 'digest/md5'

configure do
  set :settings, YAML.load_file("settings.yaml")
end


helpers do
  def get_recents(limit, offset, unixtime)
    rdb = RDBTBL::new
    rdb.open(options.settings["tokyotyrant"]["host"].to_s, options.settings["tokyotyrant"]["port"].to_i)
    qry = RDBQRY::new(rdb)
    # アクセス日時順でソート
    qry.setorder('accessed_at', RDBQRY::QONUMDESC)
    # unixtimeよりも新しいエントリ
    qry.addcond("accessed_at", RDBQRY::QCNUMGT, unixtime.to_s) unless unixtime == 0
    # 出力件数制限
    qry.setlimit(limit, offset)
    return qry.searchget
  end

  def rank_by_accsess(limit, offset)
    rdb = RDBTBL::new
    rdb.open(options.settings["tokyotyrant"]["host"].to_s, options.settings["tokyotyrant"]["port"].to_i)
    qry = RDBQRY::new(rdb)
    # アクセス回数順でソート
    qry.setorder('count', RDBQRY::QONUMDESC)
    # 出力件数制限
    qry.setlimit(limit, offset)
    return qry.searchget
  end

  def open_with_cache(url)
    # urlのMD5ハッシュ
    hash = Digest::MD5.new.update(uri).to_s
    filepath = "tmp/cache/img_" + hash
    # ファイルが存在するかどうかをチェック
    if File.exist?(filepath)
      # あったらファイルを返す
      content = open(filepath)
      #cache_elapse = Time.now - File::mtime(filepath)
      #File.delete(filepath) if cache_elapse > 60*60
    else
      # なかったら取得・保存して返す
      # 二回http requestしているので若干非効率的？
      # stringioとか使えば一回に減らせるかも
      open(uri) do |i|
        open(filepath, "w"){|o| o.write(i.read)}
      end
      content = open(uri)
    end
    return content
    # そもそもこの段階(ログ閲覧時)でファイルを取得しにいくのが遅くて、
    # proxy.rbで最初のurlアクセスがあったとき(ログ記録時)にこれをやったほうがいいのかも
    # TODO:膨大なファイルが1ディレクトリに蓄積されるのを回避する
  end
end



get '/' do
  # 最新画像URL
  @elements = get_recents(options.settings["app"]["recents_num"], 0, 0)
  erb :index
end




get '/update/:unixtime' do
  limit = @params.fetch("limit", "10").to_i
  limit = 100 if limit > 100
  headers 'Content-Type' => 'application/json', 'Access-Control-Allow-Origin' => '*'
  # unixtimeより新しい画像URLがあったらJSONで返す
  @elements = get_recents(limit, 0, params[:unixtime])
  return @elements.to_json
end


get '/clear' do
  # TODO: TTの中身をすべて削除する
  redirect '/'
end


get '/imagine_breaker/' do
  @elements = get_recents(options.settings["app"]["recents_num"], 0, 0)
  erb :imagine_breaker
end



get '/counts/' do
  hashies = rank_by_accsess(3000, 0)
  # 重複する画像URIをカウントしない
  @elements = []
  uris = []
  hashies.each do |hash|
    uri = hash['uri']
    unless uris.index(uri)
      @elements.push(hash)
      uris.push(uri)
    end
  end
  erb :index
end


get '/glitch/' do
  @elements = get_recents(options.settings["app"]["recents_num"], 0, 0)
  erb :glitch
end

get '/imagine_breaker/*' do
  url_path = request.fullpath.scan(/^\/imagine_breaker\/(https?:\/\/[-_.!~*'()a-zA-Z0-9;\/?:@&=+$,%#]*)$/).flatten!.first
  url = URI.parse(url_path)
  request = Net::HTTP::Get.new(url.path)
  response = Net::HTTP.start(url.host, url.port) do |http|
    http.request(request)
  end
  if rand(2) == 0
    imagine_breaker = Glitch.new(response.body)
  else
    imagine_breaker = Wave.new(response.body)
  end
  imagine_breaker.break!
  content_type "image/jpeg"
  attachment "temp.jpg"
  imagine_breaker.break!
  return imagine_breaker.image
end

get '/wave/*' do
  url_path = request.fullpath.scan(/^\/wave\/(https?:\/\/[-_.!~*'()a-zA-Z0-9;\/?:@&=+$,%#]*)$/).flatten!.first
  url = URI.parse(url_path)
  request = Net::HTTP::Get.new(url.path)
  response = Net::HTTP.start(url.host, url.port) do |http|
    http.request(request)
  end
  imagine_breaker = Wave.new(response.body)
  imagine_breaker.break!
  content_type "image/jpeg"
  attachment "temp.jpg"
  imagine_breaker.break!
  return imagine_breaker.image
end

get '/glitch/*' do
  url_path = request.fullpath.scan(/^\/glitch\/(https?:\/\/[-_.!~*'()a-zA-Z0-9;\/?:@&=+$,%#]*)$/).flatten!.first
  url = URI.parse(url_path)
  request = Net::HTTP::Get.new(url.path)
  response = Net::HTTP.start(url.host, url.port) do |http|
    http.request(request)
  end
  imagine_breaker = Glitch.new(response.body)
  imagine_breaker.break!
  content_type "image/jpeg"
  attachment "temp.jpg"
  imagine_breaker.break!
  return imagine_breaker.image
end

