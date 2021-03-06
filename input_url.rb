require 'rubygems'
require 'uri'
require 'tokyotyrant'
include TokyoTyrant
require 'yaml'
settings = YAML.load_file("settings.yaml")

path = ARGV.shift
if path =~ /\.(jpg|gif|png)/
  rdb = RDBTBL::new
  unless rdb.open(settings["tokyotyrant"]["host"].to_s, settings["tokyotyrant"]["port"].to_i)
    ecode = rdb.ecode
    STDERR.printf("open error: %s\n", rdb.errmsg(ecode))
  end

  qry = RDBQRY::new(rdb)
  qry.addcond("uri", RDBQRY::QCSTREQ, path)
  hit = qry.searchget
  if hit.size == 0
    # 初回投入
    value = {"uri" => path, "accessed_at" => Time.now.to_i.to_s, "count"=> "0"}
    key = rdb.rnum + 1
    unless rdb.put(key, value)
    rdb.put(key, value)
      ecode = rdb.ecode
      STDERR.printf("open error: %s\n", rdb.errmsg(ecode))
    end
  else
    # 既出のURL。カウントアップ
    count = hit.fetch("count", "0").to_i + 1
    value = {"uri" => path, "accessed_at" => Time.now.to_i.to_s, "count"=>count.to_s}
    key = rdb.rnum + 1
    unless rdb.put(key, value)
      ecode = rdb.ecode
      STDERR.printf("open error: %s\n", rdb.errmsg(ecode))
    end
  end
  rdb.close
end

