load('/openhab/conf/automation/js/classes/sonos_client.js');

const item = {
  avReceiver: "Marantz_AVR_Wohnzimmer_Power",
  boseSubwoofer: "Marantz_AVR_Wohnzimmer_Subwoofer",
  tv: "TV_Wohnzimmer_Power",
  sonos: {
    wohnzimmer: "Sonos_Wohnzimmer_Fernbedienung"
  },
  presence: {
    wohnzimmer: "Praesenz_Wohnzimmer",
    schlafzimmer: "Praesenz_Schlafzimmer",
    badezimmer: "Praesenz_Badezimmer",
  }
}

rules.JSRule({
  name: "Wohnzimmer präsenz automation",
  id: "Wohnzimmer_Praesenz_Allgemein",
  tags: ["Wohnzimmer", "Presence", "Music", "Light"],
  description: "Executes controller commands for given zone",
  triggers: [
    triggers.ItemStateChangeTrigger(item.presence.wohnzimmer),
    triggers.ItemStateChangeTrigger(item.avReceiver)
  ],
  execute: event => {
    // Control the bose subwoofer  
    if(event.itemName === item.avReceiver && items.getItem(item.boseSubwoofer).state !== event.newState) {
      items.getItem(item.avReceiverPower).sendCommand(event.newState);
      return;
    }
    // If Presence is detected
    if(event.itemName === item.presence.wohnzimmer && event.oldState === "OFF" && event.newState === "ON") {
      // Play music if tv is not turned on
      if(items.getItem(item.tv).state !== "ON") {
        new SonosClient("Wohnzimmer").setCommand("play").setAddIfPossible(true).setTuneInRadio("planet").send();
      }
    }
    // if no presence is detected
    else if(event.itemName === item.presence.wohnzimmer && event.oldState === "ON" && event.newState === "OFF") {
      // Stop music
      new SonosClient("Wohnzimmer").setCommand("remove").send();
    }
  }
});

rules.JSRule({
  name: "Schlafzimmer präsenz automation",
  id: "Schlafzimmer_Praesenz_Allgemein",
  tags: ["Schlafzimmer", "Presence", "Music", "Light"],
  description: "Executes controller commands for given zone",
  triggers: [
    triggers.ItemStateChangeTrigger(item.presence.schlafzimmer),
  ],
  execute: event => {
    // If Presence is detected
    if(event.itemName === item.presence.schlafzimmer && event.oldState === "OFF" && event.newState === "ON") {
      // Play music if music is active in Living room
      if(items.getItem(item.sonos.wohnzimmer).state === "PLAY") {
        new SonosClient("Schlafzimmer").setCommand("play").setAddIfPossible(true).setTuneInRadio("planet").send();
      }
    }
    // if no presence is detected
    else if(event.itemName === item.presence.schlafzimmer && event.oldState === "ON" && event.newState === "OFF") {
      // Stop music
      new SonosClient("Schlafzimmer").setCommand("remove").send();
    }
  }
});

rules.JSRule({
  name: "Badezimmer präsenz automation",
  id: "Badezimmer_Praesenz_Allgemein",
  tags: ["Badezimmer", "Presence", "Music"],
  description: "Executes controller commands for given zone",
  triggers: [
    triggers.ItemStateChangeTrigger(item.presence.badezimmer),
  ],
  execute: event => {
    // If Presence is detected
    if(event.itemName === item.presence.badezimmer && event.oldState === "OFF" && event.newState === "ON") {
      // Play music
      new SonosClient("Badezimmer").setCommand("play").setAddIfPossible(true).setTuneInRadio("planet").send();
    }
    // if no presence is detected
    else if(event.itemName === item.presence.badezimmer && event.oldState === "ON" && event.newState === "OFF") {
      // Stop music
      new SonosClient("Badezimmer").setCommand("remove").send();
    }
  }
});
