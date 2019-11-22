# newlabsensor-pi
Prototype for the New Lab city garbage detection platform, based on the Raspberry Pi.

Created by Patrick Cleary for Quantize LLC (Superbright).

This set of software is designed as a prototype to test viability of a garbage detection network for use in New York City.

## Grove Sensor Connections
Grove sensors should be connected to the GrovePi board as follows:
- Sound Sensor (analog) -> `A1`
- PIR Sensor (digital) -> `D3`
- Button (digital) -> `D4`

## Raspberry Pi Network Config
The latest version of Debian/Raspbian (Stretch) continues with the recent trend of "predictable network interface names". This means that network interfaces show up as something _other_ than simply `eth0` or `eth4`. Read the following page for more information: https://www.freedesktop.org/wiki/Software/systemd/PredictableNetworkInterfaceNames/

A 4G LTE cellular network interface is used for this project, which necessitates setting *it*, instead of any other interface, as the default gateway for internet traffic. For simplicity, the autostart script uses legacy, "unpredictable network interface names" to make this change on boot. Because a simple Raspberry Pi is used, there should not be enough conflicting interfaces to cause any issues.

To enable legacy unpredictable names, use the following terminal command:
`ln -s /dev/null /etc/systemd/network/99-default.link`
