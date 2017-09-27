#! /bin/sh

# Newlab Sensor Auto-Start Script
#
# Built for Superbright(www.superbright.me) by Patrick Cleary
#
# TO DISABLE AUTO-START, simply rename this file to something else,
# such as "autostart.sh.bak"
#
# TO ENABLE AUTO-START, simply rename this file to "autostart.sh"
#
# This script is started with crontab (type "man crontab" in the
# terminal for more info). Edit the Raspberry Pi's crontab file
# with the terminal command "crontab -e".
#
# This script does a few things:
#
# 1) Configures the AT&T LTE IoT Shield, enumerated by default
# as interface "eth1", as the default route for all IP traffic. This
# ensures network connectivity for sensor data upload to AWS.
# NOTE: Alternative methods to doing this may include writing these
# lines into the "/etc/rc.local" file, or in the "sudo crontab -e"
# file. Neither have been tested with this test setup, however.
#
# 2) Mount a USB flash drive as an external storage medium for Motion
# image output. This is necessary when capturing every motion frame
# for raw data capture. For instructions on how to do this, read
# https://www.howtogeek.com/235655/how-to-mount-and-use-an-exfat-drive-on-linux/
#
# 3) Starts the Raspberry Pi camera image capture software, with the
# "motion" command, which takes photos of motion events and triggers
# their upload to AWS S3.
#
# 4) Starts the Newlab Sensor Platform prototype software, with the
# filename "app.js", which polls the attached Grove sensors and
# uploads the readings to AWS DynamoDB via MQTT.
# NOTE: The "node-startup" script was used for this, since calling a
# node app directly did not work. Instead, the app is started with
# "newlabsensor-pi start" and stopped with "newlabsensor-pi stop".
# See https://github.com/chovy/node-startup for info on how to
# edit this behavior.


# Allows the Linux system to boot before the shell script kicks in
sleep 20


# Task 1 (see above)
sudo ip route delete default dev eth0
sleep 2
sudo ip route add default dev eth1

# Task 2 (see above)
# Note that this particular flash drive appears as 'sda2'
sudo mount /dev/sda2 /media/motion

# Task 3 (see above)
motion -c /home/pi/newlabsensor-pi/motion/motion.conf


# Task 4 (see above)
# Remove the old PID, in case the Pi was not shut down properly
rm -f /home/pi/newlabsensor-pi/pid/*.pid
# Start the app
/etc/init.d/newlabsensor-pi-node-app start
