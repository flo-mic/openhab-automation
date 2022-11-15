load('/openhab/conf/automation/js/helpers/timer.js');

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
        if(presenceItem.state !== "OFF") {
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
        if(presenceItem.state !== "OFF") {
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
    console.log("Tür item name: " + doorSensor.state);
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
    else if(event.itemName === doorSensor.name && doorSensor.state === "CLOSED" && !(getActiveTimerId(timerId))) {
      // Reset presence state of motion detectors
      resetMotion1.sendCommand("ON");
      resetMotion2.sendCommand("ON");
      // Add timer to turn of the light in 30 seconds
      addTimer(timerId, function (){
        cancelTimer(timerId);
        if(presenceItem.state !== "OFF") {
          console.log('No more presence in ' + room + '.');
          presenceItem.postUpdate("OFF");
        }
      }, delaySeconds);
    }
  }
});
