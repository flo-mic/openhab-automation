load('/openhab/conf/automation/js/classes/sonos_client.js');
load('/openhab/conf/automation/js/classes/device.js');
load('/openhab/conf/automation/js/helpers/items.js');

let logger = log('SonosController');

const radiosConfig = {
    youFM: { name: "youFM", tuneInId: "24878", coverUrl: "https://cdn-profiles.tunein.com/s24878/images/logod.png?t=637438103740000000" },
    planet: { name: "planet", tuneInId: "2726", coverUrl: "https://cdn-profiles.tunein.com/s2726/images/logod.jpg?t=636656469348500000" },
    hr3: { name: "hr3", tuneInId: "57109", coverUrl: "https://cdn-profiles.tunein.com/s57109/images/logod.png?t=636553103806930000" },
    ffh: { name: "ffh", tuneInId: "17490", coverUrl: "https://cdn-profiles.tunein.com/s17490/images/logod.jpg?t=636656467547170000" },
    swr3: { name: "swr3", tuneInId: "24896", coverUrl: "https://cdn-profiles.tunein.com/s24896/images/logod.png?t=636680257044500000" },
}

const config = {
    controllerGroupItem: "Sonos_Controller",
    controllerTags: ["Sonos Controller"],
    sonosIdentifierString: "RINCON_",
    sonosControllerItem: "Sonos_Controller_Command",
    sonosControllerUiConfig: "Sonos_Controller_UiConfig",
    sonosControllerUiRadioConfig: "Sonos_Controller_UiRadioConfig"
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
    bass: { name: "bass", type: "Number" },
    treble: { name: "treble", type: "Number" },
    loudness: { name: "loudness", type: "Switch" },
    repeat: { name: "repeat", type: "String" },
    shuffle: { name: "shuffle", type: "Switch" },
    tuneIn: { name: "tuneinstationid", type: "String" },
    radio: { name: "radio", type: "String" },
};

class SonosController extends DeviceController {

    constructor() {
        super("Sonos Controller");
        
        // Loading all devices
        this.devices = this.loadDevices().map(device => new SonosDevice(device));

        // Identify item trigger event for rules
        var volumeTriggeringItems = new Array();
        var muteTriggeringItems = new Array();
        this.devices.forEach(device => {
            volumeTriggeringItems.push(triggers.ItemStateChangeTrigger(device.items["volume"].name));
            volumeTriggeringItems.push(triggers.ItemCommandTrigger(device.items["zoneVolume"].name));
            muteTriggeringItems.push(triggers.ItemStateChangeTrigger(device.items["mute"].name));
            muteTriggeringItems.push(triggers.ItemCommandTrigger(device.items["zoneMute"].name));
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
                let zoneMembers = this.getZoneMembers(this.getDeviceByItem(event.itemName));
                if(event.receivedCommand) {
                    let item = items.getItem(event.itemName);
                    let volumeDifference = event.receivedCommand - item.history.previousState(true);
                    zoneMembers.forEach(device => device.setVolume(device.getVolume() + volumeDifference));
                } else {
                    var volume = 0;
                    zoneMembers.forEach(device => {
                        volume += device.getVolume();
                    })
                    volume = volume / zoneMembers.length
                    zoneMembers.forEach(device => {
                        device.setZoneVolume(parseInt(volume));
                    })
                }

            }
        });

        // Add volume on mute rule
        rules.JSRule({
            name: "Sonos Controller: Volume Mute Control",
            id: "SonosController_VolumeMuteControl",
            tags: config.controllerTags,
            description: "Manages zoneMute commands",
            triggers: muteTriggeringItems,
            execute: event => {
                let zone = this.getDeviceByItem(event.itemName);
                if(event.receivedCommand) {
                    let zoneMembers = this.getZoneMembers(zone);
                    zoneMembers.forEach(device => {
                        device.setMute(event.receivedCommand)
                        device.setZoneMute(event.receivedCommand)
                    });
                } else {
                    if(event.newState === "ON") {
                        zone.items["volume"].postUpdate(0);
                    } else {
                        zone.items["volume"].postUpdate(zone.items["volume"].history.previousState(true));
                    }
                    this.refreshZoneVolume(zone);
                }
            }
        });
        
