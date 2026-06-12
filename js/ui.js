/* RoadReady — DOM UI: menu, briefing, HUD, results */
const UI = {
  el(id) { return document.getElementById(id); },

  /* show one screen, or null for gameplay HUD */
  show(id) {
    for (const s of document.querySelectorAll('.screen')) s.classList.add('hidden');
    this.el('hud').classList.toggle('hidden', !!id);
    if (id) this.el(id).classList.remove('hidden');
  },

  buildMenu() {
    const name = Store.setting('name') || '';
    const assignments = Store.load().assignments;
    let cards = '';
    for (const s of Scenarios.list) {
      const p = Store.progress(s.id);
      const unlocked = Unlocks.isUnlocked(s.id);
      const assigned = !!assignments[s.id];
      cards += `
        <div class="card ${unlocked ? '' : 'locked'}" data-id="${s.id}" tabindex="0">
          <div class="card-emoji">${s.emoji}</div>
          <div class="card-body">
            <h3>${s.title}${assigned ? ' <span class="badge pin">📌 assigned</span>' : ''}</h3>
            <p>${s.blurb}</p>
            <div class="card-meta">
              ${p.best !== null ? `<span class="badge ok">best ${p.best}</span>` : ''}
              ${p.attempts ? `<span class="badge">${p.attempts} run${p.attempts > 1 ? 's' : ''}</span>` : ''}
              ${unlocked ? '' : `<span class="badge lock">🔒 ${Unlocks.requirement(s.id)}</span>`}
            </div>
          </div>
        </div>`;
    }
    this.el('menu').innerHTML = `
      <div class="inner">
        <h1 class="logo"><span class="road">Road</span><span class="ready">Ready</span> 🚗</h1>
        <p class="tagline">A driving simulator for teens. Crash here, not out there.</p>
        <div class="menu-bar">
          <label class="namefield">Driver name <input id="playerName" maxlength="12" value="${name}" placeholder="YOU"></label>
          <button class="ghost" id="parentBtn">Parent / Instructor view</button>
        </div>
        <div class="cards">${cards}</div>
        <p class="foot">↑↓←→ or WASD to drive · Space handbrake · P to (regrettably) check your phone · R resets a parking attempt · Esc pauses<br>
        Not a substitute for actual driver's ed. But significantly cheaper.</p>
      </div>`;
    this.el('playerName').addEventListener('change', (e) => {
      Store.setting('name', e.target.value.replace(/[<>&"]/g, '').trim());
    });
    this.el('parentBtn').addEventListener('click', () => Parent.show());
    for (const card of this.el('menu').querySelectorAll('.card:not(.locked)')) {
      card.addEventListener('click', () => Sim.brief(card.dataset.id));
    }
    this.show('menu');
  },

  buildBrief(s) {
    const cond = [];
    if (s.settings.rain > 0.5) cond.push('🌧️ heavy rain');
    else if (s.settings.rain > 0) cond.push('🌦️ light rain');
    if (s.settings.night > 0.7) cond.push('🌙 night');
    else if (s.settings.night > 0.2) cond.push('🌆 dusk');
    if (!cond.length) cond.push('☀️ clear day');
    this.el('brief').innerHTML = `
      <div class="inner narrow">
        <h2>${s.emoji} ${s.title}</h2>
        <p class="blurb">${s.brief || s.blurb}</p>
        <h4>Your objectives</h4>
        <ul class="objectives">${s.objectives.map(o => `<li>${o}</li>`).join('')}</ul>
        <p class="conditions">Conditions: ${cond.join(' · ')}</p>
        <div class="row">
          <button id="startBtn">Start driving</button>
          <button class="ghost" id="backBtn">Back</button>
        </div>
      </div>`;
    this.el('startBtn').addEventListener('click', () => Sim.start(s.id));
    this.el('backBtn').addEventListener('click', () => UI.buildMenu());
    this.show('brief');
  },

  /* ---- HUD ---- */
  setObjective(text) { this.el('objective').textContent = text; },

  updateHUD(sim) {
    const mph = Math.round(sim.car.speed * U.MPH);
    this.el('speedVal').textContent = mph;
    this.el('limitVal').textContent = sim.limit;
    this.el('limitSign').classList.toggle('over', mph > sim.limit + 4);
    this.el('speedo').classList.toggle('skid', sim.car.skidding);
  },

  setZone(text) {
    const z = this.el('zoneBanner');
    if (text) { z.textContent = text; z.classList.remove('hidden'); }
    else z.classList.add('hidden');
  },

  attempts(n) {
    const a = this.el('attempts');
    if (n === null) a.classList.add('hidden');
    else {
      a.classList.remove('hidden');
      a.innerHTML = `Attempt <b>#${n}</b> <span class="hint">(R to reset — no judgment*)</span>`;
    }
  },

  toast(ev) {
    const t = document.createElement('div');
    t.className = 'toast ' + (ev.pts >= 0 ? 'good' : 'bad');
    t.innerHTML = `<b>${ev.pts > 0 ? '+' : ''}${ev.pts}</b> ${ev.label}`;
    this.el('toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3100);
  },

  phoneShow(msg) {
    this.el('phoneMsg').textContent = msg;
    this.el('phone').classList.remove('hidden');
  },
  phoneHide() { this.el('phone').classList.add('hidden'); },
  peekStart() { this.el('peekBlur').classList.remove('hidden'); },
  peekEnd() { this.el('peekBlur').classList.add('hidden'); },
};
