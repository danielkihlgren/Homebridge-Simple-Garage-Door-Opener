'use strict';

const rpio = require('rpio');

var Service, Characteristic, CurrentDoorState, TargetDoorState;

module.exports = (homebridge) => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  CurrentDoorState = Characteristic.CurrentDoorState;
  TargetDoorState = Characteristic.TargetDoorState;

  homebridge.registerAccessory('homebridge-simple-garage-door-opener', 'SimpleGarageDoorOpener', SimpleGarageDoorOpener);
};

class SimpleGarageDoorOpener {
  constructor (log, config) {

    //get config values
    this.name = config['name'];
    this.doorSwitchPin = config['doorSwitchPin'] || 12;
    this.doorClosedSensor = config['doorClosedSensor']; // || 23;
    this.doorOpenSensor = config['doorOpenSensor']; // || 37;
    this.doorOpensInSeconds = config['doorOpensInSeconds'] || 15;
    this.sensorPollTimeInms = config['sensorPollTimeInms'] || 1000;

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
    if (this.doorClosedSensor) {
      rpio.open(this.doorClosedSensor, rpio.INPUT, rpio.PULL_UP);
    }
    if (this.doorOpenSensor) {
      rpio.open(this.doorOpenSensor, rpio.INPUT, rpio.PULL_UP);
    }
    this.currentDoorState = service.getCharacteristic(CurrentDoorState);
    this.targetDoorState = service.getCharacteristic(TargetDoorState);
    this.obstructionDetected = service.getCharacteristic(Characteristic.ObstructionDetected)

    this.setDoorStates(this.readDoorStateFromSensors())

    this.targetDoorState
      .on('set', (value, callback) => {
        if (value === TargetDoorState.OPEN) {
          this.log('target.set: OPEN');
          switch (this.currentDoorState.value) {
            case CurrentDoorState.CLOSED:
              this.log('Opening the garage door, triggered from HomeKit.');
              this.toggleDoor();
              this.openGarageDoor();
              callback();
              break;
            default:
              callback();
              return;
          }
        } else if (value === TargetDoorState.CLOSED) {
          this.log('target.set: CLOSED');
          switch (this.currentDoorState.value) {
            case CurrentDoorState.OPEN:
              this.log('Closing the garage door, triggered from HomeKit.');
              this.toggleDoor();
              this.closeGarageDoor();
              callback();
              break;
            default:
              callback();
              return;
          }
        }
      });

    if (this.doorOpenSensor || this.doorClosedSensor) {
      setInterval(this.updateDoorStatesFromSensors.bind(this), this.sensorPollTimeInms);
    }
  }

  setDoorStates(doorState) {
    this.currentDoorState.setValue(doorState);
    this.targetDoorState.setValue(doorState);
  }

  openGarageDoor () {
    this.currentDoorState.setValue(CurrentDoorState.OPENING);
    this.obstructionDetected.setValue(false);

    this.doorTimeout = setTimeout(() => {
      if (!this.doorOpenSensor) {
        this.log('Garage door is now assumed to be open since no open door sensor is present.');
        this.currentDoorState.setValue(CurrentDoorState.OPEN);
      } else {
        this.log('Garage door is identified to be stopped while opening since no open door sensor verified open state.');
        this.currentDoorState.setValue(CurrentDoorState.STOPPED);
        this.obstructionDetected.setValue(true);
      }
    }, this.doorOpensInSeconds * 1000);
  }

  closeGarageDoor () {
    this.currentDoorState.setValue(CurrentDoorState.CLOSING);
    this.obstructionDetected.setValue(false);

    this.doorTimeout = setTimeout(() => {
      if (!this.doorClosedSensor) {
        this.log('Garage door is now assumed to be closed since no close door sensor is present.');
        this.currentDoorState.setValue(CurrentDoorState.CLOSED);
      } else {
        this.log('Garage door is identified to be stopped while closing since no closed door sensor verified closed state.');
        this.currentDoorState.setValue(CurrentDoorState.STOPPED);
        this.obstructionDetected.setValue(true);
      }
    }, this.doorOpensInSeconds * 1000);
  }

  updateDoorStatesFromSensors() {
    if (this.doorOpenSensor && (rpio.read(this.doorOpenSensor) === rpio.LOW)) {
      if (this.currentDoorState.value !== CurrentDoorState.OPEN) {
        this.log('Sensor identified that garage door is open.');
        this.maybeClearDoorTimeout();
        this.currentDoorState.setValue(CurrentDoorState.OPEN);
        this.targetDoorState.setValue(TargetDoorState.OPEN);
        this.obstructionDetected.setValue(false);
      }
    } else if (this.doorClosedSensor && (rpio.read(this.doorClosedSensor) === rpio.LOW)) {
      if (this.currentDoorState.value !== CurrentDoorState.CLOSED) {
        this.log('Sensor identified that garage door is closed.');
        this.maybeClearDoorTimeout();
        this.currentDoorState.setValue(CurrentDoorState.CLOSED);
        this.targetDoorState.setValue(TargetDoorState.CLOSED);
        this.obstructionDetected.setValue(false);
      }
    } else if (this.doorClosedSensor && (this.currentDoorState.value === CurrentDoorState.CLOSED)) {
      if (this.targetDoorState.value !== TargetDoorState.OPEN) {
        this.log('Closed door sensor identified that garage door is opening.');
        this.openGarageDoor();
        this.targetDoorState.setValue(TargetDoorState.OPEN);
      }
    } else if (this.doorOpenSensor && (this.currentDoorState.value === CurrentDoorState.OPEN)) {
      if (this.targetDoorState.value !== TargetDoorState.CLOSED) {
        this.log('Open door sensor identified that garage door is closing.');
        this.closeGarageDoor();
        this.targetDoorState.setValue(TargetDoorState.CLOSED);
      }
    }
  }

  maybeClearDoorTimeout() {
    if (this.doorTimeout) {
      clearTimeout(this.doorTimeout);
      this.doorTimeout = undefined;
    }
  }

  readDoorStateFromSensors() {
    if (this.doorOpenSensor && (rpio.read(this.doorOpenSensor) === rpio.LOW)) {
      this.log('Initial door state is identified to be open by open door sensor.');
      return CurrentDoorState.OPEN;
    } else if (this.doorClosedSensor && (rpio.read(this.doorClosedSensor) === rpio.LOW)) {
      this.log('Initial door state is identified to be closed by closed door sensor.');
      return CurrentDoorState.CLOSED;
    } else if (this.doorOpenSensor && this.doorOpenSensor) {
      this.log('Initial door state is assumed to be stopped since no sensor could identify it\'s state.');
      return CurrentDoorState.STOPPED;
    } else if (this.doorClosedSensor) {
      this.log('Initial door state is assumed to be open since it was not identified to be closed by closed door sensor.');
      return CurrentDoorState.OPEN;
    } else {
      this.log('Initial door state is assumed to be closed since it was not identified to be open by open door sensor.');
      return CurrentDoorState.CLOSED;
    }
  }

  toggleDoor() {
    rpio.write(this.doorSwitchPin, rpio.LOW);
    rpio.sleep(0.5);
    rpio.write(this.doorSwitchPin, rpio.HIGH);
  }
}
