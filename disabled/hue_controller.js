load('/openhab/conf/automation/js/classes/equipment.js');
load('/openhab/conf/automation/js/helpers/items.js');

let logger = log('HueController');

const config = {
  controllerGroupItem: "HUE_Controller",
  controllerTags: ["HUE Controller"],
  controllerName: "HUE Controller",
  semanticIdentifierString: "Equipment_Lightbulb",
  controllerItem: "HUE_Controller_Command"
}

const requiredItems = {
  color:       { name: "color",       type: "Color",  class: "Point_Control", property: "Property_Light"            },
  brightness:  { name: "brightness",  type: "Dimmer", class: "Point_Control", property: "Property_Light"            },
  temperature: { name: "temperature", type: "Dimmer", class: "Point_Control", property: "Property_ColorTemperature" }
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
      ruleTriggeringItems.push(triggers.ItemStateChangeTrigger(device.items["color"].name, "OFF", "ON"));
      ruleTriggeringItems.push(triggers.ItemStateChangeTrigger(device.items["color"].name, "ON", "OFF"));
    });

    // Add controller rule
    rules.JSRule({
      name: config.controllerName + " Control",
      id: config.controllerItem,
      tags: config.controllerTags,
      description: "Executes " + config.controllerName + " commands.",
      triggers: ruleTriggeringItems,
      execute: event => {
        if(event.itemName === config.controllerItem) {
          // Perform command items
        }
        else if(items.getItem(event.itemName).type === "ColorItem") {
          this.onColorChange(event);
        }
      }
    });

    logger.info(config.controllerName + " is ready.");
  }

  loadDevices() {
    let devices = items.getItems();
    return devices.filter(item => item.getMetadataValue("semantics") === config.semanticIdentifierString)
  }

  onColorChange(event) {
    // If device has paired devices adapt their light
    let device = this.getDeviceByItem(event.itemName);
    device.pairedDevices.forEach(pairedDevice => pairedDevice.setColor(device.getColor()))
  }
}

class HueEquipment extends Equipment {
  constructor(device) {
    super(device);
    this.pairedDevices = new Array();
    this.loadItems(requiredItems);
  };

  getPairedDevices() {
    return this.pairedDevices;
  }

  addPairedDevice(device) {
    if(!this.pairedDevices.includes(device)) {
      logger.info(config.controllerName + " is synchronizing light bulb \"" + device.getLabel() + "\" with \"" + this.getLabel() + "\".");
      this.pairedDevices.push(device);
      device.setColor(this.getColor());
    };
    return this;
  }

  removePairedDevice(device) {
    if(!this.pairedDevices.includes(device)) {
      logger.info(config.controllerName + " is removing light bulb synchronization from \"" + device.getLabel() + "\" to \"" + this.getLabel() + "\".");
      pairedDevices = this.getPairedDevices().filter(pairedDevice => pairedDevice !== device);
      this.pairedDevices = this.pairedDevices;
    }
    return this;
  }

  getColor() {
    return this.items["color"].state;
  }

  setColor(color) {
    this.items["player"].sendCommand(color);
    return this;
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
var controllerItem = null

scriptLoaded = function () {
  controllerGroupItem = addItem(config.controllerGroupItem, "Group", "Sonos Controller Group", undefined, config.controllerTags);
  controllerItem = addItem(config.controllerItem, "String", "Sonos Controller Command Item", new Array(controllerGroupItem.name), config.controllerTags);
  loadedDate = Date.now();
  controller = new HueController();
}

scriptUnloaded = function () {
  controller.uninitialize();
  logger.info(config.controllerName + " uninialized.");
}

