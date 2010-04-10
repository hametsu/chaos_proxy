require 'rubygems'
require 'sinatra'
require 'erb'
require 'tokyotyrant'
include TokyoTyrant



helpers do
  def get_recents(limit, offset)
    rdb = RDBTBL::new
    rdb.open('localhost', 1978)
    qry = RDBQRY::new(rdb)
    qry.setorder('accessed_at', RDBQRY::QONUMDESC)
    qry.setlimit(limit, offset)
    return qry.searchget
  end
end



get '/' do
  @elements = get_recents(500,0)
  results = []
  @elements.each do |e|
    #e.each_pair{|key, value|results.push "<b>#{key.to_s}</b>: #{value.to_s}<br />"}
    results.push "<img src=#{e['uri']} style='max-height:200px;'/>"
  end
  results.join("")
end



