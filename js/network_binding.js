

const devices = {
  privat: {
    id: "network:pingdevice:PC_Florian",
    items: {
      power: "PC_Wohnzimmer_Schreibtisch_Power",
      online: "PC_Wohnzimmer_Schreibtisch_Online"
    }
  },
  firma: {
    id: "network:pingdevice:PC_Firma",
    items: {
      power: "PC_Firma_Power",
      online: "PC_Firma_Online"
    }
  },
  tv_wohnzimmer: {
    id: "network:pingdevice:TV_Wohnzimmer",
    items: {
      power: "TV_Wohnzimmer_Power",
      online: "TV_Wohnzimmer_Online"
    }
  }
}


function getNetworkDevice(eventItemName) {
  var device = null;
  Object.keys(devices).forEach(key => {
    if(devices[key].items.power === eventItemName || devices[key].items.online === eventItemName) {
      device = devices[key];
    }
  })
  return device;
}


function getRuleTrigger() {
  // Load event trigger for rule dynamically during start
  var ruleTriggeringEvents = new Array();
  Object.keys(devices).forEach(key => {
    let deviceItems = devices[key].items;
    ruleTriggeringEvents.push(triggers.ItemCommandTrigger(deviceItems.power));
    ruleTriggeringEvents.push(triggers.ItemStateChangeTrigger(deviceItems.online));
  })
  return ruleTriggeringEvents;
}


// Add Network binding rule
rules.JSRule({
  name: "Network Binding Control",
  id: "Network_Binding_Control",
  tags: ["Network Binding", "PC", "TV"],
  description: "Monitors Network devices and performs Wake-On-Lan and Shutdown commands",
  triggers: getRuleTrigger(),
  execute: event => {
    let device = getNetworkDevice(event.itemName);
    // If command was detected
    if(event.receivedCommand) {
        // If PC should be tourned on perform Wake on lan
        if(event.receivedCommand === "ON" && items.getItem(device.items.online).state !== "ON") {
          let actions = acions.Things.getActions("network", device.id)
          if (actions !== null) {
              console.log("Sending Wake on Lan to device identifier \"" + device.id + "\".");
              // Send via MAC address
              actions.sendWakeOnLanPacketViaMac();
          }
        }
        // If pc should be turned off
        if(event.receivedCommand === "OFF" && items.getItem(device.items.online).state === "ON") {
          // place turn off logic here once the system can handle ssh keys
        }
      return;
    } 
    // If online status from device changes update up item as well
    else {
      if(event.newState !== items.getItem(device.items.power).state) {
        items.getItem(device.items.power).postUpdate(event.newState);
      }
    }
  }
});
