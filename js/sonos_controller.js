load('/openhab/conf/automation/js/helpers/sonos_client.js');

let logger = log('SonosController');

const config = {
    sonosIdentifierString: "RINCON_",
    sonosControllerItem: "Sonos_Controller_Command"
}

const channelIds = {
    player: "control",
    playUri: "playuri",
    album: "currentalbum",
    artist: "currentartist",
    coverArt: "currentalbumart",
    title: "currenttitle",
    coordinator: "coordinator",
    localCoordinator: "localcoordinator",
    volume: "volume",
    zoneName: "zonename",
    add: "add",
    remove: "remove",
    standalone: "standalone",
    mute: "mute",
};

// Add an item to the item registry
var addItem = function (itemName = undefined, itemType = undefined, label = undefined) {
    let item = items.getItem(itemName, true);
    if(item) {
        return item;
    } else {
        return items.addItem({name: itemName, label: label, type: itemType});
    }
}

// Get all Sonos devices in device registry
var getAllSonosDevices = function () {
    let foundDevices = Array.from(osgi.getService("org.openhab.core.thing.ThingRegistry").getAll());
    return foundDevices.filter(thing => thing.getUID().getId().startsWith(config.sonosIdentifierString));
}

// Get all linked items to a device channel
var getChannelItem = function (thingUidString, channelIdString) {
    var item = items.getItemsByTag().find(item => {
        let channelUid = Array.from(osgi.getService("org.openhab.core.thing.link.ItemChannelLinkRegistry").getBoundChannels(item.name))
                            .find(channel => channel.getThingUID().getId().includes(config.sonosIdentifierString));
        if(channelUid != undefined) {
            return channelUid.getThingUID().getId() === thingUidString && channelUid.getId() === channelIdString;
        }
        return null;
    });
    if(item === undefined) {
        return null;
    }
    return items.getItem(item.name);
}

class SonosController {

    constructor() {
        logger.info("Sonos Controller is initializing.");
        
        // Loading all devices
        this.devices = getAllSonosDevices().map(device => new SonosDevice(device));

        var muteTriggeringItems = new Array();
        var volumeTriggeringItems = new Array();

        // index all items which are used for rule triggers
        this.devices.forEach(device => {
            muteTriggeringItems.push(triggers.ItemStateChangeTrigger(device.items[channelIds.mute].name));
            volumeTriggeringItems.push(triggers.ItemStateChangeTrigger(device.items[channelIds.volume].name));
        });

        rules.JSRule({
            name: "Sonos Controller: Command Item",
            id: "SonosController_Command",
            tags: ["Sonos Controller", "Mute"],
            description: "Executes controller commands for given zone",
            triggers: triggers.ItemCommandTrigger(config.sonosControllerItem),
            execute: event => {
                logger.info("Sonos Controller command detected!");
                var sonosClient = this.loadClientConfig(event.receivedCommand);
                this.executeClientCommand(sonosClient);
            }
        });

        logger.info("Sonos Controller is ready.");

    }

    getDevice(deviceId) {
        let device = this.devices.find(device => device.id === deviceId);
        if (device != undefined) {
            return device;
        }
        return null;
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
}

class SonosDevice {
    constructor(device) {
        this.device = device;
        this.id = device.getUID().getId();
        this.label = device.getLabel();
        this.items = {};
        logger.info("New device \""+this.label+"\" initiated.");
        // Load linked items of device in items
        Object.keys(channelIds).forEach(key => {
            let item = getChannelItem(this.id, channelIds[key]);
            if(item != null) {
                this.items[channelIds[key]] = item;
            }
            else  {
                logger.error("Channel \"" + key + "\" not found for device  \""+this.label+"\".");
            }
        });
    };

    addDevice(device) {
        logger.info("Adding \"" + device.label + "\" to device \"" + this.label + "\".");
        if(device.id != this.id && this.id != device.getCoordinator().id) {
           this.items[channelIds.add].sendCommand(device.id)
        }
    }

    removeDevice(device) {
        logger.info("Removing \"" + device.label + "\" from device \"" + this.label + "\".");
        if(device.id != this.id) {
            this.items[channelIds.remove].sendCommand(device.id)
        } else {
            this.items[channelIds.standalone].sendCommand("ON")
        }
    }

    playUri(uri) {
        logger.info("Playing Uri \"" + uri + "\" to device \"" + this.label + "\".");
        this.items[channelIds.playUri].sendCommand(uri);
        return this;
    }

    getControl() {
        return this.items[channelIds.player].state;
    }

    setControl(control) {
        this.items[channelIds.player].sendCommand(control.toUpperCase());
        return this;
    }

    getZoneName() {
        return this.items[channelIds.zoneName].state;
    }

    getVolume() {
        return parseFloat(this.items[channelIds.volume].state);
    }

    setVolume(value) {
        this.items[channelIds.volume].sendCommand(value);
        return this;
    }

    getMute() {
        if(this.items[channelIds.mute].state === "ON") {
            return true;
        };
        return false;
    }

    setMute(value) {
        if(value === false) {
            this.items[channelIds.mute].sendCommand("OFF");
        } else {
        this.items[channelIds.mute].sendCommand("ON");
        }
        return this;
    }

    getCoordinator() {
        return controller.getDevice(this.items[channelIds.coordinator].state)
    }
}


var controller = null;
var controllerItem = null
scriptLoaded = function () {
    controllerItem = addItem(config.sonosControllerItem, "String", "Sonos Controller Command Item");
    loadedDate = Date.now();
    controller = new SonosController();
}

scriptUnloaded = function () {
    logger.info("Removing controller item:" + controllerItem.name);
    try {
        items.removeItem(foundItem);
    } catch (e) {
    }
    logger.info("Sonos coordinator uninialized.");
}