        // Update ui config item
        this.updateUiConfig();
        this.updateUiRadioConfig();
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

    getCoordinator(device) {
        if(device.items["coordinator"].state === "NULL" || device.items["coordinator"].state === null) {
            return this;
        }
        return this.getDevice(device.items["coordinator"].state);
    }

    getZoneMembers(device) {
        if(device.items["coordinator"].state === "NULL" || device.items["coordinator"].state === null) {
            return new Array(device);
        }
        return this.devices.filter(dev => dev.items["coordinator"].state === device.items["coordinator"].state);
    }

    loadDevices() {
        let foundDevices = Array.from(osgi.getService("org.openhab.core.thing.ThingRegistry").getAll());
        return foundDevices.filter(thing => thing.getUID().getId().startsWith(config.sonosIdentifierString));
    }

    loadClientConfig(string) {
        let conf = JSON.parse(string);
        var client =  new SonosClient(conf)
        client.setZone(this.getDeviceByZone(client.zone));
        client.setTargetZone(this.getDeviceByZone(client.targetZone));
        return client;
    }

    executeClientCommand(sonosClient) {
        if(sonosClient.getAddIfPossible() === true && this.getActiveZones().length > 0) {
            this.getCoordinator(this.getActiveZones()[0]).addDevice(this, sonosClient.getZone());
            return; 
        }
        switch(sonosClient.getCommand()) {
            case "add":
                this.getCoordinator(sonosClient.getTargetZone()).addDevice(this, sonosClient.getZone());
                break;
            case "remove":
                this.getCoordinator(sonosClient.getZone()).removeDevice(sonosClient.getZone(), this.getZoneMembers(sonosClient.getZone()));
                break;
            case "play" && sonosClient.getUri() !== null:
                this.getCoordinator(sonosClient.getZone()).playUri(sonosClient.getUri());
                break;
            case "play" && sonosClient.getTuneInRadio() !== null:
                this.getCoordinator(sonosClient.getZone()).playTuneInRadio(sonosClient.getUri());
                break;
            case "play":
            case "pause":
                this.getCoordinator(sonosClient.getZone()).setControl(sonosClient.getCommand());
                break;
            default:
        } 
     }

    refreshZoneVolume(zone) {
        let zoneMembers = this.getZoneMembers(zone);
        var isMute = true;
        zoneMembers.forEach(device => {
            if(device.getMute() === false) {
                isMute = false;
            }
        });
        zoneMembers.forEach(device => {
            device.setZoneMute(isMute);
        });
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
                    tuneIn: device.items["tuneIn"].name,
                    bass: device.items["bass"].name,
                    treble: device.items["treble"].name,
                    loudness: device.items["loudness"].name,
                    repeat: device.items["repeat"].name,
                    shuffle: device.items["shuffle"].name,
                }    
            });
        });
        // Sorrt Speaker alphabetical and send to Ui item
        uiConfiguration.sort(function(a, b){
            return (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0;
        });        
        uiConfigItem.postUpdate(JSON.stringify(uiConfiguration));
    }

    updateUiRadioConfig() {
        var radios = new Array();
        Object.keys(radiosConfig).forEach(key => {
            radios.push(radiosConfig[key]);
        });
        uiRadioConfigItem.postUpdate(JSON.stringify(radios));
    }
}

class SonosDevice extends Device{
    constructor(device) {
        super(device);
        this.loadItems(channelIds, true, new Array(controllerGroupItem.name), config.controllerTags); 
    };

    addDevice(controller, device) {
        logger.info("Adding \"" + device.getLabel() + "\" to device \"" + this.getLabel() + "\".");
        if(device.getId() != this.getId() && this.getId() != controller.getCoordinator(device).getId()) {
           this.items["add"].sendCommand(device.getId())
        }
    }

    removeDevice(device, zoneMembers) {
        if(device.getId() != this.getId()) {
            logger.info("Removing \"" + device.getLabel() + "\" from device \"" + this.getLabel() + "\".");
            this.items["remove"].sendCommand(device.getId())
        } else {
            if(zoneMembers.length > 1) {
                logger.info("Removing current controller \"" + device.getLabel() + "\" from zone \"" + device.getLabel() + " +" + zoneMembers.length -1 + "\".");
                this.items["standalone"].sendCommand("ON")
            }
        }
    }

