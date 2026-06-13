/* RoadReady — keyboard input */
const Input = {
  keys: {},
  _just: new Set(),
  init() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys[e.code] = true;
      this._just.add(e.code);
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => { this.keys = {}; });
  },
  /* analog pedal state: keys ramp like a real foot, gamepads/wheels are passed through */
  analog: { gas: 0, brake: 0, steer: 0 },
  padActive: false,

  update(dt) {
    const k = this.keys;
    const gasT = (k.ArrowUp || k.KeyW) ? 1 : 0;
    const brT = (k.ArrowDown || k.KeyS) ? 1 : 0;
    const stT = ((k.ArrowRight || k.KeyD) ? 1 : 0) - ((k.ArrowLeft || k.KeyA) ? 1 : 0);
    if (gasT || brT || stT) this.padActive = false;

    let gp = null;
    try { gp = navigator.getGamepads ? navigator.getGamepads()[0] : null; } catch (e) { /* no pad API */ }
    if (gp && gp.connected) {
      const dz = (v) => (Math.abs(v) < 0.07 ? 0 : v);
      const st = dz(gp.axes[0] || 0);
      const gas = gp.buttons[7] ? gp.buttons[7].value : 0;   // RT / right pedal
      const brake = gp.buttons[6] ? gp.buttons[6].value : 0; // LT / left pedal
      if (st !== 0 || gas > 0.02 || brake > 0.02) this.padActive = true;
      if (this.padActive) {
        this.analog.steer = st;
        this.analog.gas = gas;
        this.analog.brake = brake;
        return;
      }
    }
    const ramp = (v, t, up, down) => (t > v ? Math.min(t, v + up * dt) : Math.max(t, v - down * dt));
    this.analog.gas = ramp(this.analog.gas, gasT, 3.2, 6);
    this.analog.brake = ramp(this.analog.brake, brT, 5, 9);
    this.analog.steer = stT; // the car model applies its own steering ramp
  },

  controls() {
    return {
      throttle: this.analog.gas - this.analog.brake,
      steer: this.analog.steer,
      handbrake: !!this.keys.Space,
    };
  },
  justPressed(code) { return this._just.has(code); },
  endFrame() { this._just.clear(); },
};
