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
  set :places, {
                'nanzuka' => 'pl440.nas93g.p-tokyo.nttpc.ne.jp',
                'mogra' => '',
                'linuxcafe' => '',
               }
end


helpers do

  def get_recents(limit, offset, unixtime)
    # 最新の画像URL一覧
    rdb = RDBTBL::new
    rdb.open(options.settings["tokyotyrant"]["host"].to_s, options.settings["tokyotyrant"]["port"].to_i)
    qry = RDBQRY::new(rdb)
    # アクセス日時順でソート
    qry.setorder('accessed_at', RDBQRY::QONUMDESC)
    # unixtimeよりも新しいエントリ
    qry.addcond("accessed_at", RDBQRY::QCNUMGT, unixtime.to_s) unless unixtime == 0
    qry.setlimit(limit, offset)
    return qry.searchget
  end

  def rank_by_accsess(limit, offset)
    # アクセス回数順でソート
    rdb = RDBTBL::new
    rdb.open(options.settings["tokyotyrant"]["host"].to_s, options.settings["tokyotyrant"]["port"].to_i)
    qry = RDBQRY::new(rdb)
    qry.setorder('count', RDBQRY::QONUMDESC)
    qry.setlimit(limit, offset)
    return qry.searchget
  end

  def get_users()
    # 最近proxyを利用したユーザー詳細一覧
    rdb = RDBTBL::new
    rdb.open(options.settings["twitter"]["host"].to_s, options.settings["twitter"]["port"].to_i)
    qry = RDBQRY::new(rdb)
    qry.setorder("accessed_at", RDBQRY::QONUMDESC)
    # 最近6時間以内限定にする？
    #unixtime = 
    #qry.addcond("accessed_at", RDBQRY::QCNUMGT, unixtime.to_s)
    qry.setlimit('500')
    users = qry.searchget
    # 重複を防ぐための配列
    twitter_name = []
    response = []
    # ログの重複を消す
    users.each do |user|
      unless twitter_name.include?(user['twitter_name'])
        twitter_name.push(user['twitter_name'])
        response.push(user)
      end
    end
    return response
  end

  def get_by_puid(puid)
    # puidからユーザー詳細情報を得る
    rdb = RDBTBL::new
    rdb.open(options.settings["twitter"]["host"].to_s, options.settings["twitter"]["port"].to_i)
    qry = RDBQRY::new(rdb)
    qry.setorder("accessed_at", RDBQRY::QONUMDESC)
    qry.addcond("puid", RDBQRY::QCSTREQ, puid.to_s)
    qry.setlimit(1)
    return qry.searchget.first
  end

  def recents_by_name(name)
    # twitter user nameでログを絞り込み
    puts name
    rdb_ = RDBTBL::new
    rdb_.open(options.settings["twitter"]["host"].to_s, options.settings["twitter"]["port"].to_i)
    qry_ = RDBQRY::new(rdb_)
    qry_.setorder("accessed_at", RDBQRY::QONUMDESC)
    qry_.addcond("twitter_name", RDBQRY::QCSTREQ, name.to_s)
    qry_.setlimit(1)
    user = qry_.searchget.first
    puts user.to_s

    rdb = RDBTBL::new
    rdb.open(options.settings["tokyotyrant"]["host"].to_s, options.settings["tokyotyrant"]["port"].to_i)
    qry = RDBQRY::new(rdb)
    qry.setorder("accessed_at", RDBQRY::QONUMDESC)
    # userのみ
    qry.addcond("puid", RDBQRY::QCSTREQ, user["puid"].to_s)
    #qry.addcond("accessed_at", RDBQRY::QCNUMGT, unixtime.to_s) unless unixtime == 0
    qry.setlimit(200)
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



# ------------------------ここからview--------------------------------




get '/log' do
  # for debug
  old = Time.now.to_i - 60*60*60*10
  @elements = get_recents(300, 0, old.to_s)
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



# -----------------------user関係--------------------------------

get '/users.json' do
  # 最近アクセスしたユーザー一覧
  headers 'Content-Type' => 'application/json', 'Access-Control-Allow-Origin' => '*'
  @elements = get_users()
  return @elements.to_json
end

get '/users' do
  # 最近アクセスしたユーザー一覧
  @elements = get_users()
  erb :users
end

get '/onthe/:place.json' do
  headers 'Content-Type' => 'application/json', 'Access-Control-Allow-Origin' => '*'
  elements = get_users()
  @elements = []
  elements.each do |user|
    @elements.push(user) if user['puid'].include?(options.places[params[:place]])
  end
  return @elements.to_json
end

get '/onthe/:place' do
  elements = get_users()
  @elements = []
  elements.each do |user|
    @elements.push(user) if user['puid'].include?(options.places[params[:place]])
  end
  erb :users
end



get '/user/:name' do
  # twitterユーザー名でアクセス画像絞り込み表示
  headers 'Content-Type' => 'application/json', 'Access-Control-Allow-Origin' => '*'
  @elements = recents_by_name(params[:name])
  erb :list
end

get '/whois/:puid' do
  # puidの詳細情報を表示
  headers 'Content-Type' => 'application/json', 'Access-Control-Allow-Origin' => '*'
  @elements = get_by_puid(params[:puid])
  return @elements.to_json
end

get '/icon/:puid' do
  # puidからtwitterアイコンへのリダイレクト
  headers 'Content-Type' => 'application/json', 'Access-Control-Allow-Origin' => '*'
  @elements = get_by_puid(params[:puid])
  user_icon = @elements.fetch('user_icon', 'http://s.twimg.com/a/1273278095/images/default_profile_4_normal.png')
  redirect user_icon
end










get '/counts' do
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






get '/imagine_breaker/' do
  @elements = get_recents(options.settings["app"]["recents_num"], 0, 0)
  erb :imagine_breaker
end

get '/imagine_breaker/json' do
  headers 'Content-Type' => 'application/json', 'Access-Control-Allow-Origin' => '*'
  @elements = get_recents(options.settings["app"]["recents_num"], 0, 0)
  return @elements.to_json
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

