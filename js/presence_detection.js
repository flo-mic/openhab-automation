load('/openhab/conf/automation/js/helpers/timer.js');

// enable Presence in room
function enablePresence() {
  cancelTimer(timerId);
  if(presenceItem.state !== "ON") {
    console.log('Presence in ' + room + ' detected.');
    presenceItem.postUpdate("ON");
  }
}

// disable Presence in room
var disablePresence = function disablePresence() {
  cancelTimer(timerId);
  if(presenceItem.state !== "OFF") {
    console.log('No more presence in ' + room + '.');
    presenceItem.postUpdate("OFF");
  }
}


// Presence detection Badezimmer
rules.JSRule({
  name: "Präsenzerkennung Badezimmer",
  description: "Präsenzerkennung im Badezimmer mithilfe von Bewegungsmeldern und Sensoren",
  triggers: [
    triggers.ItemStateUpdateTrigger('Bewegungsmelder_Badezimmer_Status', 'ON'),
    triggers.ItemStateUpdateTrigger('Bewegungsmelder_Badezimmer_Status', 'OFF')
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
      enablePresence();
    }
      
    // if sensor detects no more motion and there is no timer running
    if(motionSensor.state === "OFF" && !(getActiveTimer(timerId))) {
      // Add timer to turn off the light in 30 seconds
      addTimer(timerId, disablePresence, delaySeconds);
    }
  },
  tags: ["Badezimmer", "Presence"],
  id: "Praesenzerkennung_Badezimmer"
});


// Presence detection Schlafzimmer
rules.JSRule({
  name: "Präsenzerkennung Schlafzimmer",
  description: "Präsenzerkennung im Schlafzimmer mithilfe von Bewegungsmeldern und Sensoren",
  triggers: [
    triggers.ItemStateUpdateTrigger('Praesenz_Wohnzimmer', 'OFF'),
    triggers.ItemStateUpdateTrigger('Praesenz_Wohnzimmer', 'ON'),
    triggers.ItemStateUpdateTrigger('Bewegungsmelder_Schlafzimmer_Status', 'OFF'),
    triggers.ItemStateUpdateTrigger('Bewegungsmelder_Schlafzimmer_Status', 'ON')
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
      disablePresence();
    }
    // if sensor detects motion
    else if(motionSensor.state === "ON") {
        enablePresence();
    }
    // if sensor detects no more motion and no timer is started
    else if(motionSensor.state === "OFF" && !(getActiveTimer(timerId))) {
      // Add timer to turn off the light in 30 seconds
      addTimer(timerId, disablePresence, delaySeconds);
    }
  },
  tags: ["Schlafzimmer", "Presence"],
  id: "Praesenzerkennung_Schlafzimmer"
});



// Presence detection Wohnzimmer
rules.JSRule({
  name: "Präsenzerkennung Wohnzimmer",
  description: "Präsenzerkennung im Wohnzimmer mithilfe von Bewegungsmeldern und Sensoren",
  triggers: [
    triggers.ItemStateUpdateTrigger('Bewegungsmelder_Wohnzimmer_Kueche_Status', 'OFF'),
    triggers.ItemStateUpdateTrigger('Bewegungsmelder_Wohnzimmer_Kueche_Status', 'ON'),
    triggers.ItemStateUpdateTrigger('Bewegungsmelder_Wohnzimmer_Schreibtisch_Status', 'OFF'),
    triggers.ItemStateUpdateTrigger('Bewegungsmelder_Wohnzimmer_Schreibtisch_Status', 'ON'),
    triggers.ItemStateUpdateTrigger('Tuer_Wohnzimmer_Status', 'OPEN')
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

    // Check for presence on all endpoints
    if(motionSensor1.state === "ON" ||  motionSensor2.state === "ON" || doorSensor.state === "OPEN") {
      enablePresence();
    }
    else if(presenceItem.state !== "OFF") {
      // Reset presence state of motion detectors
      resetMotion1.sendCommand("ON");
      resetMotion2.sendCommand("ON");
      // Add timer to turn of the light in 30 seconds
      addTimer(timerId, function (){
          if(motionSensor1.state != "ON" &&  motionSensor2.state != "ON" && doorSensor.state != "OPEN") {
            disablePresence;
          }
        }, delaySeconds);
    }
  },
  tags: ["Wohnzimmer", "Presence"],
  id: "Praesenzerkennung_Wohnzimmer"
});
