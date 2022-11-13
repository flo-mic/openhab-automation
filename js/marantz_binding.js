load('/openhab/conf/automation/js/helpers/rules.js');

const itemEvents = [
  { itemName: "Marantz_AVR_Wohnzimmer_Power", newState: "ON",  keyCommand: "ON",   keyItem: "Marantz_AVR_Wohnzimmer_Subwoofer"},
  { itemName: "Marantz_AVR_Wohnzimmer_Power", newState: "OFF", keyCommand: "OFF",  keyItem: "Marantz_AVR_Wohnzimmer_Subwoofer"}
]


// Add Marantz binding rule
rules.JSRule({
  name: "Marantz Binding Control",
  id: "Marantz_Binding_Control",
  tags: ["Marantz Binding", "AVR"],
  description: "Controls the AVR Media receivers from Marantz",
  triggers: getRuleTrigger(itemEvents),
  execute: event => {
    let command = getObjectForEvent(itemEvents, event);
    if(command) {
      if(items.getItem(command.keyItem).state !== command.keyCommand) {
        items.getItem(command.keyItem).sendCommand(command.keyCommand);
      }
    }
  }
});
