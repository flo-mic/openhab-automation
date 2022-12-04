load('/openhab/conf/automation/js/classes/model.js');
load('/openhab/conf/automation/js/helpers/items.js');
load('/openhab/conf/automation/js/helpers/timer.js');

let logger = log('HeatingController');

const config = {
  controllerTags: ["Heating Controller"],
  controllerMetadata: "HeatingController",
  controllerName: "Heating Controller",
  semanticIdentifierString: "Equipment_RadiatorControl",
  semanticWindowIdentifierString: "Equipment_Window"
}

const configHeating = {
  windowOpenTemperature: 12,
  boostModeTemperature: 25,
  boostModeTimeSeconds: 300,
  refreshIntervalSeconds: 60,
  weekdayLabels: [ "Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag" ],
  modeItemMetadata: {
    commandDescription: {
      commandOptions: [
        { command: "Auto",   label: "Auto" },
        { command: "Manual", label: "Manuell" },
        { command: "Boost",  label: "Boost" }
      ]
    }
  }
}

const requiredItems = {
  temperature:    { name: "temperature",    type: "NumberItem",  class:    "Point_Measurement",   property: "Property_Temperature" },
  setTemperature: { name: "setTemperature", type: "NumberItem",  class:    "Point_Setpoint",      property: "Property_Temperature" },
  schedule:       { name: "schedule",       type: "StringItem",  internal: true                                                    },
  mode:           { name: "mode",           type: "StringItem",  internal: true,                                                   }
};

const requiredWindowItems = {
  contact:        { name: "contact",        type: "ContactItem", class: "Point_Status_OpenState", property: "Property_Opening"      }
};

// Function generator to pass variables to time outside of this context (variables need to be resolved already now)
var autoTimerFunction = function(controller) {
  return function() {
    let now = new Date();
    let earliest = new Date( now.getTime() - 1000 * 60 );
    this.devices.forEach(device => {
      let lastTime = device.getLastSchedulesTime();
      if(lastTime >= earliest && lastTime <= now) {
        if(device.regularMode === "Auto") {
          device.targetTemperature = device.getScheduledTemperature();
        }
        if(device.getMode() === "Auto" && !this.windowsOpenInLocation(equipment.getLocation())) {
          device.setTemperature(device.targetTemperature);
        }
      }
    });
    controller.scheduleNextExecution();
  }
}

// Function generator to pass variables to time outside of this context (variables need to be resolved already now)
var boostTimerFunction = function(device) {
  return function() {
    device.setMode(device.regularMode);
    device.setTemperature(device.targetTemperature);
  }
}

class HeatingController extends EquipmentController {

  constructor() {
    super(config.controllerName);
    this.locations = {};
    this.timerIdx = config.controllerName + "_scheduledTimerIdx";

    // Loading all devices
    this.devices = this.loadDevices(config.semanticIdentifierString).map(device => new RadiatorEquipment(device));
    this.windows = this.loadDevices(config.semanticWindowIdentifierString).map(device => new WindowEquipment(device));

    // Build location structure
    this.devices.forEach(device => {
      if(!this.locations[device.getLocation().getName()]) {
        this.locations[device.getLocation().getName()] = {
          radiators: this.devices.filter(dev => dev.getLocation() === device.getLocation()),
          windows: this.devices.filter(dev => dev.getLocation() === device.getLocation())
        }
      }
    })

    // Identify item trigger event for rules
    var ruleTriggeringItems = new Array();
    this.devices.forEach(device => {
      ruleTriggeringItems.push(triggers.ItemStateChangeTrigger(device.items["schedule"].getId()));
      ruleTriggeringItems.push(triggers.ItemCommandTrigger(device.items["mode"].getId()));
    });
    this.windows.forEach(window => {
      if(window.items["contact"]) {
        ruleTriggeringItems.push(triggers.ItemStateChangeTrigger(window.items["contact"].getId()));
      }
    });

    // Add controller rule
    rules.JSRule({
      name: config.controllerName + " Control",
      id: config.controllerItem,
      tags: config.controllerTags,
      description: "Executes " + config.controllerName + " commands.",
      triggers: ruleTriggeringItems,
      execute: event => {
        const equipment = this.getEventEquipment(event.itemName);
        if(event.receivedCommand) {
          this.onModeChange(equipment, event.receivedCommand);
        } else {
          if(typeof equipment === "Radiator") {
            this.scheduleNextExecution();
          }
          if(typeof equipment === "Window") {
            this.onWindowStateChange(equipment);
          }
        }
      }
    });

    logger.info(config.controllerName + " is ready.");
    this.scheduleNextExecution();
    cache.put("HeatingController", this);
  }

