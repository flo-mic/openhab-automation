load('/openhab/conf/automation/js/helpers/items.js');

const { itemRegistry } = require('@runtime');

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
      if(device.getLocation().getId() === location || device.getLocation() === location) { 
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


class ModelItem extends items.Item {
  constructor(item) {
    if(typeof item === "string") {
      item = items.getItem(item)
    }
    super(itemRegistry.getItem(item.name))
  };

  getId() {
    return this.name;
  }

  getName() {
    return this.name;
  }

  getLabel() {
    return this.label;
  }

  getState() {
    if(this.state === null || this.state === "NULL") {
      return null;
    }
    if(this.state === "UNDEF") {
      return undefined;
    }
    return this.state;
  }

  getLocation() {
    let searching = true;
    let location = this.getSemanticParent();
    while(searching) {
      if(location instanceof Location || location === null) {
        searching = false;
      } else {
        location = location.getSemanticParent();
      }
    }
    return location;
  }

  getSemanticParent() {
    var parentItem = null;
    this.groupNames.forEach(groupName => {
      let group = items.getItem(groupName);
      let groupSemanticMetadata = group.getMetadataValue("semantics");
      if(groupSemanticMetadata) {
        if(groupSemanticMetadata.startsWith("Location_")) {
          parentItem = new Location(group);
        } else if(groupSemanticMetadata.startsWith("Equipment_")) {
          parentItem = new Equipment(group);
        } else if(groupSemanticMetadata.startsWith("Point_")) {
          parentItem = new Point(group);
        }
      }
    });
    return parentItem;
  }

  getParents() {
    var parentItems = new Array();
    this.groupNames.forEach(groupName => {
      parentItems.push(items.getItem(groupName));
    });
    return parentItems;
  }

  getSemanticChilds() {
    var childs = new Array();
    this.members.forEach(memberName => {
      let member = items.getItem(memberName);
      if(groupSemanticMetadata) {
        if(groupSemanticMetadata.startsWith("Location_")) {
          childs.push(new Location(group));
        } else if(groupSemanticMetadata.startsWith("Equipment_")) {
          childs.push(new Equipment(group));
        } else if(groupSemanticMetadata.startsWith("Point_")) {
          childs.push(new Point(group));
        }
      }
    });
    return childs;
  }

  getChilds() {
    return this.members;
  }

  hasChild(child) {
    let hasChild = false;
    if(typeof child === "string") {
      child = items.getItem(child, true)
    }
    this.getChilds().forEach(item => {
      if(item.name === child.name) {
          hasChild = true; 
        }
    });
    return hasChild;
  }
}

class Point extends ModelItem {
  constructor(point) {
    super(point);
  };
}

class Equipment extends ModelItem {
  constructor(equipment) {
    super(equipment);
    this.items = {};
    this.internal_items = new Array();
  };

  uninitialize() {
    this.internal_items.forEach(item => {
      this.removeInternalItem(item);
    })
    this.internal_items = new Array();
  }

  loadItems(requiredItems, tags = new Array()) {
    Object.keys(requiredItems).forEach(key => {
      if(!requiredItems[key].internal) {
        this.getChilds().forEach(item => {
          if(item.type === requiredItems[key].type) {
            if(requiredItems[key].class && itemHasSemanticProperties(item, requiredItems[key].class, requiredItems[key].property)) {
              this.items[key] = new Point(item);
            }
            if(requiredItems[key].tags) {
              if(requiredItems[key].tags.every(tag => item.tags.includes(tag))) {
                this.items[key] = new Point(item);
              }
            }
          }
        });
      } else {
        this.items[key] = this.loadInternalItems(requiredItems[key].name, requiredItems[key].type, tags, requiredItems[key].metadata);
      }
    });
    return this;    
  }

  getInternalItems() {
    return this.internal_items;
  }

  loadInternalItems(name, type, tags, metadata) {
    let label = this.getLabel() + " " + name;
    name = this.getName() + "_" + name;
    var item = items.getItem(name, true);
    if(!item) {
      item = this.crerateInternalItem(name, label, type, tags);
    }
    if(metadata) {
      Object.keys(metadata).forEach(key => {
        this.updateMetadataValue(key, JSON.stringify(metadata[key]));
      });
    }
    item = new Point(item);
    this.internal_items.push(item);
    return item;
  }

  crerateInternalItem(name, label, type, tags) {
    logger.info("Creating internal item \"" + label + "\" on equipment \"" + this.getLabel() + "\"");
    let item = addItem(name, type, label, new Array(this.getId()), tags );
    return item;
  }
  
  removeInternalItem(item) {
    logger.info("Removing internal item \"" + item.name + "\" on equipment \"" + this.getLabel() + "\"");
    removeItem(item.name);
  }
}


class Location extends ModelItem {
  constructor(location) {
    super(location);
    this.items = {};
  };

  getEquipments() {
    let equipments = new Array();
    this.getSemanticChilds().forEach(child => {
      if(child instanceof Equipment) {
        equipments.push(child);
      }
    });
    return equipments;
  }

  getLocations() {
    let locations = new Array();
    this.getSemanticChilds().forEach(child => {
      if(child instanceof Location) {
        locations.push(child);
      }
    });
    return locations;
  }

  getPoints() {
    let points = new Array();
    this.getSemanticChilds().forEach(child => {
      if(child instanceof Point) {
        points.push(child);
      }
    });
    return points;
  }
}