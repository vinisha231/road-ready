/* RoadReady — replay recorder. Captures the run so your worst moment can be
   relived in slow motion. You're welcome. */
const Replay = {
  frames: [],
  clip: null,
  pt: 0,
  _acc: 0,

  reset() {
    this.frames = [];
    this.clip = null;
    this._acc = 0;
  },

  record(sim, dt) {
    this._acc += dt;
    if (this._acc < 1 / 30) return;
    this._acc = 0;
    this.frames.push({ t: sim.session.t, x: sim.car.x, y: sim.car.y, h: sim.car.heading });
    if (this.frames.length > 30 * 300) this.frames.splice(0, 900);
  },

  /* slice a window around the single most expensive mistake */
  buildWorst(session) {
    let worst = null;
    for (const ev of session.events) {
      if (ev.pts < 0 && (!worst || ev.pts < worst.pts)) worst = ev;
    }
    if (!worst || worst.pts > -6) return null;
    const fr = this.frames.filter(f => f.t >= worst.t - 5 && f.t <= worst.t + 2.5);
    if (fr.length < 12) return null;
    return { frames: fr, event: worst };
  },

  start(clip) {
    this.clip = clip;
    this.pt = clip.frames[0].t;
  },

  step(dt) {
    if (!this.clip) return;
    this.pt += dt * 0.55; // slow-mo, for maximum savoring
    const fr = this.clip.frames;
    if (this.pt > fr[fr.length - 1].t) this.pt = fr[0].t;
  },

  carState() {
    const fr = this.clip.frames;
    let i = fr.findIndex(f => f.t >= this.pt);
    if (i <= 0) return fr[0];
    const a = fr[i - 1], b = fr[i];
    const k = (this.pt - a.t) / Math.max(0.001, b.t - a.t);
    let dh = U.angDiff(a.h, b.h);
    return { x: U.lerp(a.x, b.x, k), y: U.lerp(a.y, b.y, k), h: a.h + dh * k };
  },
};
