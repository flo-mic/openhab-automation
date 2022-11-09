class SonosClient {

  constructor(client) {
    this.zone        = null;
    this.command     = null;
    this.targetZone  = null;
    this.uri         = null;
    this.addIfPossible = null
    this.commandList = {
      add: "add",
      remove: "remove",
      play: "play",
      pause: "pause",
    }

    if(typeof client === "string") {
      this.zone = client;
    } else {
      this.zone = client.zone;
      this.command = client.command;
      this.targetZone = client.targetZone;
      this.uri = client.uri;
      this.tuneIn = client.tuneIn;
      this.addIfPossible = client.addIfPossible;
    }
  }

  send() {
    var message = this;
    delete message["commandList"];
    Object.keys(message).forEach(key => {
      if(message[key] === null || message[key] === undefined) {
        delete message[key];
      }
    });
    items.getItem("Sonos_Controller_Command").sendCommand(JSON.stringify(message))
  }

  getZone() {
    return this.zone;
  }

  setZone(zone) {
    this.zone = zone;
    return this;
  }

  getCommand() {
    return this.command;
  }

  setCommand(command) {
    if(this.commandList[command]) {
      this.command = command;
    }
    return this;
  }

  getAddIfPossible(value) {
    return this.addIfPossible;
  }

  setAddIfPossible(value) {
    this.addIfPossible = !!value;
    return this;
  }

  getUri() {
    return this.uri;
  }

  setUri(value) {
    this.uri = value;
    return this;
  }

  getTuneInRadio() {
    return this.tuneIn;
  }

  setTuneInRadio(value) {
    this.tuneIn = value;
    return this;
  }

  getTargetZone() {
    return this.targetZone;
  }

  setTargetZone(value) {
    this.targetZone = value;
    return this;
  }
}
