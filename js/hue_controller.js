load('/openhab/conf/automation/js/classes/equipment.js');
load('/openhab/conf/automation/js/helpers/items.js');
load('/openhab/conf/automation/js/helpers/timer.js');

let logger = log('HueController');

const config = {
  controllerGroupItem: "HUE_Controller",
  controllerTags: ["HUE Controller"],
  controllerMetadata: "HUEController",
  controllerName: "HUE Controller",
  semanticIdentifierString: "Equipment_Lightbulb",
  controllerItem: "HUE_Controller_Command",
}

const requiredItems = {
  color:              { name: "color",              type: "ColorItem",  class:    "Point_Control",  property: "Property_Light"             },
  brightness:         { name: "brightness",         type: "DimmerItem", class:    "Point_Control",  property: "Property_Light"             },
  colorTemperature:   { name: "colorTemperature",   type: "DimmerItem", class:    "Point_Control",  property: "Property_ColorTemperature"  },
  scenes:             { name: "scenes",             type: "StringItem", tags:     ["Scenes"],                                              },
  coordinator:        { name: "coordinator",        type: "StringItem", internal: true                                                     }
};

class HueController extends EquipmentController {

  constructor() {
    super(config.controllerName);
    
    // Loading all devices
    this.devices = this.loadDevices().map(device => new HueEquipment(device));

    // Identify item trigger event for rules
    var ruleTriggeringItems = new Array();
    ruleTriggeringItems.push(triggers.ItemCommandTrigger(config.controllerItem))
    this.devices.forEach(device => {
      if(device.items["color"]) {
        ruleTriggeringItems.push(triggers.ItemStateChangeTrigger(device.items["color"].name));
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
        if(event.newState && items.getItem(event.itemName).type === "ColorItem") {
          this.onColorChange(event);
        }
      }
    });

    logger.info(config.controllerName + " is ready.");
    cache.put("HUEController", this);
  }

  getCoordinator(device) {
    if(device.items["coordinator"].state === "NULL" || device.items["coordinator"].state === null) {
      return device;
    }
    return this.getEquipment(device.items["coordinator"].state);
  }

  getZoneMembers(device) {
    if(device.items["coordinator"].state === "NULL" || device.items["coordinator"].state === null) {
      return new Array(device);
    }
    return this.devices.filter(dev => dev.items["coordinator"].state === device.items["coordinator"].state);
  }

  loadDevices() {
    let devices = items.getItems();
    return devices.filter(item => item.getMetadataValue("semantics") === config.semanticIdentifierString);
  }

  onColorChange(event) {
    let device = this.getEquipmentByItem(event.itemName);
    let coordinator = this.getCoordinator(device)
    if(device.getId() === coordinator.getId()) {
      this.getZoneMembers(device).forEach(zone => {
        if(zone.getId() !== coordinator.getId()) {
          zone.setColor(coordinator.getColor());
        }
      })
    };
    if(device.getId() !== coordinator.getId()) {
      // prevent race condition due to unacurate HSB calculation of openhab
      var newColor = event.newState.split(",");
      var groupColor = coordinator.getColor().split(",");
      var requireUpdate = false;
      if(parseInt(newColor[0]) !== parseInt(groupColor[0]) && (parseInt(newColor[0])+ 1) !== parseInt(groupColor[0])) {
        requireUpdate = true;
      }
      if(parseInt(newColor[1]) !== parseInt(groupColor[1]) && (parseInt(newColor[1])+ 1) !== parseInt(groupColor[1])) {
        requireUpdate = true;
      }
      if(parseInt(newColor[2]) !== parseInt(groupColor[2])) {
        requireUpdate = true;
      }
      if(requireUpdate) {
        coordinator.setColor(device.getColor());
      }
    }
  }

  executeClientCommand(hueClient) {
    switch(hueClient.getCommand()) {
      case "off":
        hueClient.getLightBulb().setColor("OFF");
        break;
      case "on":
        hueClient.getLightBulb().setColor("ON");
        break;
      case "setColor":
        hueClient.getLightBulb().setColor(hueClient.getColor());
        break;
      case "setColorTransition":
        hueClient.getLightBulb().setColorTransition(hueClient.getColor(), hueClient.getTransitionTime(), hueClient.getTransitionSteps());
        break;
      case "setBrightness":
        hueClient.getLightBulb().setBrightness(hueClient.getBrightness());
        break;
      case "add":
        hueClient.getTargetDevice().add(this, hueClient.getLightBulb());
        break;
      case "remove":
        hueClient.getLightBulb().remove(this, hueClient.getTurnLightOff());
        break;
      default:
    } 
    if(hueClient.getTurnLightOff()) {
      hueClient.getLightBulb().setColor("OFF");
    }
  }
}

