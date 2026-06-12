/* RoadReady — weather & time of day. Grip drops in rain; night dims the world. */
const Weather = {
  rain: 0,   // 0..1
  night: 0,  // 0..1

  set(rain, night) {
    this.rain = rain || 0;
    this.night = night || 0;
    this._drops = [];
  },

  /* Lateral grip decay rate for the car (1/s). Dry ≈ 7, heavy rain ≈ 2.8.
     Take that turn at 47 mph in the rain and you WILL slide. */
  grip() { return 7.0 - 4.2 * this.rain; },

  /* Stopping power also suffers when wet */
  brakeFactor() { return 1 - 0.25 * this.rain; },

  groundColor() {
    return `rgb(${Math.round(0x41 - this.night * 30)},${Math.round(0x57 - this.night * 36)},${Math.round(0x3b - this.night * 24)})`;
  },
};
