#!/bin/sh
IF=eth2
#upstream
#ifconfig eth2 up
sudo ifconfig $IF 192.168.0.1
#iptables -t nat -A PREROUTING -i eth0 -p tcp -m tcp --dport 80 -j REDIRECT --to-ports 3128
sudo iptables -t nat -A PREROUTING -i $IF -p tcp -m tcp --dport 80 -j REDIRECT --to-ports 3128
#downstream
#iptables -t nat -A PREROUTING -i eth2 -p tcp -m tcp --dport 80 -j DNAT --to-destination 192.168.32.1:3128

