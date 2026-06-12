/* RoadReady — Parent / Instructor view: progress, weak spots, homework assignment */
const Parent = {
  LABELS: {
    'collision': 'Collisions with objects',
    'collision-traffic': 'Collisions with traffic',
    'hit-pedestrian': 'Pedestrian strikes',
    'hit-animal': 'Animal strikes',
    'cone': 'Cone casualties',
    'distracted': 'Phone distraction',
    'harsh-brake': 'Harsh braking',
    'wrong-way': 'Wrong-way driving',
    'failed-yield': 'Failing to yield',
    'lane-end-crash': 'Missed merges',
  },
  SUGGEST: {
    'collision': 'parking-lot',
    'collision-traffic': 'highway-merge',
    'hit-pedestrian': 'school-zone',
    'hit-animal': 'night-rain',
    'cone': 'construction',
    'distracted': 'school-zone',
    'harsh-brake': 'emergency-stop',
    'wrong-way': 'roundabout',
    'failed-yield': 'roundabout',
    'lane-end-crash': 'highway-merge',
  },

  show() {
    const data = Store.load();
    let rows = '', totalTime = 0, totalRuns = 0, totalDist = 0;
    for (const s of Scenarios.list) {
      const p = data.progress[s.id];
      const assigned = !!data.assignments[s.id];
      if (p) { totalTime += p.time || 0; totalRuns += p.attempts; totalDist += p.dist || 0; }
      rows += `<tr>
        <td>${s.emoji} ${s.title}</td>
        <td>${p ? p.attempts : 0}</td>
        <td>${p && p.best !== null ? p.best : '—'}</td>
        <td>${p && p.last !== null ? p.last : '—'}</td>
        <td><button class="mini${assigned ? ' on' : ''}" data-assign="${s.id}">${assigned ? '📌 Assigned' : 'Assign'}</button></td>
      </tr>`;
    }

    const agg = {};
    for (const id in data.progress) {
      for (const t in data.progress[id].events) {
        if (this.LABELS[t]) agg[t] = (agg[t] || 0) + data.progress[id].events[t];
      }
    }
    const weak = Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const weakHtml = weak.length
      ? '<ul class="weak">' + weak.map(([t, n]) => {
          const sug = this.SUGGEST[t] ? Scenarios.byId(this.SUGGEST[t]) : null;
          return `<li><b>${this.LABELS[t]}</b> <span class="count">×${n}</span>${sug ? `<span class="sug">→ practice: ${sug.emoji} ${sug.title}</span>` : ''}</li>`;
        }).join('') + '</ul>'
      : '<p class="muted">No incidents recorded yet. Either flawless driving, or no driving.</p>';

    UI.el('parent').innerHTML = `
      <div class="inner">
        <h2>👁️ Parent / Instructor view</h2>
        <p class="muted">Local progress for the driver on this computer. ${totalRuns} total runs · ${Math.round(totalTime / 60)} min behind the (virtual) wheel · ${(totalDist / 1609).toFixed(1)} virtual miles.</p>
        <div class="parent-grid">
          <div>
            <h4>Progress</h4>
            <table class="ptable">
              <thead><tr><th>Scenario</th><th>Runs</th><th>Best</th><th>Last</th><th>Homework</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
            <p class="muted small">“Assign” pins a scenario on the driver's menu (and unlocks it). It clears when they score ${Unlocks.PASS}+.</p>
          </div>
          <div>
            <h4>Weak spots</h4>
            ${weakHtml}
          </div>
        </div>
        <div class="row"><button class="ghost" id="parentBack">← Back to menu</button></div>
      </div>`;

    UI.el('parentBack').addEventListener('click', () => UI.buildMenu());
    for (const btn of UI.el('parent').querySelectorAll('[data-assign]')) {
      btn.addEventListener('click', () => {
        const id = btn.dataset.assign;
        const a = Store.load().assignments;
        if (a[id]) delete a[id]; else a[id] = true;
        Store.save();
        Parent.show();
      });
    }
    UI.show('parent');
  },
};
