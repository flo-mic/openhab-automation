load('/openhab/conf/automation/js/helpers/items.js');

class Device {
  constructor(device) {
    this.device = device;
    this.id = device.getUID().getId();
    this.label = device.getLabel();
    this.location = device.getLocation();
    this.items = {};
    this.dynamic_items = new Array();
    logger.info("New device \""+this.label+"\" initiated.");
    
  };

  uninitialize(controller) {
    this.dynamic_items.forEach(item => {
      this.removeChannelItemLink(item);
    })
    this.dynamic_items = new Array();
    controller.devices = controller.devices.filter(device => device != this);
  }

  loadItems(channels, createMissingItems = false, parentGroups = undefined, tags) {
    Object.keys(channels).forEach(key => {
      // Check if given channel is bound to an item
      var item = this.getItemsBoundToChannel(channels[key].name);
      if(item != null) {
        this.items[key] = item;
      }
      else  {
        var item = items.getItem(this.getId() + "_" + channels[key].name, true);
        if(item != null) {
            this.items[key] = item;
        }
        else {
          if(createMissingItems || channels[key].internal) {
            this.items[key] = this.crerateDynamicItem(channels[key], parentGroups, tags);
          } else {
            logger.error("No item for Channel \"" + channels[key].name + "\" found on device  \"" + this.label + "\".");
          }
        }
      }
    });
    return this;
  }

  getId() {
    return this.id;
  }

  getLabel() {
    return this.label;
  }

  getLocation() {
    return this.location;
  }

  getDevice(controller, deviceId) {
    let device = controller.devices.find(device => device.getId() === deviceId);
    if (device != undefined) {
        return device;
    }
    return null;
  }

  getDeviceByItem(controller, itemName) {
    var device = null;
    controller.devices.forEach(dev => {
      Object.entries(dev.items).forEach(([key, item]) => {
        if(item.name === itemName) { 
          device = dev;
        }
      })
    });
    return device;
  }

  getChannel(channelId) {
    return this.device.getChannel(channelId);
  }

  getItemsBoundToChannel(channelId) {
    var item = items.getItemsByTag().find( item => {
      let foundChannel = Array.from(osgi.getService("org.openhab.core.thing.link.ItemChannelLinkRegistry").getBoundChannels(item.name))
                      .find(channel => channel.getThingUID().getId() === this.getId() && channel.getId() === channelId);
      if(foundChannel != undefined){
        return true;
      }  
      return null;
    });
    if(item === undefined) {
      return null;
    }
    return items.getItem(item.name);
  }

  createChannelItemLink(item, channel) {
    var link = new Java.type("org.openhab.core.thing.link.ItemChannelLink")(item.name, channel.getUID());
    osgi.getService("org.openhab.core.thing.link.ManagedItemChannelLinkProvider").add(link);
  }


  removeChannelItemLink(item, channel) {
    var link = new Java.type("org.openhab.core.thing.link.ItemChannelLink")(item.name, channel.getUID());
    osgi.getService("org.openhab.core.thing.link.ManagedItemChannelLinkProvider").remove(link);
  }

  crerateDynamicItem(channel, parentGroups, tags) {
    let name = this.getId() + "_" + channel.name;
    let label = this.getLabel() + " " + channel.name;
    logger.info("Creating dynamic item \"" + label + "\" on device \"" + this.getLabel() + "\"");
    let item = addItem(name, channel.type, label, parentGroups, tags);
    if(channel.internal) {
      this.dynamic_items.push({ item: item, channel: null });
    } else {
      this.dynamic_items.push({ item: item, channel: this.getChannel(channel.name) });
      this.createChannelItemLink(item, this.getChannel(channel.name));
    }
  }
  
  removeDynamicItem(item) {
    logger.info("Removing dynamic item \"" + item.name + "\" on device \"" + this.getLabel() + "\"");
    if(item.channel) {
      this.removeChannelItemLink(item.item, item.channel);
    }
    removeItem(item.item.name);
  }
}
