load('/openhab/conf/automation/js/classes/sonos_client.js');
load('/openhab/conf/automation/js/classes/hue_client.js');
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
      new HueClient("Lampen_Wohnzimmer").setCommand("off").send();
    }
  },{ 
    itemName: "Praesenz_Schlafzimmer",
    newState: "ON", 
    oldState: "OFF", 
    execute: function () {
      if(items.getItem("Sonos_Wohnzimmer_Fernbedienung").state === "PLAY") {
        new SonosClient("Schlafzimmer").setCommand("play").setAddIfPossible(true).setTuneInRadio("planet").send();
      }
      new HueClient("Lampe_Schlafzimmer_Bett").setCommand("add").setTargetDevice("Lampe_Wohnzimmer_Couch").send();
      new HueClient("Lampe_Schlafzimmer_Garten").setCommand("add").setTargetDevice("Lampe_Wohnzimmer_Garten").send();
      new HueClient("Lampe_Schlafzimmer_Tuer").setCommand("add").setTargetDevice("Lampe_Wohnzimmer_Kueche").send();
      new HueClient("Lampe_Schlafzimmer_LED").setCommand("add").setTargetDevice("Lampe_Wohnzimmer_LED").send();
    }
  },{ 
    itemName: "Praesenz_Schlafzimmer",
    newState: "OFF", 
    oldState: "ON",  
    execute: function () {
      new SonosClient("Schlafzimmer").setCommand("remove").send();
      new HueClient("Lampe_Schlafzimmer_Bett").setCommand("remove").setTurnLightOff(true).send();
      new HueClient("Lampe_Schlafzimmer_Garten").setCommand("remove").setTurnLightOff(true).send();
      new HueClient("Lampe_Schlafzimmer_Tuer").setCommand("remove").setTurnLightOff(true).send();
      new HueClient("Lampe_Schlafzimmer_LED").setCommand("remove").setTurnLightOff(true).send();

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