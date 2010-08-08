#!/bin/sh
#upstream
ifconfig eth2 up
ifconfig eth2 192.168.32.1
#iptables -t nat -A PREROUTING -i eth0 -p tcp -m tcp --dport 80 -j REDIRECT --to-ports 3128
iptables -t nat -A PREROUTING -i eth2 -p tcp -m tcp --dport 80 -j REDIRECT --to-ports 3128
#downstream
#iptables -t nat -A PREROUTING -i eth2 -p tcp -m tcp --dport 80 -j DNAT --to-destination 192.168.32.1:3128

