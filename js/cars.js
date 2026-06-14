/* RoadReady — selectable cars. Each model looks distinct in 3D AND drives
   differently: a Lamborghini leaps off the line, the trainer sedan is forgiving.
   Stats multiply the base physics (accel, top speed, lateral grip). */
const Cars = {
  list: [
    {
      id: 'sedan', name: 'Trainer Sedan', badge: '🚗',
      blurb: 'Forgiving, balanced, boring on purpose. Start here.',
      color: '#3f76d6', accent: '#0b1f44',
      stats: { accel: 0.9, top: 0.88, grip: 1.06 },
      spec: { len: 4.5, wid: 1.85, bodyH: 0.66, ride: 0.32, hood: 0.5, cabinLen: 0.46, cabinH: 0.56,
              cabinShift: -0.05, roof: '#dbe4f2', wheelR: 0.34, wing: 0 },
    },
    {
      id: 'bmw', name: 'BMW M-Series', badge: '🔵',
      blurb: 'Sport sedan. Quick, planted, drinks corners like espresso.',
      color: '#e9edf2', accent: '#16181c',
      stats: { accel: 1.08, top: 1.06, grip: 1.08 },
      spec: { len: 4.7, wid: 1.9, bodyH: 0.6, ride: 0.3, hood: 0.62, cabinLen: 0.4, cabinH: 0.5,
              cabinShift: -0.08, roof: '#1d2025', wheelR: 0.35, grille: true, wing: 0.1 },
    },
    {
      id: 'porsche', name: 'Porsche 911', badge: '🟡',
      blurb: 'Rounded, rear-engined, grips like it is offended you doubted it.',
      color: '#f0c020', accent: '#2a2206',
      stats: { accel: 1.16, top: 1.12, grip: 1.2 },
      spec: { len: 4.5, wid: 1.9, bodyH: 0.56, ride: 0.27, hood: 0.42, cabinLen: 0.5, cabinH: 0.46,
              cabinShift: 0.04, roof: '#f0c020', round: true, wheelR: 0.35, wing: 0.14, lowback: true },
    },
    {
      id: 'lambo', name: 'Lamborghini', badge: '🟢',
      blurb: 'A wedge with anger issues. Launches hard, very wide, very low.',
      color: '#26c244', accent: '#0a2a12',
      stats: { accel: 1.32, top: 1.24, grip: 1.12 },
      spec: { len: 4.8, wid: 2.05, bodyH: 0.5, ride: 0.24, hood: 0.5, cabinLen: 0.42, cabinH: 0.4,
              cabinShift: 0.1, roof: '#0c1410', wedge: true, wheelR: 0.36, wing: 0.26, lowback: true },
    },
  ],

  get(id) { return this.list.find(c => c.id === id) || this.list[0]; },
  selected() { return this.get(Store.setting('car') || 'sedan'); },
  select(id) { Store.setting('car', id); },

  /* push the chosen car's identity into a physics Car */
  applyStats(car) {
    const c = this.selected();
    car.stats = c.stats;
    car.color = c.color;
    car.len = c.spec.len;
    car.wid = c.spec.wid;
    car.modelId = c.id;
  },
};
