load('/openhab/conf/automation/js/helpers/items.js');

class EquipmentController {
  constructor(controller) {
    this.equipments = null;
    this.label = controller;
    logger.info("New controller \"" + this.label + "\" initiated.");
    
  };

  getLabel() {
    return this.label;
  }

  getEquipment(equipmentId) {
    let equipment = this.equipments.find(equipment => equipment.getName() === equipmentId);
    if (equipment != undefined) {
      return equipment;
    }
    return null;
  }

  getEquipments() {
    return this.equipments;
  }

  getEquipmentByItem(itemName) {
    var result = null;
    this.equipments.forEach(equipment => {
      if(equipment.getName() === itemName) { 
        result = equipment;
      }
      Object.entries(equipment.items).forEach(([key, item]) => {
        if(item.name === itemName) { 
            result = equipment;
        }
      })
    });
    return result;
  }

  getEquipmentsByLocation(location) {
    var equipments = new Array();
    this.equipments.forEach(equipment => {
      if(equipment.getLocationId() === location || equipment.getLocation() === location) { 
        equipments.push(equipment);
      }
    });
    return equipments;
  }

  uninitialize() {
    logger.info("Controller \"" + this.label + "\" will be uninitialized.");
    this.equipments.forEach(equipment => {
      equipment.uninitialize();
      delete this.equipments[equipment]
    })
  }
}


class Equipment {
  constructor(equipment) {
    this.equipment = equipment;
    this.name = equipment.name;
    this.label = equipment.label;
    this.location = getParentItemInModel(equipment.name);
    this.items = null;
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

  loadItems(requiredItems) {
    Object.keys(requiredItems).forEach(key => {
      this.equipment.members.forEach(item => {
        let itemSemantics = items.getItem(item.name).getMetadataValue("semantics");
        if(itemSemantics && itemSemantics.value === item.class) {
          if(item.property) {
            if(item.property === itemSemantics.config.relatesTo) {
              this.items[key] = items.getItem(item.name);
            }
          } else {
            this.items[key] = items.getItem(item.name);
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

  getChildItems() {
    return this.items;
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