class HueEquipment extends Equipment {
  constructor(device) {
    super(device);
    this.loadItems(requiredItems, config.controllerTags);

    // If coordinator item is null set to itself
    if(this.items["coordinator"].state === "NULL" || this.items["coordinator"].state === null) {
      this.items["coordinator"].postUpdate(this.getId());
    }
  };

  add(controller, device) {
    let coordinator = controller.getCoordinator(this);
    if(coordinator !== controller.getCoordinator(device)) {
      logger.info(config.controllerName + " is synchronizing light bulb \"" + device.getLabel() + "\" with zone coordinator \"" + coordinator.getLabel() + "\".");
      device.items["coordinator"].postUpdate(coordinator.getId());
      device.setColor(coordinator.getColor());
    };
    return this;
  }

  remove(controller, turnLightOff) {
    if(controller.getCoordinator(this) === this && controller.getZoneMembers(this).length > 1) {
      var newCoordinator = null;
      controller.getZoneMembers(this).forEach(zone => {
        if(zone.getId() !== this.getId()) {
          if(!newCoordinator) {
            newCoordinator = zone.getId();
            logger.info(config.controllerName + " is switching coordinator to \"" + newCoordinator.getLabel() + "\" and removing \"" + this.getLabel() + "\" from zone.");
          }
          zone.items["coordinator"].postUpdate(newCoordinator);
        }
      })
    } 
    else if(controller.getCoordinator(this) !== this) {
      logger.info(config.controllerName + " is removing light bulb \"" + this.getLabel() + "\" from grouped zone \"" + controller.getCoordinator(this).getLabel() + "\".");
      this.items["coordinator"].postUpdate(this.getId());
    }
    if(turnLightOff) {
      this.setColor("OFF");
    }
    return this;
  }

  getColor() {
    return this.items["color"].state;
  }

  setColor(color) {
    this.items["color"].sendCommand(color);
    return this;
  }

  setColorTransition(color, time, steps) {
    if(this.colorTransitionSettings) {
      cancelTimer(this.id + "_setColorTransition")
    }
      
    this.colorTransitionSettings = {
      steps: parseInt(steps),
      time: parseInt(time) / parseInt(steps),  
      color: color.split(",")
    }

    logger.info(config.controllerName + " is starting color transition for \"" + this.getLabel() + "\".");
    this.startColorTransition(this);
    return this;
  }


  startColorTransition(device) {
    if(device.colorTransitionSettings.steps > 0) {
      device.colorTransitionSettings.steps = device.colorTransitionSettings.steps - 1;
      // Function generator to pass variables to time outside of this context (variables need to be resolved already now)
      var execFunction = function(device) {
        return function() {
          let set = device.colorTransitionSettings;
          let color = device.getColor().split(",");
          let hue = parseInt((parseInt(set.color[0]) - parseInt(color[0])) / (set.steps + 1) + parseInt(color[0]));
          let saturation = parseInt((parseInt(set.color[1]) - parseInt(color[1])) / (set.steps + 1) + parseInt(color[1]));
          let brightness = parseInt((parseInt(set.color[2]) - parseInt(color[2])) / (set.steps + 1) + parseInt(color[2]));
          device.setColor(hue + "," + saturation + "," + brightness);
          if(device.getBrightness() !== brightness) {
            device.setBrightness(brightness);
          }
          device.startColorTransition(device);
        }
      }
      addTimer(device.getId() + "_setColorTransition", execFunction(device), device.colorTransitionSettings.time);
    } else {
      device.colorTransitionSettings = null;
    }
  }

  getBrightness() {
    if(this.items["brightness"]) {
      return parseInt(this.items["brightness"].state);
    }
    else {
      return parseInt(this.items["color"].state.split(",")[2])
    }
  }

  setBrightness(value) {
    if(parseInt(value) < 0) {
      value = 0;
    }
    if(parseInt(value) > 100) {
      value = 100;
    }
    if(this.items["brightness"]) {
      this.items["brightness"].sendCommand(parseInt(value));
    }
    else {
      this.items["color"].sendCommand(parseInt(value));
    }
    return this;
  }
}


var controller = null;
var controllerGroupItem = null;
var controllerItem = null;

scriptLoaded = function () {
  controllerGroupItem = addItem(config.controllerGroupItem, "Group", "HUE Controller Group", undefined, config.controllerTags);
  controllerItem = addItem(config.controllerItem, "String", "HUE Controller Command Item", new Array(controllerGroupItem.name), config.controllerTags);
  loadedDate = Date.now();
  controller = new HueController();
}

scriptUnloaded = function () {
  logger.info(config.controllerName + " unloaded.");
}

