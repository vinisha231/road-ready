/* Scenario 8 — Parallel Parking: THE FINAL BOSS.
   Infinite attempts. The grade is always "Needs Improvement". This is the most
   realistic thing we simulate. */
Scenarios.register({
  id: 'parallel-parking',
  title: 'Parallel Parking: The Final Boss',
  emoji: '🏁',
  order: 8,
  blurb: 'One gap, two parked cars, infinite attempts, zero mercy. The grade is predetermined.',
  brief: 'An 8.2-meter gap between two parked cars on a street with light traffic and onlookers who have nowhere better to be. Reverse in, straighten out, end within 30 cm of the curb. You get unlimited attempts (press R), and no matter how perfect it is, the grade will read "Needs Improvement". That is the law.',
  objectives: [
    'Back fully into the gap between the two parked cars',
    'Finish parallel to the curb (within ~10°) and close to it (~30 cm)',
    'Press R to reset the attempt. There is no attempt limit. There is also no escape.',
  ],
  settings: { rain: 0, night: 0.25 },

  create() {
    return {
      limit: 25,
      allowReset: true,
      spawn: { x: 28, y: 47.7, h: 0 },
      roads: [{ x: 0, y: 42, w: 170, h: 7.6, lanes: 2, twoWay: true }],
      lots: [{ x: 0, y: 49.6, w: 170, h: 2.7 }],
      obstacles: [
        { kind: 'lamp', x: 45, y: 53.2, a: -Math.PI / 2 },
        { kind: 'lamp', x: 95, y: 53.2, a: -Math.PI / 2 },
        Build.parkedCar(62, 50.95, 0, '#7d8aa0'),
        Build.parkedCar(74.6, 50.95, 0, '#b08968'),
        Build.parkedCar(30, 50.95, 0, '#6f7d94'),
        Build.parkedCar(108, 50.95, 0, '#7a9e7e'),
      ],
      marks: [
        { kind: 'bay', x: 68.3, y: 50.95, l: 7.4, w: 2.5, a: 0, target: true },
      ],
      zones: [],
      scenery: [
        { kind: 'building', x: 20, y: 62, w: 50, h: 22, color: '#705c6e', label: 'CAFÉ JUDGMENT' },
        { kind: 'building', x: 90, y: 62, w: 56, h: 22, color: '#5e6b66', label: 'BARBER & WITNESS' },
        ...Build.treeRow(10, 36, 160, 36, 7, 2),
      ],
      checkpoints: [],
      nextCp: 0,
      lights: [{ x: 45, y: 51, r: 12 }, { x: 95, y: 51, r: 12 }],
      goal: { type: 'park', bay: { x: 68.3, y: 50.95, l: 7.4, w: 2.5, a: 0 } },
      objective: '🏁 Back into the gap between the gray and tan cars',
      phone: false,
      traffic: [],
      _passT: 8,

      update(sim, dt) {
        // the occasional passerby, for psychological pressure
        this._passT -= dt;
        if (this._passT <= 0) {
          this._passT = U.rand(14, 22);
          this.traffic.push(new AICar([[168, 43.9], [2, 43.9]], { speed: 7.5 }));
        }
        for (const tc of this.traffic) {
          if (!tc._honked && Math.abs(tc.x - sim.car.x) < 9 && sim.car.speed < 2) {
            tc._honked = true;
            Sound.honk();
            UI.note('🚗 honk. (they could not do it either)');
          }
        }
        // grade the park the moment it lands
        if (sim.parked && !this._graded) {
          this._graded = true;
          const car = sim.car;
          const angDeg = Math.abs(U.angDiff(0, car.heading)) * 180 / Math.PI;
          const angle = Math.min(angDeg, Math.abs(180 - angDeg)); // nose-in or nose-out both count
          const curbCm = Math.max(0, Math.round((52.3 - (car.y + car.wid / 2)) * 100));
          sim.session.extraLines.push(
            `Attempt #${sim.attempts}. Angle: ${angle.toFixed(1)}°. Distance to curb: ${curbCm} cm.`,
            angle < 4 && curbCm < 30
              ? 'That was, objectively, a perfect parallel park. The grade below remains unchanged. Tradition is tradition.'
              : curbCm > 60
                ? 'You could park a second, smaller car between you and the curb.'
                : 'The curb has seen worse. It has also seen better. It says nothing.',
          );
        }
      },
      isComplete(sim) { return sim.parked; },
      draw(ctx) {
        // curb + sidewalk
        ctx.fillStyle = '#9aa0a8';
        ctx.fillRect(0, 52.3, 170, 0.5);
        ctx.fillStyle = 'rgba(170,176,186,0.5)';
        ctx.fillRect(0, 52.8, 170, 3.4);
      },
    };
  },
});
