load('/openhab/conf/automation/js/helpers/sonos_client.js');
load('/openhab/conf/automation/js/helpers/device.js');
load('/openhab/conf/automation/js/helpers/items.js');

let logger = log('SonosController');

const config = {
    controllerGroupItem: "Sonos_Controller",
    controllerTags: ["Sonos Controller"],
    sonosIdentifierString: "RINCON_",
    sonosControllerItem: "Sonos_Controller_Command",
    sonosControllerUiConfig: "Sonos_Controller_UiConfig",
}

const channelIds = {
    player: { name: "control", type: "Control" },
    playUri: { name: "playuri", type: "String" },
    album: { name: "currentalbum", type: "String" },
    artist: { name: "currentartist", type: "String" },
    coverArt: { name: "currentalbumart", type: "Image" },
    title: { name: "currenttitle", type: "String" },
    track: { name: "currenttrack", type: "String" },
    coordinator: { name: "coordinator", type: "String" },
    localCoordinator: { name: "localcoordinator", type: "Switch" },
    volume: { name: "volume", type: "Dimmer" },
    zoneName: { name: "zonename", type: "String" },
    zoneVolume: { name: "zoneVolume", type: "Dimmer", internal: true },
    zoneMute: { name: "zoneMute", type: "Switch", internal: true },
    add: { name: "add", type: "String" },
    remove: { name: "remove", type: "String" },
    standalone: { name: "standalone", type: "Switch" },
    mute: { name: "mute", type: "Switch" },
};

// Get all Sonos devices in device registry
var getAllSonosDevices = function () {
    let foundDevices = Array.from(osgi.getService("org.openhab.core.thing.ThingRegistry").getAll());
    return foundDevices.filter(thing => thing.getUID().getId().startsWith(config.sonosIdentifierString));
}

class SonosController {

    constructor() {
        logger.info("Sonos Controller is initializing.");
        
        // Loading all devices
        this.devices = getAllSonosDevices().map(device => new SonosDevice(device));

        var volumeTriggeringItems = new Array();
        var zoneMuteTriggeringItems = new Array();
        this.devices.forEach(device => {
            volumeTriggeringItems.push(triggers.ItemStateChangeTrigger(device.items["volume"].name));
            volumeTriggeringItems.push(triggers.ItemCommandTrigger(device.items["zoneVolume"].name));
            zoneMuteTriggeringItems.push(triggers.ItemCommandTrigger(device.items["zoneMute"].name));
        });

        // Add controller rule
        rules.JSRule({
            name: "Sonos Controller: Command Item",
            id: "SonosController_Command",
            tags: config.controllerTags,
            description: "Executes controller commands for given zone",
            triggers: triggers.ItemCommandTrigger(config.sonosControllerItem),
            execute: event => {
                logger.info("Sonos Controller command detected!");
                var sonosClient = this.loadClientConfig(event.receivedCommand);
                this.executeClientCommand(sonosClient);
            }
        });

        // Add volume rule
        rules.JSRule({
            name: "Sonos Controller: Volume Control",
            id: "SonosController_VolumeControl",
            tags: config.controllerTags,
            description: "Manages zoneVolume commands",
            triggers: volumeTriggeringItems,
            execute: event => {
                let zoneMembers = this.devices[0].getDeviceByItem(this, event.itemName).getZoneMembers();
                if(event.receivedCommand) {
                    let item = items.getItem(event.itemName);
                    let volumeDifference = event.receivedCommand - item.history.previousState();
                    zoneMembers.forEach(device => device.setVolume(device.getVolume() + volumeDifference));
                } else {
                    var volume = 0;
                    zoneMembers.forEach(device => {
                        volume += device.getVolume();
                    })
                    volume = volume / zoneMembers.length
                    zoneMembers.forEach(device => {
                        device.setZoneVolume(volume);
                    })
                }

            }
        });

        // Add volume rule
        rules.JSRule({
            name: "Sonos Controller: Volume Mute Control",
            id: "SonosController_VolumeMuteControl",
            tags: config.controllerTags,
            description: "Manages zoneMute commands",
            triggers: zoneMuteTriggeringItems,
            execute: event => {
                let zoneMembers = this.devices[0].getDeviceByItem(this, event.itemName).getZoneMembers();
                console.log(event)
                if(event.receivedCommand === "ON") {
                    zoneMembers.forEach(device => device.setMute(true));
                } else {
                    zoneMembers.forEach(device => device.setMute(false));
                }
            }
        });
        
        this.updateUiConfig();
        logger.info("Sonos Controller is ready.");

    }

    getDeviceByZone(zoneName) {
        let device = this.devices.find(device => device.getZoneName() === zoneName);
        if (device != undefined) {
            return device;
        }
        return null;
    }

    getActiveZones() {
        return this.devices.filter(device => device.getControl() === "PLAY")
    }

    loadClientConfig(string) {
        let conf = JSON.parse(string);
        var client =  new SonosClient(conf.zone, conf.command, conf.targetZone, conf.uri)
        client.setZone(this.getDeviceByZone(client.zone));
        client.setTargetZone(this.getDeviceByZone(client.targetZone));
        return client;
    }

