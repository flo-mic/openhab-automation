load('/openhab/conf/automation/js/helpers/timer.js');

const presenceEvents = [
  { 
    presenceItem: "Praesenz_Badezimmer",
    roomName: "Badezimmer",
    turnOffDelay: 30,
    eventItems: [
      { itemName: "Bewegungsmelder_Badezimmer_Status",    newState: "ON"  },
      { itemName: "Bewegungsmelder_Badezimmer_Status",    newState: "OFF" }
    ],
    isPresence: function (event) {
      motionSensor = items.getItem('Bewegungsmelder_Badezimmer_Status')
      if(motionSensor.state === "ON") {
        return true;
      }
      return false;
    }
  },
  { 
    presenceItem: "Praesenz_Schlafzimmer",
    roomName: "Schlafzimmer",
    turnOffDelay: 30,
    eventItems: [
      { itemName: "Bewegungsmelder_Schlafzimmer_Status",  newState: "ON"  },
      { itemName: "Bewegungsmelder_Schlafzimmer_Status",  newState: "OFF" },
      { itemName: "Praesenz_Wohnzimmer",                  newState: "ON"  },
      { itemName: "Praesenz_Wohnzimmer",                  newState: "OFF" }
    ],
    isPresence: function (event) {
      motionSensor = items.getItem('Bewegungsmelder_Schlafzimmer_Status')
      presenceLivingRoom = items.getItem('Praesenz_Wohnzimmer')
      if(presenceLivingRoom.state === "ON" && motionSensor.state === "ON") {
        return true;
      }
      return false;
    }
  },
  { 
    presenceItem: "Praesenz_Wohnzimmer",
    roomName: "Wohnzimmer",
    turnOffDelay: 30,
    eventItems: [
      { itemName: "Bewegungsmelder_Wohnzimmer_Kueche_Status",       newState: "ON"     },
      { itemName: "Bewegungsmelder_Wohnzimmer_Kueche_Status",       newState: "OFF"    },
      { itemName: "Bewegungsmelder_Wohnzimmer_Schreibtisch_Status", newState: "ON"     },
      { itemName: "Bewegungsmelder_Wohnzimmer_Schreibtisch_Status", newState: "OFF"    },
      { itemName: "Tuer_Wohnzimmer_Status",                         newState: "OPEN"   },
      { itemName: "Tuer_Wohnzimmer_Status",                         newState: "CLOSED" }
    ],
    isPresence: function (event) {
      motionSensor1 = items.getItem('Bewegungsmelder_Wohnzimmer_Kueche_Status');
      motionSensor2 = items.getItem('Bewegungsmelder_Wohnzimmer_Schreibtisch_Status');
      doorSensor    = items.getItem('Tuer_Wohnzimmer_Status');

      // if event was triggered by closing door, reset presence sensors for new detection
      if(event && event.itemName === doorSensor.name && event.newState === "CLOSED") {
        items.getItem('Bewegungsmelder_Wohnzimmer_Kueche_Status_Zuruecksetzen').sendCommand("ON");
        items.getItem('Bewegungsmelder_Wohnzimmer_Schreibtisch_Status_Zuruecksetzen').sendCommand("ON");
      }
      // Check for presence
      if(motionSensor1.state === "OFF" && motionSensor2.state === "OFF" && doorSensor.state === "CLOSED") {
        return false;
      }
      return false;
    }
  }
]

// Load event trigger for rule dynamically during start
function getRuleTrigger() {
  var ruleTriggeringEvents = new Array();
  presenceEvents.forEach(room => {
    room.eventItems.forEach(eventItem => {
      ruleTriggeringEvents.push(triggers.ItemStateChangeTrigger(eventItem.itemName, null, eventItem.newState));
    })
  })
  return ruleTriggeringEvents;
}

// Function generator to pass variables to time outside of this context (variables need to be resolved already now)
var timerFunction = function(presenceItem, roomEvent) {
  return function() {
    if(presenceItem.state !== "OFF" && !roomEvent.isPresence()) {
      console.log('No more presence in ' + roomEvent.roomName + '.');
      presenceItem.postUpdate("OFF");
    }
  }
}


