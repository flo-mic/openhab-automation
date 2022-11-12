const commands = [
  { itemName: "TV_Wohnzimmer_Power",          receivedCommand: "ON",          keyCommand: "PowerOn"        },
  { itemName: "TV_Wohnzimmer_Power",          receivedCommand: "OFF",         keyCommand: "PowerOff"       },
  { itemName: "TV_Wohnzimmer_Stummschalten",  receivedCommand: "ON",          keyCommand: "Mute"           },
  { itemName: "TV_Wohnzimmer_Stummschalten",  receivedCommand: "OFF",         keyCommand: "Mute"           },
  { itemName: "TV_Wohnzimmer_Lautstaerke",    receivedCommand: "UP",          keyCommand: "VolumeUp"       },
  { itemName: "TV_Wohnzimmer_Lautstaerke",    receivedCommand: "DOWN",        keyCommand: "VolumeDown"     },
  { itemName: "TV_Wohnzimmer_Quelle",         receivedCommand: "TV",          keyCommand: "InputTv"        },
  { itemName: "TV_Wohnzimmer_Quelle",         receivedCommand: "Netflix",     keyCommand: "Netflix"        },
  { itemName: "TV_Wohnzimmer_Quelle",         receivedCommand: "PrimeVideo",  keyCommand: "PrimeVideo"     },
  { itemName: "TV_Wohnzimmer_Kanal",          receivedCommand: "Up",          keyCommand: "ChannelUp"      },
  { itemName: "TV_Wohnzimmer_Kanal",          receivedCommand: "Down",        keyCommand: "ChannelDown"    },
  { itemName: "TV_Wohnzimmer_Kanal",          receivedCommand: "Pro7",        keyCommand: ["4"]            },
  { itemName: "TV_Wohnzimmer_Kanal",          receivedCommand: "Pro7Maxx",    keyCommand: ["1", "0"]       },
  { itemName: "TV_Wohnzimmer_Kanal",          receivedCommand: "Kabel1",      keyCommand: ["7"]            },
  { itemName: "TV_Wohnzimmer_Kanal",          receivedCommand: "RTL",         keyCommand: ["5"]            },
  { itemName: "TV_Wohnzimmer_Kanal",          receivedCommand: "RTL2",        keyCommand: ["6"]            },
  { itemName: "TV_Wohnzimmer_Kanal",          receivedCommand: "Nitro",       keyCommand: ["1", "1"]       },
  { itemName: "TV_Wohnzimmer_Kanal",          receivedCommand: "WELT",        keyCommand: ["9"]            },
  { itemName: "TV_Wohnzimmer_Kanal",          receivedCommand: "N24",         keyCommand: ["1", "2"]       },
  { itemName: "TV_Wohnzimmer_Kanal",          receivedCommand: "ntv",         keyCommand: ["1", "3"]       },
  { itemName: "TV_Wohnzimmer_Fernbedienung",  receivedCommand: "PLAY",        keyCommand: "Play"           },
  { itemName: "TV_Wohnzimmer_Fernbedienung",  receivedCommand: "PAUSE",       keyCommand: "Pause"          },
  { itemName: "TV_Wohnzimmer_Fernbedienung",  receivedCommand: "STOP",        keyCommand: "Stop"           },
  { itemName: "TV_Wohnzimmer_Fernbedienung",  receivedCommand: "NEXT",        keyCommand: "FastForward"    },
  { itemName: "TV_Wohnzimmer_Fernbedienung",  receivedCommand: "PREVIOUS",    keyCommand: "Rewind"         },
  { itemName: "TV_Wohnzimmer_Navigation",     receivedCommand: "Up",          keyCommand: "DirectionUp"    },
  { itemName: "TV_Wohnzimmer_Navigation",     receivedCommand: "Down",        keyCommand: "DirectionDown"  },
  { itemName: "TV_Wohnzimmer_Navigation",     receivedCommand: "Left",        keyCommand: "DirectionLeft"  },
  { itemName: "TV_Wohnzimmer_Navigation",     receivedCommand: "Right",       keyCommand: "DirectionRight" },
  { itemName: "TV_Wohnzimmer_Navigation",     receivedCommand: "Select",      keyCommand: "Select"         },
  { itemName: "TV_Wohnzimmer_Navigation",     receivedCommand: "Return",      keyCommand: "Return"         },
  { itemName: "TV_Wohnzimmer_Navigation",     receivedCommand: "Guide",       keyCommand: "Guide"         },
  { itemName: "TV_Wohnzimmer_Navigation",     receivedCommand: "Menu",        keyCommand: "Menu"           },
  { itemName: "TV_Wohnzimmer_Navigation",     receivedCommand: "Info",        keyCommand: "Info"           },
  { itemName: "TV_Wohnzimmer_Navigation",     receivedCommand: "Exit",        keyCommand: "Exit"           },
]

function getRuleTrigger() {
  // Load event trigger for rule dynamically during start
  var ruleTriggeringEvents = new Array();
  commands.forEach(command => {
    if(command.receivedCommand !== null) {
      ruleTriggeringEvents.push(triggers.ItemCommandTrigger(command.itemName, command.receivedCommand));
    }
    else {
      ruleTriggeringEvents.push(triggers.ItemStateChangeTrigger(command.itemName, command.newState));
    }
  })
  return ruleTriggeringEvents;
}

// Add Network binding rule
rules.JSRule({
  name: "Samsung TV rule",
  id: "Samsung_TV_Automation",
  tags: ["TV", "livingroom"],
  description: "Handles commands to Samsung TV and updates state items",
  triggers: getRuleTrigger(),
  execute: event => {
    // If command was detected
    if(event.receivedCommand) {
      commands.forEach(command => {
        if(event.itemName === command.itemName && event.receivedCommand === command.receivedCommand) {
          if(typeof command.keyCommand === "string") {
            items.getItem("TV_Wohnzimmer_Tastendruck").sendCommand(command.keyCommand);
          }
          else {
            command.keyCommand.forEach(key => {
              items.getItem("TV_Wohnzimmer_Tastendruck").sendCommand(key);
            });
            items.getItem("TV_Wohnzimmer_Tastendruck").sendCommand("Select");
          }
        }
      })
    } 
  }
});