    executeClientCommand(sonosClient) {
        if(sonosClient.getCommand() === "add") {
            sonosClient.getTargetZone().getCoordinator().addDevice(sonosClient.getZone());
        }
        if(sonosClient.getCommand() === "remove") {
            sonosClient.getZone().getCoordinator().removeDevice(sonosClient.getZone());
        }
        if(sonosClient.getCommand() === ("pause" || "pause" || "stop")) {
            sonosClient.getZone().getCoordinator().setControl(sonosClient.getCommand());
        }
        if(sonosClient.getCommand() === "playUri") {
            sonosClient.getZone().getCoordinator().playUri(sonosClient.getUri());
        }
        if(sonosClient.getCommand() === "addOrPlay") {
            if(this.getActiveZones().length > 0){
                this.getActiveZones()[0].getCoordinator().addDevice(sonosClient.getZone());
            } else {
                sonosClient.getZone().getCoordinator().playUri(sonosClient.getUri());
            }
        }
    }

    updateUiConfig() {
        var uiConfiguration = new Array();
        this.devices.forEach(device => {
            uiConfiguration.push({
                name: device.getZoneName(),
                items: {
                    player: device.items["player"].name,
                    album: device.items["album"].name,
                    artist: device.items["artist"].name,
                    coverArt: device.items["coverArt"].name,
                    title: device.items["title"].name,
                    track: device.items["track"].name,
                    coordinator: device.items["coordinator"].name,
                    volume: device.items["volume"].name,
                    mute: device.items["mute"].name,
                    zoneVolume: device.items["zoneVolume"].name,
                    zoneMute: device.items["zoneMute"].name,
                }    
            });
        });
        uiConfigItem.postUpdate(JSON.stringify(uiConfiguration));
    }
}

class SonosDevice extends Device{
    constructor(device) {
        super(device);
        this.loadItems(channelIds, false, new Array(controllerGroupItem.name), config.controllerTags); 
    };

    addDevice(device) {
        logger.info("Adding \"" + device.getLabel() + "\" to device \"" + this.getLabel() + "\".");
        if(device.getId() != this.getId() && this.getId() != device.getCoordinator().getId()) {
           this.items["add"].sendCommand(device.getId())
        }
    }

    removeDevice(device) {
        logger.info("Removing \"" + device.getLabel() + "\" from device \"" + this.getLabel() + "\".");
        if(device.getId() != this.getId()) {
            this.items["remove"].sendCommand(device.getId())
        } else {
            this.items["standalone"].sendCommand("ON")
        }
    }

    playUri(uri) {
        logger.info("Playing Uri \"" + uri + "\" to device \"" + this.getLabel() + "\".");
        this.items["playUri"].sendCommand(uri);
        return this;
    }

    getControl() {
        return this.items["player"].state;
    }

    setControl(control) {
        this.items["player"].sendCommand(control.toUpperCase());
        return this;
    }

    getZoneName() {
        return this.items["zoneName"].state;
    }

    getMute() {
        if(this.items["mute"].state === "ON") {
            return true;
        }
        return false;
    }

    setMute(value) {
        var command = "OFF";
        console.log(value)
        if(value) {
            command = "ON";
        };
        this.items["mute"].sendCommand(command);
        return this;
    }

    getVolume() {
        return parseFloat(this.items["volume"].state);
    }

    setVolume(value) {
        this.items["volume"].sendCommand(value);
        return this;
    }

    getZoneVolume(value) {
        return parseFloat(this.items["zoneVolume"].state);
        return this;
    }

    setZoneVolume(value) {
        this.items["zoneVolume"].postUpdate(value);
        return this;
    }

    getCoordinator() {
        if(this.items["coordinator"].state === "NULL" || this.items["coordinator"].state === null) {
            return this;
        }
        return this.getDevice(this, this.items["coordinator"].state);
    }

    getZoneMembers() {
        if(this.items["coordinator"].state === "NULL" || this.items["coordinator"].state === null) {
            return new Array(this);
        }
        return controller.devices.filter(device => device.items["coordinator"].state === this.items["coordinator"].state);
    }
}

var controller = null;
var controllerGroupItem = null;
var controllerItem = null
var uiConfigItem = null

scriptLoaded = function () {
    controllerGroupItem = addItem(config.controllerGroupItem, "Group", "Sonos Controller Group", undefined, config.controllerTags);
    controllerItem = addItem(config.sonosControllerItem, "String", "Sonos Controller Command Item", new Array(controllerGroupItem.name), config.controllerTags);
    uiConfigItem = addItem(config.sonosControllerUiConfig, "String", "Sonos Controller Ui Config Item", new Array(controllerGroupItem.name), config.controllerTags);
    loadedDate = Date.now();
    controller = new SonosController();
}

scriptUnloaded = function () {
    logger.info("Sonos coordinator uninialized.");
}
