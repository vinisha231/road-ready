/* Scenario 3 — Highway Merge: universally terrifying, now with practice mode */
Scenarios.register({
  id: 'highway-merge',
  title: 'Highway Merge',
  emoji: '🛣️',
  order: 3,
  blurb: 'Match speed, find a gap, commit. Your lane ends whether you like it or not.',
  brief: 'Dusk on the interstate. You start on the acceleration lane — get up to highway speed, check the traffic, and merge before the cones end the discussion. Then survive to the end without tailgating anyone into therapy.',
  objectives: [
    'Accelerate to highway speed and merge before the lane ends',
    'Keep a real following distance (no tailgating)',
    'Going way under 45 mph on a 65 highway is its own hazard',
    'Phone stays in your pocket at 65 mph',
  ],
  settings: { rain: 0, night: 0.35 },

  create() {
    const laneYs = [79.85, 83.55, 87.25];
    const inst = {
      limit: 65,
      minMph: 45,
      spawn: { x: 70, y: 90.95, h: 0 },
      roads: [
        { x: 0, y: 78, w: 1600, h: 11.1, lanes: 3 },
        { x: 40, y: 89.1, w: 580, h: 3.7, lanes: 1, noEdges: true },
      ],
      lots: [],
      obstacles: [
        { kind: 'sign', x: 520, y: 96.5, diamond: true, text: '⚠', color: '#f7c948' },
        ...Build.coneLine(566, 92.5, 614, 90.2, 7),
        { kind: 'barrier', x: 625, y: 90.6, a: -0.1, l: 3.5, w: 0.6, solid: true, event: 'lane-end-crash' },
      ],
      marks: [
        { kind: 'arrow', x: 480, y: 90.95, a: 0 },
        { kind: 'arrow', x: 540, y: 90.6, a: -0.45 },
        { kind: 'text', x: 520, y: 99.5, text: 'LANE ENDS', size: 1.6, color: '#ffd24a' },
      ],
      zones: [],
      scenery: [
        ...Build.treeRow(30, 64, 1580, 64, 30, 4),
        ...Build.treeRow(30, 106, 1580, 106, 26, 5),
      ],
      checkpoints: [{ x: 1565, y: 83.55, r: 10 }],
      nextCp: 0,
      objective: 'Get up to speed and merge left before the cones',
      phone: true,
      traffic: [],
      _spawnT: 0,
      laneYs,

      update(sim, dt) {
        // steady stream of traffic from behind
        this._spawnT -= dt;
        if (this._spawnT <= 0) {
          this._spawnT = U.rand(1.3, 2.4);
          const y = U.choice(this.laneYs);
          const sx = U.clamp(sim.car.x - U.rand(180, 320), 5, 1500);
          const clear = this.traffic.every(t => Math.abs(t.y - y) > 1.5 || Math.abs(t.x - sx) > 30)
            && (Math.abs(sim.car.y - y) > 1.8 || Math.abs(sim.car.x - sx) > 40);
          if (clear) this.traffic.push(new AICar([[sx, y], [1598, y]], { speed: U.rand(26, 31) }));
        }
        if (!this._merged && sim.car.y < 89 && sim.car.x > 100) {
          this._merged = true;
          UI.setObjective('Merged. Now keep your gap and ride it out →');
        }
      },
      isComplete() { return this.nextCp >= this.checkpoints.length; },
    };
    // a few cars already on the road so it never feels empty
    for (let i = 0; i < 6; i++) {
      const y = U.choice(laneYs);
      inst.traffic.push(new AICar([[U.rand(150, 700), y], [1598, y]], { speed: U.rand(26, 30) }));
    }
    return inst;
  },
});
