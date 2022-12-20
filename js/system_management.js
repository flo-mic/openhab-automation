load('/openhab/conf/automation/js/helpers/items.js');

var restoreOnStartupItem = null;
var undefinedItem = null;
var systemStartUpItem = null

scriptLoaded = function () {
  // define global items used by all rules
  restoreOnStartupItem = addItem("Group_RestoreOnStartup", "Group", "Restore on Startup");
  undefinedItem = addItem("Item_Undefined", "String", "Undefined Item to prevent missing item log events");

  // Check for System Startup item
  const startupItemName = "System_Startup_Completed";
  if(!items.getItem(startupItemName, true)) {
    // Create missing system startup item
    systemStartUpItem = addItem("System_Startup_Completed", "Switch", "System startup Completed");
    systemStartUpItem.sendCommand("ON");
  }

  rules.JSRule({
    name: "System Management",
    description: "Performc global tasks like startup level monitoring.",
    triggers: [
      triggers.SystemStartlevelTrigger(100)
    ],
    execute: (event) => {
      systemStartUpItem.sendCommand("ON");
    },
    tags: ["System Management"],
    id: "System_Management"
  });
}

scriptUnloaded = function () {
  systemStartUpItem.sendCommand("OFF");
}

