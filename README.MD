# Simple Garage Door Opener

[![npm version](https://badge.fury.io/js/homebridge-simple-garage-door-opener.svg)](https://badge.fury.io/js/homebridge-simple-garage-door-opener)

A Homebridge Plugin for controlling your garage door via your iOS device.

Being frustrated about the lack of homekit-enabled garage door openers which don't need any modifications on the garage door itself.
Oh and it's pretty cheap too.

The setup is pretty straight forward. All you need is a raspberry pi running [homebridge](https://github.com/nfarina/homebridge), a relay and a garage door that can be controlled by connecting a zero potential relay. Most garage doors that are motorised will work. Connect a relay to garage door motor and controll it from one of the raspberry pi gpio pins. That's it.
It also supports the use of door sensors if one wants the HomeKit state to be updated when garage door is controlled from other place than HomeKit.

### Getting Started

#### Install via npm (>= v6.x.x)
`npm install homebridge-simple-garage-door-opener -g`


#### Install Manually
Clone the latest release. Install via `npm -i -g`.


#### Edit the ./homebridge/config.json
You don't need that much to get started. Just tell Simple Garage Door Opener which GPIO you want to use and you're good to go. (More options available)

```
"accessories": [{
        "accessory": "SimpleGarageDoorOpener",
        "name": "Garage door",
        "doorSwitchPin": 12,
        "doorOpensInSeconds": 15,
        "doorClosedSensor": 23,
        "doorOpenSensor":  37
        "sensorPollTimeInms": 1000
    }]
```

        doorSwitchPin: specifies the GPIO pin which controlls the garage door. Defaults to 12. Required.
        doorOpensInSeconds: the time it takes for door to fully open/close. Defaults to 15. Required.
        doorClosedSensor: specifies the GPIO pin for the sensor that identifies if garage door is closed. Optional. Just leave out if not using sensor.
        doorOpenSensor: specifies the GPIO pin for the sensor that identifies if garage door is open. Optional. Just leave out if not using sensor.
        sensorPollTimeInms: poll time (ms) for sensors. Defaults to 1000. Required if using sensors, otherwise not required.


#### Misc
Feel free to give me feedback, create PRs or submit issues, enhancements and bugs.
