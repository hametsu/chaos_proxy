
require 'pcap'

class Capture
end

class ImageCapture < Capture
	def capture_data(interval)
		capdat = []
		i = 0
		pcaplet = Pcap::Capture.open_live("en1", 1460, true, 1000)
		access = Pcap::Filter.new('tcp and src port 80',pcaplet)
		pcaplet.setfilter(access)
		pcaplet.each_packet do |pkt|
			if pkt.tcp_data_len > 0 then
				p pkt.tcp_data
				# p pkt.methods.sort
				puts ""
				i += 1
			end
			break if i>interval
		end
		pcaplet.close
	end
end

if $0 == __FILE__ then
	ic = ImageCapture.new
	ic.capture_data(10)
end

