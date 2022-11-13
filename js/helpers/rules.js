// a command passed to these functions must contain one of the following state mappings (custom mappings can be extended if needed)
// const itemEvents = [
//  { itemName: "PresenceLivingroom", receivedCommand: "ON"           },  // received item command "ON"
//  { itemName: "PresenceLivingroom", newState: "ON"                  },  // state changed to "ON"
//  { itemName: "PresenceLivingroom", newState: "ON", oldState: "OFF" },  // state changed from "OFF" to "ON"
// ]

// Load event trigger for rule dynamically during start
function getRuleTrigger(itemEvents) {
  var ruleTriggeringEvents = new Array();
  itemEvents.forEach(command => {
    if(command.receivedCommand) {
      ruleTriggeringEvents.push(triggers.ItemCommandTrigger(command.itemName, command.receivedCommand));
    }
    else if(command.newState) {
      if(command.oldState) {
      ruleTriggeringEvents.push(triggers.ItemStateChangeTrigger(command.itemName, command.oldState, command.newState));
    }
    else {
      ruleTriggeringEvents.push(triggers.ItemStateChangeTrigger(command.itemName, null, command.newState));
    }
    }
  })
  return ruleTriggeringEvents;
}

function getObjectForEvent(itemEvents, event) {
  var returnCommand = null;
  itemEvents.forEach(command => {
    if(event.itemName === command.itemName) {
      if(event.receivedCommand && command.receivedCommand) {
        returnCommand = command;
     }
      else if(event.newState === command.newState) {
        if(command.oldState) {
          if(event.oldState === command.oldState) {
              returnCommand = command;
          }
        }
        else {
          returnCommand = command;
        }
      }
    }
  });
  return returnCommand;
}