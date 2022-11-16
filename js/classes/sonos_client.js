class SonosClient {

  constructor(client) {
    this.controller  = cache.get("SonosController");
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
      this.setZone(client);
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
    this.controller.executeClientCommand(this);
  }

  getZone() {
    return this.zone;
  }

  setZone(value) {
    if(typeof value === "string") {
      value = this.controller.getDeviceByZone(value);
    }
    this.zone = value;
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
    if(typeof value === "string") {
      value = this.controller.getDeviceByZone(value);
    }
    this.targetZone = value;
    return this;
  }
}
