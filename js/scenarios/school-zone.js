/* Scenario 2 — School Zone: 20 mph, kids everywhere, your phone WILL buzz */
Scenarios.register({
  id: 'school-zone',
  title: 'School Zone',
  emoji: '🏫',
  order: 2,
  blurb: 'Crosswalks, darting kids, a buzzing phone. 20 means 20.',
  brief: 'Drive the length of Maple Ave past Roosevelt Middle School at dismissal time. Hazard perception is the whole game here — kids appear from places kids should not appear from.',
  objectives: [
    'Reach the end of Maple Ave',
    'Obey the 20 mph school zone (it is very much enforced)',
    'Stop for pedestrians — bonus points for clean stops',
    'Ignore your phone. Seriously.',
  ],
  settings: { rain: 0, night: 0 },

  create() {
    const obstacles = [
      { kind: 'sign', x: 252, y: 50.5, diamond: true, text: '🏫', color: '#f7c948' },
      { kind: 'sign', x: 262, y: 50.5, text: '20', small: 'SCHOOL' },
      { kind: 'sign', x: 470, y: 50.5, text: '35', small: 'SPEED LIMIT' },
    ];
    // door-zone parked cars on the south shoulder
    for (let x = 185; x <= 255; x += 7.5) {
      obstacles.push(Build.parkedCar(x, 63.6, 0, U.choice(['#7d8aa0', '#a8b3c5', '#b08968', '#7a9e7e'])));
    }
    return {
      limit: 35,
      minMph: 0,
      spawn: { x: 12, y: 59.6, h: 0 },
      roads: [{ x: 0, y: 54, w: 720, h: 7.6, lanes: 2, twoWay: true }],
      lots: [],
      obstacles,
      marks: [
        { kind: 'crosswalk', x: 298, y: 54.3, w: 3, h: 7, horiz: false },
        { kind: 'crosswalk', x: 408, y: 54.3, w: 3, h: 7, horiz: false },
        { kind: 'text', x: 270, y: 59.6, text: 'SCHOOL', size: 2.2, a: 0, color: 'rgba(255,255,255,0.7)' },
        { kind: 'text', x: 290, y: 59.6, text: 'XING', size: 2.2, a: 0, color: 'rgba(255,255,255,0.7)' },
      ],
      zones: [{ x: 258, y: 47, w: 215, h: 21, kind: 'school', limit: 20 }],
      scenery: [
        { kind: 'building', x: 285, y: 18, w: 150, h: 26, color: '#8a5f49', label: 'ROOSEVELT MIDDLE SCHOOL' },
        { kind: 'building', x: 80, y: 22, w: 60, h: 20, color: '#5e6b66', label: 'LIBRARY' },
        ...Build.treeRow(20, 48, 700, 48, 16, 1.5),
        ...Build.treeRow(20, 70, 700, 70, 14, 2),
      ],
      checkpoints: [{ x: 706, y: 59.6, r: 6 }],
      nextCp: 0,
      objective: 'Head down Maple Ave — school zone ahead',
      phone: true,
      hazards: [
        { x: 150, y: 57, r: 26, kind: 'squirrel', sx: 152, sy: 50, dx: 0.1, dy: 1, range: 13 },
        { x: 224, y: 60, r: 22, kind: 'kid', sx: 228, sy: 64.5, dx: -0.1, dy: -1, range: 11 },
        { x: 298, y: 58, r: 30, kind: 'kid', sx: 299.5, sy: 49, dx: 0, dy: 1, range: 13 },
        { x: 408, y: 58, r: 30, kind: 'kid', sx: 409.5, sy: 67, dx: 0, dy: -1, range: 13 },
      ],
      isComplete() { return this.nextCp >= this.checkpoints.length; },
      draw(ctx) {
        // sidewalks
        ctx.fillStyle = 'rgba(170,176,186,0.5)';
        ctx.fillRect(0, 50.8, 720, 2.4);
        ctx.fillRect(0, 62.4, 720, 2.4);
      },
    };
  },
});
