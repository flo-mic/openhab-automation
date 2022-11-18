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
  controllerItem: "HUE_Controller_Command"
}

const requiredItems = {
  color:       { name: "color",       type: "ColorItem",  class: "Point_Control" },
  brightness:  { name: "brightness",  type: "DimmerItem", class: "Point_Control" },
};

class HueController extends EquipmentController {

  constructor() {
    super(config.controllerName);
    
    // Loading all devices
    this.devices = this.loadDevices().map(device => new HueEquipment(device));

    // load metadata settings
    this.devices.forEach(device => device.loadMetadataSettings(this));

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


  loadDevices() {
    let devices = items.getItems();
    return devices.filter(item => item.getMetadataValue("semantics") === config.semanticIdentifierString);
  }

  onColorChange(event) {
    // If device has paired devices adapt their light
    let device = this.getEquipmentByItem(event.itemName);
    device.pairedDevices.forEach(pairedDevice => pairedDevice.setColor(device.getColor()));
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
      case "pair":
        hueClient.getPairedDevice().addPairedDevice(hueClient.getLightBulb());
        break;
      case "unpair":
        this.devices.forEach(equipment => {
          equipment.removePairedDevice(hueClient.getLightBulb());
        });
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
    this.pairedDevices = new Array();
    this.loadItems(requiredItems);
  };

  loadMetadataSettings(controller) {
    // loading paired devices from item metadata
    let pairedDevices = this.getMetadataSettings(config.controllerMetadata, "pairedDevices");
    if(pairedDevices && Array.isArray(pairedDevices)) {
      pairedDevices.forEach(device => {
        this.pairedDevices.push(controller.getEquipment(device.name));
      });
    }
    return this;
  }

  addPairedDevice(device) {
    if(!this.pairedDevices.includes(device)) {
      logger.info(config.controllerName + " is synchronizing light bulb \"" + device.getLabel() + "\" with \"" + this.getLabel() + "\".");
      this.pairedDevices.push(device);
      this.setEquipmentSettings(config.controllerMetadata, this.pairedDevices, "pairedDevices");
      device.setColor(this.getColor());
    };
    return this;
  }

  removePairedDevice(device) {
    if(this.pairedDevices.includes(device)) {
      logger.info(config.controllerName + " is removing light bulb synchronization from \"" + device.getLabel() + "\" to \"" + this.getLabel() + "\".");
      let pairedDevices = this.pairedDevices.filter(pairedDevice => pairedDevice !== device);
      this.pairedDevices = pairedDevices;
      this.setEquipmentSettings(config.controllerMetadata, this.pairedDevices, "pairedDevices");
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
    return parseInt(this.items["brightness"].state);
  }

  setBrightness(value) {
    this.items["brightness"].sendCommand(parseInt(value));
    return this;
  }
}


var controller = null;
var controllerGroupItem = null;
var controllerItem = null;

scriptLoaded = function () {
  controllerGroupItem = addItem(config.controllerGroupItem, "Group", "Sonos Controller Group", undefined, config.controllerTags);
  controllerItem = addItem(config.controllerItem, "String", "Sonos Controller Command Item", new Array(controllerGroupItem.name), config.controllerTags);
  loadedDate = Date.now();
  controller = new HueController();
}

scriptUnloaded = function () {
  logger.info(config.controllerName + " unloaded.");
}

