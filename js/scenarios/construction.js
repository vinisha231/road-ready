/* Scenario 6 — Construction Zone: confusing lane shifts, judgmental cones */
Scenarios.register({
  id: 'construction',
  title: 'Construction Zone',
  emoji: '🚧',
  order: 6,
  blurb: 'Right lane closed. Cones everywhere. They remember being hit.',
  brief: 'Road work ahead — the right lane is closed and a slow lead car sets the pace. Merge left at the taper, crawl past the crew at 25, and merge back when it opens. Each cone you flatten is recorded in a ledger somewhere.',
  objectives: [
    'Merge left before the cone taper',
    'Hold 25 mph through the work zone',
    'Do not tailgate the pace car (it will not be hurried)',
    'Cones: 0 casualties is the goal',
  ],
  settings: { rain: 0, night: 0 },

  create() {
    const obstacles = [
      { kind: 'sign', x: 150, y: 56.5, diamond: true, text: '🚧', color: '#ff8c1a' },
      { kind: 'sign', x: 252, y: 56.5, text: '25', small: 'WORK ZONE' },
      // taper into the left lane
      ...Build.coneLine(250, 70.6, 310, 65.8, 8),
      // hold the centerline past the work area
      ...Build.coneLine(316, 65.8, 560, 65.8, 18),
      // taper back out
      ...Build.coneLine(566, 65.8, 620, 70.6, 7),
      // the actual work: barrels, a digger, supplies
      { kind: 'barrel', x: 330, y: 68.6, l: 1, w: 1, solid: true },
      { kind: 'barrel', x: 410, y: 69, l: 1, w: 1, solid: true },
      { kind: 'barrel', x: 500, y: 68.6, l: 1, w: 1, solid: true },
      { kind: 'truck', x: 450, y: 68.4, a: 0.06, l: 7.5, w: 2.5, solid: true, color: '#d9a521' },
      { kind: 'barrier', x: 370, y: 68.8, a: 0, l: 3, w: 0.5, solid: true },
    ];
    return {
      limit: 45,
      spawn: { x: 12, y: 67.5, h: 0 },
      roads: [{ x: 0, y: 62, w: 850, h: 7.4, lanes: 2 }],
      lots: [],
      obstacles,
      marks: [
        { kind: 'arrow', x: 215, y: 67.5, a: -0.5 },
        { kind: 'arrow', x: 235, y: 66.5, a: -0.5 },
        { kind: 'text', x: 180, y: 58.5, text: 'ROAD WORK AHEAD', size: 1.5, color: '#ffb066' },
      ],
      zones: [{ x: 240, y: 58, w: 400, h: 16, kind: 'work', limit: 25 }],
      scenery: [
        ...Build.treeRow(20, 52, 830, 52, 16, 3),
        ...Build.treeRow(20, 80, 830, 80, 14, 3),
      ],
      checkpoints: [{ x: 835, y: 65.7, r: 6 }],
      nextCp: 0,
      objective: 'Work zone ahead — get into the left lane',
      phone: false,
      traffic: [new AICar([[55, 63.85], [845, 63.85]], { speed: 9 })],
      hazards: [
        { x: 420, y: 64, r: 26, kind: 'worker', sx: 438, sy: 67.8, dx: -0.3, dy: -1, range: 3.2 },
      ],
      isComplete() { return this.nextCp >= this.checkpoints.length; },
    };
  },
});
