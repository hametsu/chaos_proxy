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
    # アクセス日時順でソート
    qry.setorder('accessed_at', RDBQRY::QONUMDESC)
    # 出力件数制限
    qry.setlimit(limit, offset)
    return qry.searchget
  end
end



get '/' do
  # 最新画像URL500件
  @elements = get_recents(50,0)
  erb :index
end



