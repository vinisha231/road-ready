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
  controls() {
    const k = this.keys;
    const gas = (k.ArrowUp || k.KeyW) ? 1 : 0;
    const brake = (k.ArrowDown || k.KeyS) ? 1 : 0;
    return {
      throttle: gas - brake,
      steer: ((k.ArrowRight || k.KeyD) ? 1 : 0) - ((k.ArrowLeft || k.KeyA) ? 1 : 0),
      handbrake: !!k.Space,
    };
  },
  justPressed(code) { return this._just.has(code); },
  endFrame() { this._just.clear(); },
};
