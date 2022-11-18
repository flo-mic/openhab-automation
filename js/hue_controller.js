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
        if(event.newState && tems.getItem(event.itemName).type === "ColorItem") {
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
      case "setColorTransition" && hueClient.getTransitionTime() && hueClient.getTransitionInterval():
        hueClient.getLightBulb().setColorTransition(hueClient.getColor(), hueClient.getTransitionTime(), hueClient.getTransitionInterval());
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

    // loading paired devices from item metadata
    if(this.items["color"]) {
      let pairedDevices = JSON.parse(this.items["color"].getMetadataValue(config.controllerMetadata));
      if(Array.isArray(pairedDevices)) {
        this.pairedDevices = pairedDevices;
      };
    }
  };

  getPairedDevices() {
    return this.pairedDevices;
  }

  addPairedDevice(device) {
    if(!this.pairedDevices.includes(device)) {
      logger.info(config.controllerName + " is synchronizing light bulb \"" + device.getLabel() + "\" with \"" + this.getLabel() + "\".");
      this.pairedDevices.push(device);
      this.items["color"].updateMetadataValue(config.controllerMetadata, JSON.stringify(this.pairedDevices));
      device.setColor(this.getColor());
    };
    return this;
  }

  removePairedDevice(device) {
    if(this.pairedDevices.includes(device)) {
      logger.info(config.controllerName + " is removing light bulb synchronization from \"" + device.getLabel() + "\" to \"" + this.getLabel() + "\".");
      let pairedDevices = this.getPairedDevices().filter(pairedDevice => pairedDevice !== device);
      this.pairedDevices = pairedDevices;
      this.items["color"].updateMetadataValue(config.controllerMetadata, JSON.stringify(this.pairedDevices));
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

  setColorTransition(color, time, interval) {
    if(this.colorTransitionSettings) {
      cancelTimer(this.id + "_setColorTransition")
    }

      
    let executions = time / interval;
    this.colorTransitionSettings = {
      executions: executions,
      interval: time * interval,  
      addHue: (this.getColor().split(",")[0] - color.split(",")[0]) / executions,
      addSaturation: (this.getColor().split(",")[1] - color.split(",")[1]) / executions,
      addBrightness: (this.getColor().split(",")[2] - color.split(",")[2]) / executions
    }

    logger.info(config.controllerName + " is starting color transition for \"" + this.getLabel() + "\".");
    this.startColorTransition();
    return this;
  }

  startColorTransition() {
    if(this.colorTransitionSettings.executions > 0) {
      this.colorTransitionSettings.executions = this.colorTransitionSettings.executions - 1;
      addTimer(this.id + "_setColorTransition", function() {      
        cancelTimer(this.id + "_setColorTransition")
        hue = this.getColor().split(",")[0] + this.colorTransitionSettings.addHue;
        saturation = this.getColor().split(",")[1] + this.colorTransitionSettings.addSaturation;
        brightness = this.getColor().split(",")[2] + this.colorTransitionSettings.addBrightness;
        this.setColor(hue + "," + saturation + "," + brightness)
        this.startColorTransition();
      }, this.colorTransitionSettings.interval);
    } else {
      this.colorTransitionSettings = null;
    }
  }

  getBrightness() {
    return this.items["brightness"].state;
  }

  setBrightness(value) {
    this.items["brightness"].sendCommand(value);
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

