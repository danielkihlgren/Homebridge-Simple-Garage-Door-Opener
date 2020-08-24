'use strict';

const rpio = require('rpio');

var Service, Characteristic;

module.exports = (homebridge) => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory('homebridge-simple-garage-door-opener', 'SimpleGarageDoorOpener', SimpleGarageDoorOpener);
};

class SimpleGarageDoorOpener {
  constructor (log, config) {

    //get config values
    this.name = config['name'];
    this.doorSwitchPin = config['doorSwitchPin'] || 12;
    this.doorOpensInSeconds = config['doorOpensInSeconds'] || 15;

    //initial setup
    this.log = log;
    this.service = new Service.GarageDoorOpener(this.name, this.name);
    this.setupGarageDoorOpenerService(this.service);

    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, 'Simple Garage Door')
      .setCharacteristic(Characteristic.Model, 'A Remote Control')
      .setCharacteristic(Characteristic.SerialNumber, '0711');
  }

  getServices () {
    return [this.informationService, this.service];
  }

  setupGarageDoorOpenerService (service) {
    rpio.open(this.doorSwitchPin, rpio.OUTPUT, rpio.HIGH);

    this.service.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED);
    this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);

    service.getCharacteristic(Characteristic.TargetDoorState)
      .on('set', (value, callback) => {
        this.log('target.set: ' + value);
        if (value === Characteristic.TargetDoorState.OPEN) {
          switch (service.getCharacteristic(Characteristic.CurrentDoorState).value) {
            case Characteristic.CurrentDoorState.CLOSED:
              this.openGarageDoor(callback);
              callback();
              break;
            case Characteristic.CurrentDoorState.OPEN:
              this.log('should never occur that it tries to open when open');
              callback(new Error('Must wait until operation is finished'));
              break;
            default:
              callback(new Error('Must wait until operation is finished'));
              return;
          }
        } else if (value === Characteristic.TargetDoorState.CLOSED) {
          switch (service.getCharacteristic(Characteristic.CurrentDoorState).value) {
            case Characteristic.CurrentDoorState.CLOSED:
              this.log('should never occur that it tries to close when closed');
              callback(new Error('Must wait until operation is finished'));
              break;
            case Characteristic.CurrentDoorState.OPEN:
              this.closeGarageDoor(callback);
              callback();
              break;
            default:
              callback(new Error('Must wait until operation is finished'));
              return;
          }
        }
      });
  }

  openGarageDoor () {
    this.toggleDoor();

    this.log('Opening the garage door');
    this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPENING);
    setTimeout(() => {
      this.log('Opened the garage door');
      this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPEN);
    }, this.doorOpensInSeconds * 1000);
  }

  closeGarageDoor () {
    this.toggleDoor();

    this.log('Closing the garage door');
    this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSING);
    setTimeout(() => {
      this.log('Closed the garage door');
      this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);
    }, this.doorOpensInSeconds * 1000);
  }

  toggleDoor() {
    rpio.write(this.doorSwitchPin, rpio.LOW);
    rpio.sleep(0.5);
    rpio.write(this.doorSwitchPin, rpio.HIGH);
  }


}
