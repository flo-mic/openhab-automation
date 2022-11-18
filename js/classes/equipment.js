load('/openhab/conf/automation/js/helpers/items.js');

class EquipmentController {
  constructor(controller) {
    this.devices = null;
    this.label = controller;
    logger.info("New controller \"" + this.label + "\" initiated.");
    
  };

  getLabel() {
    return this.label;
  }

  getEquipment(equipmentId) {
    let device = this.devices.find(device => device.getName() === equipmentId || device === equipmentId);
    if (device != undefined) {
      return device;
    }
    return null;
  }

  getEquipments() {
    return this.devices;
  }

  getEquipmentByItem(itemName) {
    var result = null;
    this.devices.forEach(device => {
      if(device.getName() === itemName) { 
        result = device;
      }
      Object.entries(device.items).forEach(([key, item]) => {
        if(item.name === itemName) { 
            result = device;
        }
      })
    });
    return result;
  }

  getEquipmentsByLocation(location) {
    var equipments = new Array();
    this.devices.forEach(device => {
      if(device.getLocationId() === location || device.getLocation() === location) { 
        equipments.push(device);
      }
    });
    return equipments;
  }

  uninitialize() {
    logger.info("Controller \"" + this.label + "\" will be uninitialized.");
    this.devices.forEach(device => {
      device.uninitialize();
      delete this.devices[device]
    })
  }
}


class Equipment {
  constructor(equipment) {
    this.equipment = equipment;
    this.name = equipment.name;
    this.label = equipment.label;
    this.location = this.getSemanticParent();
    this.items = {};
    this.dynamic_items = new Array();
    logger.info("New equipment \""+this.label+"\" initiated.");
  };

  uninitialize() {
    logger.info("Equipment \""+this.label+"\" will be uninitialized.");
    this.dynamic_items.forEach(item => {
      this.removeDynamicItem(item);
    })
    this.dynamic_items = new Array();
  }

  getMetadataSettings(key, subkey=null) {
    getItemMetadataValueAsObject(this.getId(), key, subkey);
  }

  setEquipmentSettings(key, value, subkey=null) {
    setItemMetadataValueFromObject(this.getId(), key, value, subkey);
  }


  loadItems(requiredItems) {
    Object.keys(requiredItems).forEach(key => {
      this.equipment.members.forEach(item => {
        let itemSemantics = item.getMetadataValue("semantics");
        if(itemSemantics === requiredItems[key].class) {
          if(item.type === requiredItems[key].type) {
            this.items[key] = item;
          }
        }
      });
    });
    return this;    
  }

  getId() {
    return this.name;
  }

  getName() {
    return this.name;
  }

  getLabel() {
    return this.label;
  }

  getLocation() {
    return this.location.label;
  }

  getLocationId() {
    return this.location.name;
  }

  getSemanticParent() {
    var parentItem = null;
    this.equipment.groupNames.forEach(groupName => {
      let group = items.getItem(groupName);
      let groupSemanticMetadata = group.getMetadataValue("semantics");
      if(groupSemanticMetadata) {
        parentItem = group;
      }
    });
    return parentItem;
  }

  getParents() {
    var parentItems = new Array();
    this.equipment.groupNames.forEach(groupName => {
      parentItems.push(items.getItem(groupName));
    });
    return parentItems;
  }

  getSemanticChilds() {
    var childs = new Array();
    this.equipment.members.forEach(memberName => {
      let member = items.getItem(memberName);
      if(member.getMetadataValue("semantics")) {
        childs.oush(member);
      }
    });
    return childs;
  }

  getChilds() {
    return this.members;
  }

  crerateDynamicItem(channel, parentGroups, tags) {
    let name = this.getName() + "_" + channel.name;
    let label = this.getLabel() + " " + channel.name;
    logger.info("Creating dynamic item \"" + label + "\" on equipment \"" + this.getLabel() + "\"");
    let item = addItem(name, channel.type, label, parentGroups, tags);
    if(channel.internal) {
      this.dynamic_items.push({ item: item, channel: null });
    }
  }
  
  removeDynamicItem(item) {
    logger.info("Removing dynamic item \"" + item.name + "\" on equipment \"" + this.getLabel() + "\"");
    removeItem(item.item.name);
  }
}
