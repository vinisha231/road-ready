/* RoadReady — scoring: events, deductions, grades, brutally honest feedback */
const Scoring = {
  TABLE: {
    'collision':         { pts: -12,  label: 'Collision' },
    'collision-traffic': { pts: -15,  label: 'Hit another vehicle' },
    'hit-pedestrian':    { pts: -100, label: 'Hit a pedestrian', fatal: true },
    'hit-animal':        { pts: -25,  label: 'Hit an animal' },
    'cone':              { pts: -4,   label: 'Flattened a cone' },
    'distracted':        { pts: -8,   label: 'Looked at your phone' },
    'resisted-phone':    { pts: 4,    label: 'Ignored your phone' },
    'hazard-avoided':    { pts: 6,    label: 'Stopped for a hazard' },
    'harsh-brake':       { pts: -2,   label: 'Harsh braking' },
    'wrong-way':         { pts: -20,  label: 'Wrong way in the roundabout' },
    'failed-yield':      { pts: -10,  label: 'Failed to yield' },
    'lane-end-crash':    { pts: -15,  label: 'Ran out of merge lane' },
    'great-stop':        { pts: 8,    label: 'Clean emergency stop' },
    'parked':            { pts: 10,   label: 'Parked it' },
  },
};

/* One run of one scenario */
class Session {
  constructor(scenarioId) {
    this.id = scenarioId;
    this.t = 0;
    this.events = [];
    this.bonuses = 0;
    this.deductions = 0;
    this.speedingT = 0; this.schoolSpeedingT = 0;
    this.offroadT = 0; this.movingT = 0;
    this.tailT = 0; this.slowT = 0;
    this.maxMph = 0;
    this.fatal = false;
    this._cooldown = {};
  }

  add(type, note) {
    const def = Scoring.TABLE[type];
    if (!def) return null;
    if (this._cooldown[type] !== undefined && this.t - this._cooldown[type] < 0.9) return null;
    this._cooldown[type] = this.t;
    const ev = { type, t: this.t, pts: def.pts, label: note || def.label };
    this.events.push(ev);
    if (def.pts >= 0) this.bonuses += def.pts; else this.deductions -= def.pts;
    if (def.fatal) this.fatal = true;
    if (typeof UI !== 'undefined' && UI.toast) UI.toast(ev);
    return ev;
  }

  /* called every frame with what the car is doing right now */
  tick(dt, info) {
    this.t += dt;
    if (info.moving) this.movingT += dt;
    if (info.mphOver > 4) { this.speedingT += dt; if (info.inSchool) this.schoolSpeedingT += dt; }
    if (info.offroad && info.moving) this.offroadT += dt;
    if (info.tailgating) this.tailT += dt;
    if (info.tooSlow) this.slowT += dt;
    if (info.mph > this.maxMph) this.maxMph = info.mph;
  }
}
