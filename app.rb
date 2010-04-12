require 'rubygems'
require 'sinatra'
require 'erb'
require 'yaml'
require 'net/http'
require 'uri'
require 'tokyotyrant'
include TokyoTyrant

require 'glitch'

require "json/pure"

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
    puts unixtime
    qry.addcond("accessed_at", RDBQRY::QCNUMGT, unixtime.to_s) unless unixtime == 0
    # 出力件数制限
    qry.setlimit(limit, offset)
    return qry.searchget
  end
end



get '/' do
  # 最新画像URL500件
  @elements = get_recents(options.settings["app"]["recents_num"], 0, 0)
  erb :index
end

get '/update/:unixtime' do
  # unixtimeより新しい画像URLがあったらJSONで返す
  @elements = get_recents(10, 0, params[:unixtime])
  return @elements.to_json
end


get '/glitch/*' do
  url_path = request.fullpath.scan(/^\/glitch\/(https?:\/\/[-_.!~*'()a-zA-Z0-9;\/?:@&=+$,%#]*)$/).flatten!.first
  url = URI.parse(url_path)
  request = Net::HTTP::Get.new(url.path)
  response = Net::HTTP.start(url.host, url.port) do |http|
    http.request(request)
  end
  glitch = Glitch.new(response.body)
  glitch.break!
  content_type "image/jpeg"
  attachment "temp.jpg"
  glitch.break!
  return glitch.image
end
