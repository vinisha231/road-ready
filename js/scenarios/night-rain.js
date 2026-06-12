/* Scenario 7 — Midnight Rain Run: dark, wet, and full of corners that do not negotiate */
Scenarios.register({
  id: 'night-rain',
  title: 'Midnight Rain Run',
  emoji: '🌧️',
  order: 7,
  blurb: 'Country road, heavy rain, headlights only. "It was raining" is not a defense.',
  brief: 'A winding country road at midnight in heavy rain. Your headlights show you maybe 50 meters; the corners do not care about the posted 45. Brake before the turn, not in it — wet grip is roughly half what you think it is.',
  objectives: [
    'Reach the end of the road in one piece',
    'Brake BEFORE corners — coast through them',
    'Watch for wildlife at the edge of your headlights',
  ],
  settings: { rain: 0.85, night: 1 },

  create() {
    return {
      limit: 45,
      spawn: { x: 14, y: 401.7, h: 0 },
      roads: [
        { x: 0, y: 396, w: 268, h: 7.6, lanes: 2, twoWay: true },
        { x: 260.4, y: 248, w: 7.6, h: 155.6, lanes: 2, twoWay: true },
        { x: 260.4, y: 248, w: 259.6, h: 7.6, lanes: 2, twoWay: true },
        { x: 512.4, y: 118, w: 7.6, h: 137.6, lanes: 2, twoWay: true },
        { x: 512.4, y: 118, w: 307.6, h: 7.6, lanes: 2, twoWay: true },
      ],
      lots: [],
      obstacles: [
        { kind: 'sign', x: 238, y: 392, diamond: true, text: '↰', color: '#f7c948' },
        { kind: 'sign', x: 256, y: 270, diamond: true, text: '↱', color: '#f7c948' },
        { kind: 'sign', x: 478, y: 244, diamond: true, text: '↰', color: '#f7c948' },
        { kind: 'sign', x: 508, y: 140, diamond: true, text: '↱', color: '#f7c948' },
        { kind: 'sign', x: 60, y: 392, text: '45', small: 'SPEED LIMIT' },
      ],
      marks: [],
      zones: [],
      scenery: [
        ...Build.treeRow(10, 388, 250, 388, 14, 3),
        ...Build.treeRow(10, 412, 240, 412, 12, 3),
        ...Build.treeRow(252, 260, 252, 390, 9, 3),
        ...Build.treeRow(276, 270, 276, 396, 8, 3),
        ...Build.treeRow(280, 240, 500, 240, 12, 3),
        ...Build.treeRow(300, 264, 480, 264, 10, 3),
        ...Build.treeRow(504, 130, 504, 240, 7, 3),
        ...Build.treeRow(528, 140, 528, 250, 6, 3),
        ...Build.treeRow(540, 110, 800, 110, 14, 3),
        ...Build.treeRow(540, 134, 800, 134, 12, 3),
      ],
      checkpoints: [
        { x: 235, y: 399.8, r: 6, objective: 'Corner ahead — brake BEFORE the turn' },
        { x: 264.2, y: 330, r: 6 },
        { x: 300, y: 251.8, r: 6, objective: 'Through the bend — next one comes fast' },
        { x: 478, y: 251.8, r: 6, objective: 'Corner! Wet roads double your stopping distance' },
        { x: 516.2, y: 165, r: 6 },
        { x: 560, y: 121.8, r: 6, objective: 'Final stretch — watch the tree line' },
        { x: 800, y: 121.8, r: 7 },
      ],
      nextCp: 0,
      objective: 'Head east — and respect the rain',
      phone: false,
      hazards: [
        { x: 264.2, y: 300, r: 30, kind: 'squirrel', sx: 256, sy: 295, dx: 1, dy: 0.1, range: 14 },
        { x: 650, y: 121.8, r: 42, kind: 'deer', sx: 655, sy: 106, dx: 0.12, dy: 1, range: 20 },
      ],
      isComplete() { return this.nextCp >= this.checkpoints.length; },
    };
  },
});