  onModeChange(equipment, mode) {
    cancelTimer(equipment.boostTimerIdx);
    if(mode === "Auto") {
      equipment.regularMode = mode;
      let temperature = equipment.getScheduledTemperature();
      equipment.targetTemperature = temperature;
      if(!this.windowsOpenInLocation(equipment.getLocation())) {
        equipment.setTemperature(temperature);
      }
    }
    if(mode === "Manuell") {
      equipment.regularMode = mode;
    }
    if(mode === "Boost") {
      equipment.targetTemperature = equipment.getSetTemperature();
      logger.info("Starting heating \"Boost\" mode \"" + equipment.getLabel() + "\".");
      equipment.setTemperature(config.configHeating.boostModeTemperature);
      addTimer(equipment.boostTimerIdx, boostTimerFunction(equipment), configHeating.boostModeTimeSeconds);
    }

  }

  onWindowStateChange(equipment) {
    const radiators = this.devices.filter(device => device.getLocation() === equipment.getLocation());
    if(this.windowsOpenInLocation(equipment.getLocation())) {
      radiators.forEach(radiator => {
        radiator.targetTemperature = radiator.getTemperature();
        radiator.setTemperature(configHeating.windowOpenTemperature);
      });
    } else {
      radiators.forEach(radiator => {
        if(radiator.getMode() === "Boost") {
          radiator.setTemperature(configHeating.boostModeTemperature);
        } else {
          radiator.setTemperature(radiator.targetTemperature);
        }
      });
    }
  }

  loadDevices(identifier) {
    let devices = items.getItems();
    return devices.filter(item => item.getMetadataValue("semantics") === identifier);
  }

  getEventEquipment(eventItem) {
    let equipment = null
    this.devices.forEach(device => {
      if(device.hasChild(eventItem)) {
        equipment = device;
      }
    });
    this.window.forEach(window => {
      if(window.hasChild(eventItem)) {
        equipment = window;
      }
    });
    return equipment;
  }

  scheduleNextExecution() {
    let nextTime = null;
    let now = new Date();
    this.devices.forEach(device => {
      let time = device.getNextScheduledTime();
      if(time > now) {
        if(!nextTime) {
          nextTime = time;
        }
        if(nextTime > time) {
          nextTime = time;
        }
      }
    });
    if(!nextTime) {
      logger.error("No execution times found for heating schedule!");
    } else {
      let delay = Number.parseInt((nextTime.getTime() - now.getTime())/1000);
      logger.info("Scheduling next heating update for \"" + nextTime.toLocaleString() + "\".");
      addTimer(this.timerIdx, autoTimerFunction(this), delay);
    }
    this.nextExecutionTime = nextTime;
  }

  windowsOpenInLocation(location) {
    let windowsClosed = true;
    this.windows.forEach(window => {
      if(window.getLocation() === location) {
        if(window.isOpen()) {
          windowsClosed = false;
        }
      }
    });
    return windowsClosed;
  }
}

