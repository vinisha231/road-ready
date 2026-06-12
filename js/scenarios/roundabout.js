/* Scenario 4 — Roundabout: even adults fail these. Take the 3rd exit. */
Scenarios.register({
  id: 'roundabout',
  title: 'Roundabout',
  emoji: '🔄',
  order: 4,
  blurb: 'Yield, enter, counterclockwise, 3rd exit. Even adults fail these.',
  brief: 'One roundabout, four exits, two circulating cars who were here first. Yield at the entry, go counterclockwise, and leave at the 3rd exit (west). Going the wrong way is not a shortcut, it is a citation.',
  objectives: [
    'Yield to circulating traffic before entering',
    'Travel counterclockwise (the island stays on your left)',
    'Take the 3rd exit — west',
  ],
  settings: { rain: 0, night: 0 },

  create() {
    const CX = 200, CY = 200;
    const ringPath = [];
    for (let k = 0; k < 12; k++) {
      const th = (Math.PI / 2) - k * (Math.PI / 6); // decreasing θ = counterclockwise on screen
      ringPath.push([CX + 29 * Math.cos(th), CY + 29 * Math.sin(th)]);
    }
    const inst = {
      limit: 25,
      spawn: { x: 201.9, y: 386, h: -Math.PI / 2 },
      roads: [
        { ring: true, cx: CX, cy: CY, ri: 22, ro: 36, lanes: 1 },
        { x: 196.2, y: 230, w: 7.6, h: 170, lanes: 2, twoWay: true },
        { x: 196.2, y: 0, w: 7.6, h: 170, lanes: 2, twoWay: true },
        { x: 230, y: 196.2, w: 170, h: 7.6, lanes: 2, twoWay: true },
        { x: 0, y: 196.2, w: 170, h: 7.6, lanes: 2, twoWay: true },
      ],
      lots: [],
      obstacles: [
        { kind: 'sign', x: 209, y: 252, diamond: true, text: '🔄', color: '#f7c948' },
      ],
      marks: [
        { kind: 'text', x: 201.9, y: 246, text: 'YIELD', size: 1.7, a: -Math.PI / 2, color: 'rgba(255,255,255,0.8)' },
        { kind: 'arrow', x: 201.9, y: 256, a: -Math.PI / 2 },
      ],
      zones: [],
      scenery: [
        ...Build.treeRow(60, 230, 160, 330, 5, 8),
        ...Build.treeRow(240, 70, 340, 170, 5, 8),
        ...Build.treeRow(60, 70, 150, 150, 4, 8),
        ...Build.treeRow(250, 250, 340, 330, 4, 8),
      ],
      checkpoints: [
        { x: 201.9, y: 252, r: 5, objective: 'Yield… then enter when the circle is clear' },
        { x: CX + 29 * Math.cos(1.22), y: CY + 29 * Math.sin(1.22), r: 5, objective: 'Counterclockwise — island on your left' },
        { x: 229, y: 200, r: 5, objective: 'That was exit 1 (east). Keep circling.' },
        { x: 200, y: 171, r: 5, objective: 'Exit 2 (north) — not yours either.' },
        { x: 171, y: 200, r: 5, objective: '🎯 Exit 3 — take it west!' },
        { x: 120, y: 198.1, r: 5 },
        { x: 16, y: 198.1, r: 6 },
      ],
      nextCp: 0,
      objective: 'Approach the roundabout and yield at the line',
      phone: false,
      traffic: [
        new AICar(ringPath, { speed: 7.5, loop: true }),
        new AICar(ringPath.slice(6).concat(ringPath.slice(0, 6)), { speed: 8.5, loop: true }),
      ],
      _wrong: 0,
      _lastTh: undefined,
      _entered: false,

      update(sim) {
        const car = sim.car;
        const d = U.dist(car.x, car.y, CX, CY);
        const inRing = d > 22 && d < 36;
        if (inRing && car.speed > 1.5) {
          const th = Math.atan2(car.y - CY, car.x - CX);
          if (this._lastTh !== undefined) {
            this._wrong = Math.max(0, this._wrong + U.angDiff(this._lastTh, th));
            if (this._wrong > 0.7) {
              sim.session.add('wrong-way');
              this._wrong = -3; // long cooldown before it can fire again
            }
          }
          this._lastTh = th;
        } else {
          this._lastTh = undefined;
          if (!inRing) this._wrong = 0;
        }
        // yield check the moment they enter from the south
        if (!this._entered && inRing) {
          this._entered = true;
          const pth = Math.atan2(car.y - CY, car.x - CX);
          for (const tc of this.traffic) {
            const td = U.dist(tc.x, tc.y, CX, CY);
            if (td > 20 && td < 38) {
              const dth = U.angDiff(pth, Math.atan2(tc.y - CY, tc.x - CX));
              if (dth > 0.05 && dth < 1.5) { sim.session.add('failed-yield'); break; }
            }
          }
        }
      },
      isComplete() { return this.nextCp >= this.checkpoints.length; },
      draw(ctx) {
        // center island: apron ring, grass, a civic-minded shrub
        ctx.fillStyle = '#8e9299';
        ctx.beginPath(); ctx.arc(CX, CY, 23.5, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#41573b';
        ctx.beginPath(); ctx.arc(CX, CY, 21, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#4e6b40';
        ctx.beginPath(); ctx.arc(CX, CY, 6, 0, U.TAU); ctx.fill();
        ctx.fillStyle = '#395530';
        ctx.beginPath(); ctx.arc(CX - 8, CY + 5, 3, 0, U.TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(CX + 9, CY - 6, 3.5, 0, U.TAU); ctx.fill();
      },
    };
    return inst;
  },
});
