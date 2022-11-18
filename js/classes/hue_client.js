class HueClient {

  constructor(client) {
    this.controller = cache.get("HUEController");
    this.lightbulb      = null;
    this.command        = null;
    this.pairedDevice   = null;
    this.color          = null;
    this.brightness     = null;
    this.turnLightOff   = null;
    this.transitionTime = null;
    this.transitionSteps = null;
    this.commandList  = {
      off: "off",
      on: "on",
      setColor: "setColor",
      setColorTransition: "setColorTransition",
      setBrightness: "setBrightness",
      pair: "pair",
      unpair: "unpair",
    }

    if(typeof client === "string") {
      this.setLightBulb(client);
    } else {
      this.lightbulb = client.lightbulb;
      this.command = client.command;
      this.pairedDevice = client.pairedDevice;
      this.color = client.color;
      this.brightness = client.brightness;
      this.turnLightOff = client.turnLightOff;
      this.transitionTime = client.transitionTime;
      this.transitionSteps = client.transitionSteps;
    }

  }

  send() {
    var controller = this.controller;
    this.controller = null;
    controller.executeClientCommand(this);
    this.controller = controller;
  }

  getLightBulb() {
    return this.lightbulb;
  }

  setLightBulb(value) {
    if(typeof value === "string") {
      value = this.controller.getEquipmentByItem(value);
    }
    this.lightbulb = value;
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

  getPairedDevice() {
    return this.pairedDevice;
  }

  setPairedDevice(value) {
    if(typeof value === "string") {
      value = this.controller.getEquipmentByItem(value);
    }
    this.pairedDevice = value;
    return this;
  }

  getColor() {
    return this.color;
  }

  setColor(value) {
    this.color = value;
    return this;
  }

  getBrightness() {
    return this.brightness;
  }

  setBrightness(value) {
    this.brightness = value;
    return this;
  }

  getTurnLightOff() {
    return this.turnLightOff;
  }

  setTurnLightOff(value) {
    this.turnLightOff = value;
    return this;
  }

  getTransitionTime() {
    return this.transitionTime;
  }

  setTransitionTime(value) {
    this.transitionTime = value;
    return this;
  }

  getTransitionSteps() {
    return this.transitionSteps;
  }

  setTransitionSteps(value) {
    this.transitionSteps = value;
    return this;
  }
}
