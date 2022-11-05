
class SonosClient {

  constructor(zone, command = null, targetZone = null, uri = null) {
    this.zone       = zone;
    this.command    = command;
    this.targetZone = targetZone;
    this.uri        = uri;
  }

  send() {
    items.getItem("Sonos_Controller_Command").sendCommand(JSON.stringify(this))
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
    this.command = command;
    return this;
  }

  getUri() {
    return this.uri;
  }

  setUri(uri) {
    this.uri = uri;
    return this;
  }

  getTargetZone() {
    return this.targetZone;
  }

  setTargetZone(targetZone) {
    this.targetZone = targetZone;
    return this;
  }
}
