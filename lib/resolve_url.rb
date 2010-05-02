#! /usr/bin/env ruby

require 'open-uri'

module ShortenUrlResolve
	def resolve_shorten_url(url)
		iso = open(url, 'Method' => 'HEAD')
		return iso.base_uri.to_s
	end
	
	def resolve_tinyurl(url)
	end
	
	def resolve_bitly(url)
	end
end

if $0 == __FILE__ then
	include ShortenUrlResolve
	puts resolve_shorten_url('http://tinyurl.com/39jo54x')
	puts resolve_shorten_url('http://bit.ly/bZNHJb')
end