class RadiatorEquipment extends Equipment {
  constructor(device) {
    super(device);
    this.loadItems(requiredItems, config.controllerTags);
    
    this.targetTemperature = this.getSetTemperature();
    this.regularMode = this.getMode() ? this.getMode() : "Auto";
    this.boostTimerIdx = this.getId() + "_boostTimerIdx";

    logger.info("New equipment \""+this.label+"\" initiated.");

    // load empty heating schedule for new danymic items
    let schedule = this.items["schedule"].getState();
    if(!schedule) {
      schedule = new Array();
      configHeating.weekdayLabels.forEach(weekday => {
        schedule.push({
          day: weekday,
          times: [{
            time: "00:00",
            value: "17.5"
          }]
        });
      });
      this.items["schedule"].postUpdate(JSON.stringify(schedule)); 
    }
  }

  getMode() {
    return this.items["mode"].getState()
  }

  setMode(mode) {
    return this.items["mode"].postUpdate(mode)
  }

  getTemperature() {
    return this.items["temperature"].getState()
  }

  getSetTemperature() {
    return this.items["setTemperature"].getState()
  }

  setTemperature(value) {
    if(this.getSetTemperature() !== value) {
      logger.info("Updating Temperature of \"" + this.getLabel() + "\" to \"" + value + "\".");
      this.items["setTemperature"].sendCommand(value);
    }
    return this
  }

  getWeekDayName() {
    let now = new Date();
    return configHeating.weekdayLabels[now.getDay()].label;
  }

  // This will add each schedule as next and previous time and returns a date transformed object
  calculateSchedules() {
    let schedules = JSON.parse(this.items["schedule"].getState());
    let repeated = 0;
    while(repeated < 7) {
      repeated = repeated + 1;
      schedules.forEach(schedule => {
        schedule.times.forEach(obj => {
          if(typeof obj.time === "string") {
            let time = new Date();
            time = new Date(time.setHours(obj.time.split(":")[0]));
            time = new Date(time.setMinutes(obj.time.split(":")[1]));
            time = new Date(time.setSeconds(0));
            let nextTime = time;
            nextTime = new Date(nextTime.setDate(nextTime.getDate() + repeated));
            let previousTime = time;
            previousTime = new Date(previousTime.setDate(previousTime.getDate() - repeated));
            obj.time = nextTime
            schedule.times.push({ time: previousTime, value: obj.value });
          }
        });
      });
    }
    return schedules;
  }

  getScheduledTemperature() {
    let schedules = this.calculateSchedules()
    let temperature = null;
    let lastTime = null;
    let now = new Date();
    schedules.forEach(schedule => {
      schedule.times.forEach(obj => {
        if(obj.time <= now) {
          if(!lastTime || lastTime < obj.time) {
            lastTime = obj.time;
            temperature = obj.value;
          }
        }
      });
    });
    return temperature;
  }

  getNextScheduledTime() {
    let schedules = this.calculateSchedules()
    let nextTime = null;
    let now = new Date();
    schedules.forEach(schedule => {
      schedule.times.forEach(obj => {
        if(obj.time > now) {
          if(!nextTime || nextTime > obj.time) {
            nextTime = obj.time;
          }
        }
      });
    });
    return nextTime;
  }

  getLastScheduledTime() {
    let schedules = this.calculateSchedules()
    let lastTime = null;
    let now = new Date();
    schedules.forEach(schedule => {
      schedule.times.forEach(obj => {
        if(obj.time <= now) {
          if(!lastTime || lastTime < obj.time) {
            lastTime = obj.time;
          }
        }
      });
    });
    return lastTime;
  }
}

class WindowEquipment extends Equipment {
  constructor(device) {
    super(device);
    this.loadItems(requiredWindowItems, config.controllerTags);
  };

  getState() {
    return this.items["contact"].getState()
  }

  isOpen() {
    if(this.getState() === "OPEN") {
      return true;
    }
    return false;
  }
}



var controller = null;

scriptLoaded = function () {
  loadedDate = Date.now();
  controller = new HeatingController();
}

scriptUnloaded = function () {
  logger.info(config.controllerName + " unloaded.");
}

