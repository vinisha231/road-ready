/* Scenario 5 — Emergency Stop: three rounds of "STOP. NOW." The last one is in rain. */
Scenarios.register({
  id: 'emergency-stop',
  title: 'Emergency Stop & Skid Recovery',
  emoji: '🛑',
  order: 5,
  blurb: 'Three surprise stops. Round three is wet. Your brakes have opinions.',
  brief: 'A closed test road. Accelerate to the target speed, and when something appears in your lane, stop before it. Round 3 adds rain — braking distances grow and slamming the pedal becomes a personality test.',
  objectives: [
    'Round 1 & 2: hit the target speed, then stop clean when prompted',
    'Round 3: same thing, but wet — brake early, steer where you want to go',
    'Stopping short of the obstacle earns a bonus. Hitting it earns a memory.',
  ],
  settings: { rain: 0, night: 0 },

  create() {
    return {
      limit: 50,
      spawn: { x: 14, y: 53.4, h: 0 },
      roads: [{ x: 0, y: 48, w: 950, h: 7.4, lanes: 2 }],
      lots: [],
      obstacles: [
        { kind: 'sign', x: 30, y: 44, diamond: true, text: '🛑', color: '#f7c948' },
      ],
      marks: [
        { kind: 'text', x: 80, y: 44, text: 'TEST ROAD — AUTHORIZED DRAMA ONLY', size: 1.5, color: 'rgba(255,255,255,0.55)' },
      ],
      zones: [],
      scenery: [
        ...Build.treeRow(20, 36, 930, 36, 20, 3),
        ...Build.treeRow(20, 66, 930, 66, 18, 3),
      ],
      checkpoints: [],
      nextCp: 0,
      objective: 'Round 1/3 — accelerate to 40 mph',
      phone: false,

      rounds: [
        { trigger: 130, target: 40, obs: 'truck' },
        { trigger: 430, target: 45, obs: 'deer' },
        { trigger: 730, target: 40, obs: 'truck', rain: true },
      ],
      round: 0,
      phase: 'accel',

      update(sim, dt) {
        const car = sim.car;
        const r = this.rounds[this.round];
        if (!r) return;
        const mph = car.speed * U.MPH;

        if (this.phase === 'accel') {
          if (r.rain && !this._rainOn) {
            this._rainOn = true;
            Weather.set(0.85, 0.15);
            UI.setObjective(`Round 3/3 — rain rolling in. Accelerate to ${r.target} mph`);
          }
          if (car.x > r.trigger && (mph >= r.target - 2 || car.x > r.trigger + 120)) {
            this.phase = 'stop';
            const ox = car.x + 60 + car.speed * 0.6;
            this._obs = r.obs === 'deer'
              ? { kind: 'deerprop', x: ox, y: 53.4, a: 0, l: 1.8, w: 1.2, solid: true, event: 'hit-animal' }
              : { kind: 'truck', x: ox, y: 53.4, a: Math.PI / 2.3, l: 7.5, w: 2.5, solid: true };
            this.obstacles.push(this._obs);
            this._stopLine = ox - (r.obs === 'deer' ? 1.2 : 3.4);
            UI.setObjective('🛑 STOP — obstacle in your lane!');
          }
        } else if (this.phase === 'stop') {
          if (car.skidding && Weather.rain > 0.3) {
            UI.setObjective('Skidding! Ease off the brake, steer where you want to go');
          }
          const crashed = car.flash > 0.15;
          if (car.speed < 0.4 || crashed) {
            if (!crashed) {
              const gap = this._stopLine - (car.x + car.len / 2);
              if (gap > 0.2) sim.session.add('great-stop', `Stopped ${gap.toFixed(1)} m short — clean`);
            }
            this.obstacles.splice(this.obstacles.indexOf(this._obs), 1);
            this.phase = 'cruise';
            this._cruiseUntil = car.x + 45;
            this.round++;
            UI.setObjective(this.round < 3 ? '😮‍💨 Breathe. Roll on to the next round →' : '✅ All three stops done — roll to the end');
          }
        } else if (this.phase === 'cruise') {
          if (car.x > this._cruiseUntil) {
            if (this.round < 3) {
              this.phase = 'accel';
              const nr = this.rounds[this.round];
              UI.setObjective(`Round ${this.round + 1}/3 — accelerate to ${nr.target} mph`);
            }
          }
        }
      },
      isComplete(sim) { return this.round >= 3 && this.phase === 'cruise' && sim.car.x > this._cruiseUntil; },
    };
  },
});
