/* RoadReady — scenario registry.
   A scenario: {id, title, emoji, blurb, order, objectives:[], conditions, settings:{rain,night},
   create() -> instance with roads/obstacles/zones/checkpoints/goal/update/isComplete} */
const Scenarios = {
  list: [],
  register(s) {
    this.list.push(s);
    this.list.sort((a, b) => a.order - b.order);
  },
  byId(id) { return this.list.find(s => s.id === id); },
};

/* shared builders */
const Build = {
  parkedCar(x, y, a, color) {
    return { kind: 'car', x, y, a, l: 4.4, w: 1.85, solid: true, color };
  },
  coneLine(x1, y1, x2, y2, n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1);
      out.push({ kind: 'cone', x: U.lerp(x1, x2, t), y: U.lerp(y1, y2, t), l: 0.6, w: 0.6, solid: true });
    }
    return out;
  },
  treeRow(x1, y1, x2, y2, n, jitter = 2) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1);
      out.push({ kind: 'tree', x: U.lerp(x1, x2, t) + U.rand(-jitter, jitter), y: U.lerp(y1, y2, t) + U.rand(-jitter, jitter), r: U.rand(1.6, 2.6) });
    }
    return out;
  },
};
