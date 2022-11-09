load('/openhab/conf/automation/js/classes/sonos_client.js');

rules.JSRule({
  name: "Wohnzimmer Automation",
  id: "Wohnzimmer_Allgemein",
  tags: ["Wohnzimmer", "Music", "Light"],
  description: "Executes controller commands for given zone",
  triggers: triggers.ItemStateChangeTrigger("Praesenz_Wohnzimmer"),
  execute: event => {
      if(event.oldState === "OFF" && event.newState === "ON") {
        new SonosClient("Wohnzimmer").setCommand("play").setAddIfPossible(true).setTuneInRadio("planet").send();
      }
      else if(event.oldState === "ON" && event.newState === "OFF") {
        new SonosClient("Wohnzimmer").setCommand("remove").send();
      }
  }
});

rules.JSRule({
  name: "Schlafzimmer Automation",
  id: "Schlafzimmer_Allgemein",
  tags: ["Schlafzimmer", "Music", "Light"],
  description: "Executes controller commands for given zone",
  triggers: triggers.ItemStateChangeTrigger("Praesenz_Schlafzimmer"),
  execute: event => {
      if(event.oldState === "OFF" && event.newState === "ON") {
        if(items.getItem("Sonos_Wohnzimmer_Fernbedienung").state === "PLAY") {
          new SonosClient("Schlafzimmer").setCommand("play").setAddIfPossible(true).setTuneInRadio("planet").send();
        }
      }
      else if(event.oldState === "ON" && event.newState === "OFF") {
        new SonosClient("Schlafzimmer").setCommand("remove").send();
      }
  }
});

rules.JSRule({
  name: "Badezimmer Automation",
  id: "Badezimmer_Allgemein",
  tags: ["Badezimmer", "Music", "Light"],
  description: "Executes controller commands for given zone",
  triggers: triggers.ItemStateChangeTrigger("Praesenz_Badezimmer"),
  execute: event => {
      if(event.oldState === "OFF" && event.newState === "ON") {
        new SonosClient("Badezimmer").setCommand("play").setAddIfPossible(true).setTuneInRadio("planet").send();
      }
      else if(event.oldState === "ON" && event.newState === "OFF") {
        new SonosClient("Badezimmer").setCommand("remove").send();
      }
  }
});
