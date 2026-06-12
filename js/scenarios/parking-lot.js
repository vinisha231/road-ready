/* Scenario 1 — Parking Lot Basics: learn the pedals where the stakes are shopping carts */
Scenarios.register({
  id: 'parking-lot',
  title: 'Parking Lot Basics',
  emoji: '🅿️',
  order: 1,
  blurb: 'Learn the controls where the only witnesses are shopping carts.',
  brief: 'A quiet supermarket lot. Follow the checkpoints to get a feel for steering and braking, then finish by parking in the green bay. Try not to meet any carts personally.',
  objectives: [
    'Drive through each green checkpoint',
    'Keep it under 15 mph — this is a lot, not a launchpad',
    'Park fully inside the green bay and stop to finish',
  ],
  settings: { rain: 0, night: 0 },

  create() {
    const obstacles = [];
    const marks = [];
    // two banks of bays with painted lines; cars fill most slots
    for (const bankY of [60, 100]) {
      for (let x = 63; x <= 150; x += 3.2) {
        marks.push({ kind: 'bay', x, y: bankY, l: 2.9, w: 5.6, a: 0 });
        if (Math.abs(x - 111) < 1 && bankY === 60) continue; // the chosen one
        if (Math.random() < (bankY === 60 ? 0.75 : 0.45)) {
          obstacles.push(Build.parkedCar(x, bankY + U.rand(-0.2, 0.2), Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1)));
        }
      }
    }
    marks.push({ kind: 'bay', x: 111, y: 60, l: 2.9, w: 5.6, a: 0, target: true });

    return {
      limit: 15,
      spawn: { x: 26, y: 126, h: -Math.PI / 2 },
      lots: [{ x: 16, y: 16, w: 190, h: 124 }],
      roads: [],
      obstacles,
      marks,
      zones: [],
      scenery: [
        { kind: 'building', x: 56, y: 0, w: 110, h: 12, color: '#5c6b7a', label: 'MEGAMART' },
        ...Build.treeRow(8, 20, 8, 130, 6),
        ...Build.treeRow(212, 20, 212, 130, 6),
      ],
      checkpoints: [
        { x: 28, y: 44, r: 4.5, objective: 'Nice. Now head to the far corner →' },
        { x: 180, y: 40, r: 4.5, objective: 'Loop down to the bottom-right corner' },
        { x: 180, y: 126, r: 4.5, objective: 'Sweep back left along the bottom' },
        { x: 70, y: 126, r: 4.5, objective: '🅿️ Park in the green bay (middle bank) to finish' },
      ],
      nextCp: 0,
      goal: { type: 'park', bay: { x: 111, y: 60, l: 2.9, w: 5.6, a: 0 } },
      objective: 'Cruise up to the first checkpoint',
      phone: false,
      hazards: [
        { x: 150, y: 80, r: 24, kind: 'cart', sx: 162, sy: 70, dx: -0.6, dy: 0.8, range: 16 },
        { x: 80, y: 44, r: 20, kind: 'adult', sx: 84, sy: 26, dx: 0, dy: 1, range: 14 },
      ],
      isComplete(sim) { return sim.parked && this.nextCp >= this.checkpoints.length; },
    };
  },
});
