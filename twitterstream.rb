require "rubygems"
require 'net/http'
require 'uri'
require 'json'
require 'drb/drb'
DRb.start_service
$ts = DRbObject.new_with_uri('druby://:12345')

require 'yaml'
$settings = YAML.load_file("settings.yaml")

uri = URI.parse('http://chirpstream.twitter.com/2b/user.json')
Net::HTTP.start(uri.host, uri.port) do |http|
  request = Net::HTTP::Get.new(uri.request_uri)
  request.basic_auth( $settings["twitter"]["username"].to_s, $settings["twitter"]["password"].to_s )
  http.request(request) do |response|
    raise 'Response is not chuncked' unless response.chunked?
    response.read_body do |chunk|
      # 空行は無視する = JSON形式でのパースに失敗したら次へ
      status = JSON.parse(chunk) rescue next
      # 削除通知など、'text'パラメータを含まないものは無視して次へ
      next unless status['text']
      $ts.write(['data', "hoge #{status['user']['screen_name']}: #{status['text']}"])
    end
  end
end


