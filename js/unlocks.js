/* RoadReady — progression: score 70+ to unlock the next scenario.
   Parent-assigned scenarios are always open (homework outranks the lock). */
const Unlocks = {
  PASS: 70,

  isUnlocked(id) {
    const list = Scenarios.list;
    const idx = list.findIndex(s => s.id === id);
    if (idx <= 0) return true;
    if (Store.load().assignments[id]) return true;
    const best = Store.progress(list[idx - 1].id).best;
    return best !== null && best >= this.PASS;
  },

  requirement(id) {
    const list = Scenarios.list;
    const idx = list.findIndex(s => s.id === id);
    if (idx <= 0) return '';
    return `Score ${this.PASS}+ on “${list[idx - 1].title}”`;
  },
};
