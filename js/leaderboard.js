/* RoadReady — local leaderboards. Nothing motivates like beating a sibling. */
const Leaderboard = {
  board(id) { return Store.load().boards[id] || []; },

  submit(id, name, score) {
    const boards = Store.load().boards;
    const b = boards[id] || (boards[id] = []);
    b.push({ name: (name || 'YOU').replace(/[<>&"]/g, '').slice(0, 12) || 'YOU', score, date: new Date().toISOString().slice(0, 10) });
    b.sort((x, y) => y.score - x.score);
    if (b.length > 10) b.length = 10;
    Store.save();
    return b;
  },

  html(id, highlightScore) {
    const b = this.board(id);
    if (!b.length) {
      return '<p class="muted">No scores yet. Set one, then send this to a sibling and assert dominance.</p>';
    }
    return '<ol class="board">' + b.map(e =>
      `<li${e.score === highlightScore ? ' class="me"' : ''}><span>${e.name}</span><span class="bdate">${e.date}</span><b>${e.score}</b></li>`
    ).join('') + '</ol>';
  },
};
