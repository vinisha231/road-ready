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
    'no-signal':         { pts: -6,   label: 'Changed lanes without signaling' },
    'signaled':          { pts: 3,    label: 'Signaled the lane change' },
    'curb':              { pts: -3,   label: 'Clipped the curb' },
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
    this.distM = 0;
    this.fatal = false;
    this.extraLines = []; // scenarios can inject custom feedback
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
    this.distM += (info.speedMs || 0) * dt;
    if (info.moving) this.movingT += dt;
    if (info.mphOver > 4) { this.speedingT += dt; if (info.inSchool) this.schoolSpeedingT += dt; }
    if (info.offroad && info.moving) this.offroadT += dt;
    if (info.tailgating) this.tailT += dt;
    if (info.tooSlow) this.slowT += dt;
    if (info.mph > this.maxMph) this.maxMph = info.mph;
  }

  finalize() {
    const pct = (x) => this.movingT > 1 ? Math.round(100 * x / this.movingT) : 0;
    this.speedPct = pct(this.speedingT);
    this.tailPct = pct(this.tailT);
    let score = 100 + this.bonuses - this.deductions;
    score -= Math.min(25, this.speedingT * 1.5 + this.schoolSpeedingT * 3.0);
    score -= Math.min(20, this.tailT * 1.0);
    score -= Math.min(15, this.offroadT * 1.5);
    score -= Math.min(10, this.slowT * 0.8);
    score = U.clamp(Math.round(score), 0, 100);
    if (this.fatal) score = Math.min(score, 8);
    const lines = [...this.extraLines, ...Scoring.feedback(this, score)];
    return { score, grade: Scoring.grade(score), lines, events: this.events };
  }
}

/* Detailed feedback. Honest. Occasionally too honest. */
Scoring.feedback = function (s, score) {
  const lines = [];
  const count = (type) => s.events.filter(e => e.type === type).length;

  if (s.fatal) lines.push('You hit a pedestrian. There is no feedback that softens that one. Slow down near crosswalks.');
  const crashes = count('collision') + count('collision-traffic') + count('lane-end-crash');
  if (crashes >= 3) lines.push(`${crashes} collisions. Your insurance premium just became a phone number.`);
  else if (crashes > 0) lines.push(`${crashes} collision${crashes > 1 ? 's' : ''}. Metal remembers, and so do we.`);
  if (s.tailPct >= 15) lines.push(`You tailgated for ${s.tailPct}% of that drive. Impressive commitment to reading bumper stickers.`);
  if (s.speedPct >= 25) lines.push(`Speeding ${s.speedPct}% of the time (topped out at ${s.maxMph} mph). The limit is not a suggestion with extra steps.`);
  else if (s.speedPct >= 8) lines.push(`Watch the speedometer — you were over the limit ${s.speedPct}% of the drive.`);
  if (s.schoolSpeedingT > 2) lines.push('Speeding in a school zone. Bold. Terrible, but bold.');
  const cones = count('cone');
  if (cones >= 4) lines.push(`Cones flattened: ${cones}. They had families.`);
  else if (cones > 0) lines.push(`You hit ${cones} cone${cones > 1 ? 's' : ''}. The construction crew sends their regards.`);
  const peeks = count('distracted');
  if (peeks > 0) lines.push(`You checked your phone ${peeks} time${peeks > 1 ? 's' : ''} while driving. The group chat can wait. It really can.`);
  if (count('resisted-phone') > 0 && peeks === 0) lines.push('Phone buzzed, you ignored it. Genuinely elite behavior.');
  if (count('hazard-avoided') > 0) lines.push(`Stopped in time for ${count('hazard-avoided')} hazard${count('hazard-avoided') > 1 ? 's' : ''}. Your reflexes are pulling their weight.`);
  if (count('hit-animal') > 0) lines.push('An animal was harmed in the making of this drive. Scan the roadsides, especially at night.');
  if (count('wrong-way') > 0) lines.push('You went the wrong way around the roundabout. Everyone else was wrong, surely.');
  if (count('failed-yield') > 0) lines.push('Yield means they go first. It is not a vibe check.');
  const nosig = count('no-signal');
  if (nosig > 0) lines.push(`${nosig} lane change${nosig > 1 ? 's' : ''} without a blinker. The turn signal is the only telepathy your car has — use it (Q/E).`);
  else if (count('signaled') > 0) lines.push('You used your blinkers unprompted. DMV examiners everywhere just felt a disturbance of joy.');
  if (count('curb') > 0) lines.push(`Curb strikes: ${count('curb')}. Rims are expensive; curbs are patient.`);
  if (s.offroadT > 4) lines.push(`${Math.round(s.offroadT)}s spent off the road. The grass is not a shortcut.`);
  if (s.slowT > 5) lines.push('Driving way under highway speed is its own hazard. Confidence, but earned.');
  if (count('harsh-brake') >= 3) lines.push('Lots of slam-braking. Smooth inputs, smooth life.');
  if (count('great-stop') > 0) lines.push('Textbook emergency stop. Frame it.');

  if (!lines.length) {
    lines.push(score >= 95
      ? 'Textbook drive. Your future insurance company would weep with joy.'
      : 'Clean drive overall — keep stacking reps until it is boring.');
  }
  return lines;
};

Scoring.grade = function (s) {
  const bands = [[97, 'A+'], [93, 'A'], [90, 'A-'], [87, 'B+'], [83, 'B'], [80, 'B-'],
    [77, 'C+'], [73, 'C'], [70, 'C-'], [67, 'D+'], [63, 'D'], [60, 'D-']];
  for (const [min, g] of bands) if (s >= min) return g;
  return 'F';
};
