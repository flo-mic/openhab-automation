load('/openhab/conf/automation/js/classes/hue_client.js');


// Add Good morning wakeup rule
rules.JSRule({
  name: "Wake up rule",
  id: "WakeUpRule",
  triggers: triggers.GenericCronTrigger('0 30 6 ? * MON,TUE,WED,THU,FRI *'),
  execute: event => {
    // Trigger wakeup light and scale up within the next 20 minutes
    new HueClient("Lampe_Schlafzimmer_Garten").setCommand("setColorTransition").setColor("45,61,75").setTransitionTime(1200).setTransitionSteps(20).send();
    new HueClient("Lampe_Schlafzimmer_Tuer").setCommand("setColorTransition").setColor("45,61,75").setTransitionTime(1200).setTransitionSteps(20).send();
    new HueClient("Lampe_Schlafzimmer_LED").setCommand("setColorTransition").setColor("45,61,75").setTransitionTime(1200).setTransitionSteps(20).send();
  }
});
