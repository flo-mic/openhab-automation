load('/openhab/conf/automation/js/classes/sonos_client.js');
load('/openhab/conf/automation/js/helpers/rules.js');

const itemEvents = [
  { 
    itemName: "Praesenz_Wohnzimmer",
    newState: "ON", 
    oldState: "OFF", 
    execute: function () {
      if(items.getItem("TV_Wohnzimmer_Power").state !== "ON") {
        new SonosClient("Wohnzimmer").setCommand("play").setAddIfPossible(true).setTuneInRadio("planet").send();
      }
    }
  },{ 
    itemName: "Praesenz_Wohnzimmer",
    newState: "OFF", 
    oldState: "ON",  
    execute: function () {
      new SonosClient("Wohnzimmer").setCommand("remove").send();
    }
  },{ 
    itemName: "Praesenz_Schlafzimmer",
    newState: "ON", 
    oldState: "OFF", 
    execute: function () {
      if(items.getItem("Sonos_Wohnzimmer_Fernbedienung").state === "PLAY") {
        new SonosClient("Schlafzimmer").setCommand("play").setAddIfPossible(true).setTuneInRadio("planet").send();
      }
    }
  },{ 
    itemName: "Praesenz_Schlafzimmer",
    newState: "OFF", 
    oldState: "ON",  
    execute: function () {
      new SonosClient("Schlafzimmer").setCommand("remove").send();
    }
  },{ 
    itemName: "Praesenz_Badezimmer",
    newState: "ON", 
    oldState: "OFF", 
    execute: function () {
      new SonosClient("Badezimmer").setCommand("play").setAddIfPossible(true).setTuneInRadio("planet").send();
    }
  },{ 
    itemName: "Praesenz_Badezimmer",
    newState: "OFF", 
    oldState: "ON",  
    execute: function () {
      new SonosClient("Badezimmer").setCommand("remove").send();
    }
  }
]


rules.JSRule({
  name: "Room Control based on Presence",
  id: "Room_Control",
  tags: ["Music", "Sonos"],
  description: "Manage the music in a room based on the presence",
  triggers: getRuleTrigger(itemEvents),
  execute: event => {
    let command = getObjectForEvent(itemEvents, event);
    if(command) {
      command.execute();
    }
  }
});