    playUri(uri) {
        if(this.getControl() !== "PLAY") {
            this.setDefaultVolume();
        }
        logger.info("Playing Uri \"" + uri + "\" to device \"" + this.getLabel() + "\".");
        this.items["playUri"].sendCommand(uri);
        return this;
    }

    playTuneInRadio(radio) {
        if(this.getControl() !== "PLAY") {
            this.setDefaultVolume();
        }
        if(isInteger(radio)) {
            logger.info("Playing TuneIn Radio id \"" + radio + "\" to device \"" + this.getLabel() + "\".");
            this.items["tuneIn"].sendCommand(radio); 
        } else {
            logger.info("Playing TuneIn Radio \"" + radiosConfig[radio].name + "\" to device \"" + this.getLabel() + "\".");
            this.items["tuneIn"].sendCommand(radiosConfig[radio].tuneInId);
        }
        return this;
    }

    getItemControllerConfig(item) {
        var conf = null;
        this.items[item].tags.forEach(tag => {
            if (tag.startsWith("Sonos Controller:")) {
                try {
                    conf = JSON.parse(tag.split(config.controllerTags + ":")[1]);
                } catch (e) {
                    logger.error("Error while reading Sonos Controller tag of item \"" + item + "\".");
                    logger.error(e);
                }
            }
        }); 
        return conf;
    }

    setDefaultVolume() {
        let currentTime = new Date();
        let itemConfig = this.getItemControllerConfig("volume");
        if( itemConfig !== null) {
            var time = null;
            var volume = null;
            itemConfig.defaultVolume.forEach(config => {
                if(config.time !== undefined && config.volume !== undefined) {
                    var date = new Date(new Date(new Date().setHours(config.time.split(":")[0])).setMinutes(config.time.split(":")[1]));
                    if(time === null && date.getTime() <= currentTime.getTime()) {
                        time = date
                        volume = config.volume
                    } else {
                        if(time.getTime() < date.getTime() && date.getTime() <= currentTime.getTime()) {
                            time = date
                            volume = config.volume
                        }
                    }
                }
            });
            this.setVolume(volume);
        }
        return this;
    }

    getControl() {
        return this.items["player"].state;
    }

    setControl(control) {
        if(this.getControl() !== "PLAY") {
            this.setDefaultVolume();
        }
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
        if(value === true || value === "ON") {
            command = "ON";
        };
        this.items["mute"].sendCommand(command);
        return this;
    }

    setZoneMute(value) {
        var command = "OFF";
        if(value === true || value === "ON") {
            command = "ON";
        };
        this.items["zoneMute"].postUpdate(command);
        return this;
    }

    getVolume() {
        return parseInt(this.items["volume"].state);
    }

    setVolume(value) {
        if(value !== null && value !== undefined) {
            if(value < 0) {
                value = 0;
            }
            if(value > 100) {
                value = 100;
            }
            this.items["volume"].sendCommand(value);
        }
        return this;
    }

    getZoneVolume(value) {
        return parseInt(this.items["zoneVolume"].state);
    }

    setZoneVolume(value) {
        if(value < 0) {
            value = 0;
        }
        if(value > 100) {
            value = 100;
        }
        this.items["zoneVolume"].postUpdate(value);
        return this;
    }
}

var controller = null;
var controllerGroupItem = null;
var controllerItem = null
var uiConfigItem = null
var uiRadioConfigItem = null

scriptLoaded = function () {
    controllerGroupItem = addItem(config.controllerGroupItem, "Group", "Sonos Controller Group", undefined, config.controllerTags);
    controllerItem = addItem(config.sonosControllerItem, "String", "Sonos Controller Command Item", new Array(controllerGroupItem.name), config.controllerTags);
    uiConfigItem = addItem(config.sonosControllerUiConfig, "String", "Sonos Controller Ui Config Item", new Array(controllerGroupItem.name), config.controllerTags);
    uiRadioConfigItem = addItem(config.sonosControllerUiRadioConfig, "String", "Sonos Controller Ui Radio Config Item", new Array(controllerGroupItem.name), config.controllerTags);
    loadedDate = Date.now();
    controller = new SonosController();
}

scriptUnloaded = function () {
    logger.info("Sonos coordinator uninialized.");
}
