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

  /* plain notification toast, no points attached */
  note(text) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    this.el('toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 2400);
    setTimeout(() => t.remove(), 2900);
  },

  toast(ev) {
    Sound[ev.pts >= 0 ? 'good' : 'bad']();
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

  /* ---- results ---- */
  buildResults(sim, res) {
    const s = sim.scenario;
    const isFinalBoss = s.id === 'parallel-parking';
    const gradeShown = isFinalBoss ? 'Needs Improvement' : res.grade;
    const gradeNote = isFinalBoss
      ? `<p class="grade-note">Score ${res.score}/100, technically. But parallel parking grades are capped at “Needs Improvement” by federal tradition.*<br><span class="fine">*Attempt #${sim.attempts}. Infinite attempts remain. The curb is patient.</span></p>`
      : '';
    const passed = res.score >= Unlocks.PASS;
    const hue = res.score >= 80 ? 'var(--green)' : res.score >= 60 ? 'var(--amber)' : 'var(--red)';
    this.el('results').innerHTML = `
      <div class="inner">
        <div class="results-grid">
          <div class="results-main">
            <h2>${s.emoji} ${s.title} — drive complete</h2>
            <div class="score-row">
              <div class="score-ring" style="background:conic-gradient(${hue} ${res.score * 3.6}deg, #2a3140 0deg)"><span>${res.score}</span></div>
              <div class="grade-block">
                <div class="grade" style="color:${hue}">${gradeShown}</div>
                <div class="grade-sub">${passed && !isFinalBoss ? '✅ next scenario unlocked' : (isFinalBoss ? '' : `${Unlocks.PASS}+ unlocks the next scenario`)}</div>
              </div>
            </div>
            ${gradeNote}
            <ul class="feedback">${res.lines.map(l => `<li>${l}</li>`).join('')}</ul>
            <div class="stats-row">
              <span>⏱ ${Math.round(sim.session.t)}s</span>
              <span>🚀 top speed ${sim.session.maxMph} mph</span>
              <span>⚠️ ${sim.session.events.filter(e => e.pts < 0).length} incidents</span>
            </div>
            <div class="row">
              <button id="againBtn">Drive again</button>
              ${sim.clip ? '<button class="ghost" id="replayBtn">🎬 Watch your worst moment</button>' : ''}
              <button class="ghost" id="shareBtn">Share score</button>
              <button class="ghost" id="menuBtn">Menu</button>
            </div>
          </div>
          <aside class="results-side">
            <h3>🏆 Leaderboard</h3>
            ${Leaderboard.html(s.id, res.score)}
          </aside>
        </div>
      </div>`;
    this.el('againBtn').addEventListener('click', () => Sim.start(s.id));
    this.el('menuBtn').addEventListener('click', () => { Sim.state = 'menu'; UI.buildMenu(); });
    if (sim.clip) this.el('replayBtn').addEventListener('click', () => Sim.startReplay());
    this.el('shareBtn').addEventListener('click', (e) => UI.share(sim, res, gradeShown, e.target));
    this.show('results');
  },

  share(sim, res, gradeShown, btn) {
    const worst = [...sim.session.events].sort((a, b) => a.pts - b.pts)[0];
    const text = `🚗 RoadReady: I scored ${res.score}/100 (${gradeShown}) on ${sim.scenario.title}.` +
      (worst && worst.pts < 0 ? ` Lowlight: ${worst.label.toLowerCase()}.` : ' Flawless, honestly.') +
      ` Beat me: ${location.href}`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Share score'; }, 1600);
      }).catch(() => {});
    }
  },

  buildPause() {
    this.el('pause').innerHTML = `
      <div class="inner narrow center">
        <h2>Paused</h2>
        <p class="muted">The road will wait. Unlike your mom in the school pickup line.</p>
        <div class="row center">
          <button id="resumeBtn">Resume</button>
          <button class="ghost" id="restartBtn">Restart</button>
          <button class="ghost" id="quitBtn">Quit to menu</button>
        </div>
      </div>`;
    this.el('resumeBtn').addEventListener('click', () => { Sim.state = 'play'; UI.show(null); });
    this.el('restartBtn').addEventListener('click', () => Sim.start(Sim.scenario.id));
    this.el('quitBtn').addEventListener('click', () => { Sim.state = 'menu'; UI.buildMenu(); });
    this.show('pause');
  },

  replayCaption(clip, show) {
    const c = this.el('replayCap');
    if (!show) return c.classList.add('hidden');
    c.innerHTML = `<div class="rc-tag">🎬 YOUR WORST MOMENT</div>
      <div class="rc-event">${clip.event.label} (${clip.event.pts}) — ${Math.round(clip.event.t)}s into the drive</div>
      <button class="ghost" id="rcBack">Back to results</button>`;
    c.classList.remove('hidden');
    this.el('rcBack').addEventListener('click', () => Sim.endReplay());
  },
};
