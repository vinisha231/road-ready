/* RoadReady — localStorage persistence: progress, leaderboards, assignments, settings */
const Store = {
  KEY: 'roadready-v1',
  _cache: null,
  load() {
    if (this._cache) return this._cache;
    try { this._cache = JSON.parse(localStorage.getItem(this.KEY)) || {}; }
    catch (e) { this._cache = {}; }
    this._cache.progress = this._cache.progress || {};
    this._cache.boards = this._cache.boards || {};
    this._cache.assignments = this._cache.assignments || {};
    this._cache.settings = this._cache.settings || {};
    return this._cache;
  },
  save() { try { localStorage.setItem(this.KEY, JSON.stringify(this._cache)); } catch (e) { /* private mode */ } },
  progress(id) {
    const p = this.load().progress;
    if (!p[id]) p[id] = { attempts: 0, best: null, last: null, events: {}, time: 0 };
    return p[id];
  },
  recordRun(id, res, session) {
    const p = this.progress(id);
    p.attempts += 1;
    p.last = res.score;
    if (p.best === null || res.score > p.best) p.best = res.score;
    p.time += Math.round(session.t);
    p.dist = (p.dist || 0) + Math.round(session.distM || 0);
    for (const ev of session.events) p.events[ev.type] = (p.events[ev.type] || 0) + 1;
    if (res.score >= 70 && this.load().assignments[id]) delete this.load().assignments[id];
    this.save();
  },
  setting(k, v) {
    const s = this.load().settings;
    if (v === undefined) return s[k];
    s[k] = v; this.save();
  },
};
