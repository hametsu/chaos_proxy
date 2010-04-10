
require 'rubygems'
require 'webrick'
require 'webrick/httpproxy'
require 'uri'


require 'tokyotyrant'
include TokyoTyrant


handler = Proc.new() {|req,res|
  path = req.unparsed_uri
  if path =~ /\.(jpg|gif|png)/
    value = {"uri" => path, "accessed_at" => Time.now.to_i.to_s}
    puts value.inspect

    rdb = RDBTBL::new
    if !rdb.open('localhost', 1978)
      ecode = rdb.ecode
      STDERR.printf("open error: %s\n", rdb.errmsg(ecode))
    end
    key = rdb.rnum+1
    if !rdb.put(key, value)
      ecode = rdb.ecode
      STDERR.printf("open error: %s\n", rdb.errmsg(ecode))
    end
    if !rdb.close
      ecode = rdb.ecode
      STDERR.printf("close error: %s\n", rdb.errmsg(ecode))
    end
  end
}

s = WEBrick::HTTPProxyServer.new(
  :Port => 3000,
  :ProxyVia => false,
  :ProxyContentHandler => handler
)


trap('INT') { s.shutdown }

s.start