// Add Presence detection rule
rules.JSRule({
  name: "Presence detection Control",
  id: "Presence_Detection_Control",
  tags: ["Presence", "Presence detection"],
  description: "Präsenzerkennung im Räumen mithilfe von Bewegungsmeldern und Sensoren",
  triggers: getRuleTrigger(),
  execute: event => {
    // Get all rooms which have the current event as trigger item
    var roomEvents = presenceEvents.filter(room => (room.eventItems.filter(eventItem => eventItem.itemName === event.itemName && eventItem.newState === event.newState).length > 0));

    // Refresh the presence in every triggered room
    roomEvents.forEach(room => {
      let timerId = room.roomName + "_presenceTimer";
      let presenceItem = items.getItem(room.presenceItem);
      if(room.isPresence()) {
        // stop existing timer if running
        cancelTimer(timerId);
        if(presenceItem.state !== "ON") {
          console.log('Presence in ' + room.roomName + ' detected.');
          presenceItem.postUpdate("ON");
        }
      } else if(!getActiveTimerId(timerId)) {
        // Add timer to turn off the light in 30 seconds
        addTimer(timerId, timerFunction(presenceItem, room), room.turnOffDelay);
      }
    });
  }
});

/*
// Presence detection Badezimmer
rules.JSRule({
  name: "Präsenzerkennung Badezimmer",
  id: "Praesenzerkennung_Badezimmer",
  tags: ["Bathroom", "Presence detection"],
  description: "Präsenzerkennung im Badezimmer mithilfe von Bewegungsmeldern und Sensoren",
  triggers: [
    triggers.ItemStateChangeTrigger('Bewegungsmelder_Badezimmer_Status', null, 'ON'),
    triggers.ItemStateChangeTrigger('Bewegungsmelder_Badezimmer_Status', null, 'OFF')
  ],
  execute: (event) => {
    // Variables
    room = "Badezimmer";
    timerId = 'timerBadezimmerPresence';
    delaySeconds = 30

    // Source items
    presenceItem = items.getItem('Praesenz_Badezimmer')
    motionSensor = items.getItem('Bewegungsmelder_Badezimmer_Status')

    // if sensor detects motion
    if(motionSensor.state === "ON") {
      cancelTimer(timerId);
      if(presenceItem.state !== "ON") {
        console.log('Presence in ' + room + ' detected.');
        presenceItem.postUpdate("ON");
      }
    }
      
    // if sensor detects no more motion and there is no timer running
    if(motionSensor.state === "OFF" && !(getActiveTimerId(timerId))) {
      // Add timer to turn off the light in 30 seconds
      addTimer(timerId, function() {
        cancelTimer(timerId);
        if(presenceItem.state !== "OFF" && items.getItem(motionSensor.name).state !== "ON") {
          console.log('No more presence in ' + room + '.');
          presenceItem.postUpdate("OFF");
        }
      }, delaySeconds);
    }
  }
});


// Presence detection Schlafzimmer
rules.JSRule({
  name: "Präsenzerkennung Schlafzimmer",
  id: "Praesenzerkennung_Schlafzimmer",
  tags: ["Bedroom", "Presence detection"],
  description: "Präsenzerkennung im Schlafzimmer mithilfe von Bewegungsmeldern und Sensoren",
  triggers: [
    triggers.ItemStateChangeTrigger('Praesenz_Wohnzimmer', null, 'OFF'),
    triggers.ItemStateChangeTrigger('Praesenz_Wohnzimmer', null, 'ON'),
    triggers.ItemStateChangeTrigger('Bewegungsmelder_Schlafzimmer_Status', null, 'OFF'),
    triggers.ItemStateChangeTrigger('Bewegungsmelder_Schlafzimmer_Status', null, 'ON')
  ],
  execute: (event) => {
    // Variables
    room = "Schlafzimmer";
    timerId = 'timerSchlafzimmerPresence';
    delaySeconds = 30

    // Source items
    presenceItem = items.getItem('Praesenz_Schlafzimmer')
    presenceWohnzimmer = items.getItem('Praesenz_Wohnzimmer')
    motionSensor = items.getItem('Bewegungsmelder_Schlafzimmer_Status')

    // If motion in living room is not on, turn off sleeping room as well
    if (presenceWohnzimmer.state != "ON") {
      cancelTimer(timerId);
      if(presenceItem.state !== "OFF") {
        console.log('No more presence in ' + room + '.');
        presenceItem.postUpdate("OFF");
      }
    }
    // if sensor detects motion
    else if(motionSensor.state === "ON") {
      cancelTimer(timerId);
      if(presenceItem.state !== "ON") {
        console.log('Presence in ' + room + ' detected.');
        presenceItem.postUpdate("ON");
      }
    }
    // if sensor detects no more motion and no timer is started
    else if(motionSensor.state === "OFF" && !(getActiveTimerId(timerId))) {
      // Add timer to turn off the light in 30 seconds
      addTimer(timerId, function () {
        cancelTimer(timerId);
        if(presenceItem.state !== "OFF" && items.getItem(motionSensor.name).state !== "ON") {
          console.log('No more presence in ' + room + '.');
          presenceItem.postUpdate("OFF");
        }
      }, delaySeconds);
    }
  }
});



// Presence detection Wohnzimmer
rules.JSRule({
  name: "Präsenzerkennung Wohnzimmer",
  id: "Praesenzerkennung_Wohnzimmer",
  tags: ["LivingRoom", "Presence detection"],
  description: "Präsenzerkennung im Wohnzimmer mithilfe von Bewegungsmeldern und Sensoren",
  triggers: [
    triggers.ItemStateChangeTrigger('Bewegungsmelder_Wohnzimmer_Kueche_Status', null, 'OFF'),
    triggers.ItemStateChangeTrigger('Bewegungsmelder_Wohnzimmer_Kueche_Status', null, 'ON'),
    triggers.ItemStateChangeTrigger('Bewegungsmelder_Wohnzimmer_Schreibtisch_Status', null, 'OFF'),
    triggers.ItemStateChangeTrigger('Bewegungsmelder_Wohnzimmer_Schreibtisch_Status', null, 'ON'),
    triggers.ItemStateChangeTrigger('Tuer_Wohnzimmer_Status', null, 'OPEN'),
    triggers.ItemStateChangeTrigger('Tuer_Wohnzimmer_Status', null, 'CLOSED')
  ],
  execute: (event) => {
    // Variables
    room = "Wohnzimmer";
    timerId = 'timerWohnzimmerPresence';
    delaySeconds = 30;

    // Source items
    presenceItem = items.getItem('Praesenz_Wohnzimmer');
    motionSensor1 = items.getItem('Bewegungsmelder_Wohnzimmer_Kueche_Status');
    motionSensor2 = items.getItem('Bewegungsmelder_Wohnzimmer_Schreibtisch_Status');
    resetMotion1 = items.getItem('Bewegungsmelder_Wohnzimmer_Kueche_Status_Zuruecksetzen');
    resetMotion2 = items.getItem('Bewegungsmelder_Wohnzimmer_Schreibtisch_Status_Zuruecksetzen');
    doorSensor = items.getItem('Tuer_Wohnzimmer_Status');

    console.log("Präsenz Wohnzimmer: " + presenceItem.state);
    console.log("Bewegungsmelder Küche: " + motionSensor1.state);
    console.log("Bewegungsmelder Wohnzimmer: " + motionSensor2.state);
    console.log("Tür: " + doorSensor.state);
    console.log("Trigger Item: " + event.itemName);

    // Check if presence was detected on a sensor
    if(((event.itemName === motionSensor1.name || event.itemName === motionSensor1.name ) && event.newState === "ON") 
      || event.itemName === doorSensor.name && event.state === "OPEN") {
        cancelTimer(timerId);
        if(presenceItem.state !== "ON") {
          console.log('Presence in ' + room + ' detected.');
          presenceItem.postUpdate("ON");
        }
    }
    // Check if door was closed to check again for active presence
    else if(event.newState === "CLOSED" && !(getActiveTimerId(timerId))) {
      // Reset presence state of motion detectors
      resetMotion1.sendCommand("ON");
      resetMotion2.sendCommand("ON");
      // Add timer to turn of the light in 30 seconds
      addTimer(timerId, function (){
        cancelTimer(timerId);
        console.log("Bewegungsmelder Küche: " + motionSensor1.state);
        console.log("Bewegungsmelder Wohnzimmer: " + motionSensor2.state);
        if(presenceItem.state !== "OFF" && items.getItem(motionSensor1.name).state !== "ON" && items.getItem(motionSensor2.name).state !== "ON") {
          console.log('No more presence in ' + room + '.');
          presenceItem.postUpdate("OFF");
        }
      }, delaySeconds);
    }
  }
});
*/