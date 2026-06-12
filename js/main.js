/* RoadReady — simulation orchestrator & game loop */
const Sim = {
  state: 'menu', // menu | brief | play | pause | results | replay
  scenario: null,
  inst: null,
  car: null,
  session: null,
  clip: null,
  limit: 35,
  time: 0,
  attempts: 1,
  finished: false,

  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    const resize = () => {
      this.canvas.width = window.innerWidth * (window.devicePixelRatio || 1);
      this.canvas.height = window.innerHeight * (window.devicePixelRatio || 1);
    };
    window.addEventListener('resize', resize);
    resize();
    // alt-tabbing away should not end in a fence
    window.addEventListener('blur', () => {
      if (this.state === 'play') { this.state = 'pause'; UI.buildPause(); }
    });
    Input.init();
    Sound.init();
    UI.buildMenu();
    this._last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  },

  brief(id) {
    this.scenario = Scenarios.byId(id);
    this.state = 'brief';
    UI.buildBrief(this.scenario);
  },

  start(id) {
    const s = this.scenario = Scenarios.byId(id);
    this.inst = s.create();
    this.car = new Car(this.inst.spawn.x, this.inst.spawn.y, this.inst.spawn.h);
    Car.marks = [];
    this.session = new Session(id);
    this.clip = null;
    Weather.set(s.settings.rain, s.settings.night);
    Hazards.reset(this.inst.hazards);
    Phone.reset(this.inst.phone);
    Replay.reset();
    Camera.snap(this.car.x, this.car.y);
    this.time = 0;
    this.attempts = 1;
    this.parkT = 0;
    this.fatalT = 0;
    this.finished = false;
    this.parked = false;
    this.limit = this.inst.limit;
    UI.setObjective(this.inst.objective || '');
    UI.setZone(null);
    UI.attempts(this.inst.allowReset ? this.attempts : null);
    UI.show(null);
    this.state = 'play';
  },

  loop(now) {
    const dt = Math.min(0.045, Math.max(0.001, (now - this._last) / 1000));
    this._last = now;
    if (this.state === 'play') this.update(dt);
    else if (this.state === 'replay') this.updateReplay(dt);
    else if (this.state === 'brief' || this.state === 'results') {
      // Enter starts/retries, Esc backs out to the menu
      if (Input.justPressed('Enter')) this.start(this.scenario.id);
      else if (Input.justPressed('Escape')) { this.state = 'menu'; UI.buildMenu(); }
    }
    if (this.state === 'play' || this.state === 'replay' || this.state === 'pause') {
      Weather.updateRain(dt, this.canvas.width, this.canvas.height);
    }
    this.draw();
    Input.endFrame();
    requestAnimationFrame((t) => this.loop(t));
  },

  update(dt) {
    const inst = this.inst, car = this.car;
    this.time += dt;

    if (Input.justPressed('Escape')) { this.state = 'pause'; UI.buildPause(); return; }
    if (inst.allowReset && Input.justPressed('KeyR')) {
      car.x = inst.spawn.x; car.y = inst.spawn.y; car.heading = inst.spawn.h;
      car.vx = car.vy = 0; car.steer = 0;
      this.attempts++;
      this.parkT = 0;
      UI.attempts(this.attempts);
    }

    const c = Input.controls();
    const onRoad = World.onRoad(car.x, car.y, inst);
    const prevSpeed = car.forwardSpeed;
    car.update(dt, c, Weather.grip(), onRoad ? 1 : 0.55);

    // slam-braking costs points — unless something jumped out or the scenario demanded it
    const decel = (prevSpeed - car.forwardSpeed) / dt;
    if (decel > 9.5 && prevSpeed > 8 && Hazards.actors.length === 0 && inst.phase !== 'stop') {
      this.session.add('harsh-brake');
    }

    this.updateCollisions(dt);
    this.updateZonesAndScore(dt, onRoad);

    if (inst.checkpoints && inst.nextCp < inst.checkpoints.length) {
      const cp = inst.checkpoints[inst.nextCp];
      if (U.dist(car.x, car.y, cp.x, cp.y) < (cp.r || 4) + 1.2) {
        inst.nextCp++;
        Sound.checkpoint();
        if (cp.objective) UI.setObjective(cp.objective);
      }
    }
    if (inst.goal && inst.goal.type === 'park') this.checkPark(dt);

    Hazards.update(this, dt);
    Phone.update(this, dt);
    if (inst.update) inst.update(this, dt);
    Replay.record(this, dt);
    Camera.follow(car, dt);
    UI.updateHUD(this);

    if (this.finished) return;
    if (this.session.fatal) {
      this.fatalT += dt;
      if (this.fatalT > 1.6) this.finish();
      return;
    }
    if (inst.isComplete && inst.isComplete(this)) this.finish();
  },

  updateCollisions(dt) {
    const inst = this.inst, car = this.car;
    const SIZES = { cone: [0.6, 0.6], barrel: [1, 1], barrier: [3, 0.5], car: [4.4, 1.85], truck: [7.5, 2.5] };
    for (const o of inst.obstacles || []) {
      if (!o.solid) continue;
      const sz = SIZES[o.kind] || [o.l || 1, o.w || 1];
      const hit = U.obbCollide(car.obb(), { x: o.x, y: o.y, l: o.l || sz[0], w: o.w || sz[1], a: o.a || 0 });
      if (!hit) continue;
      if (o.kind === 'cone') {
        o.solid = false; o.flat = true;
        this.session.add('cone');
        car.vx *= 0.93; car.vy *= 0.93;
      } else {
        car.x += hit.ax[0] * hit.ov; car.y += hit.ax[1] * hit.ov;
        const vn = car.vx * hit.ax[0] + car.vy * hit.ax[1];
        if (vn < 0) { car.vx -= vn * hit.ax[0] * 1.4; car.vy -= vn * hit.ax[1] * 1.4; }
        car.vx *= 0.5; car.vy *= 0.5;
        if (Math.abs(vn) > 1.4) {
          this.session.add(o.event || 'collision', o.label);
          car.flash = 0.3;
        }
      }
    }
    for (const tc of inst.traffic || []) {
      tc.update(dt, [car, ...inst.traffic]);
      const hit = U.obbCollide(car.obb(), tc.obb());
      if (hit) {
        car.x += hit.ax[0] * hit.ov; car.y += hit.ax[1] * hit.ov;
        const vn = car.vx * hit.ax[0] + car.vy * hit.ax[1];
        if (vn < 0) { car.vx -= vn * hit.ax[0] * 1.3; car.vy -= vn * hit.ax[1] * 1.3; }
        car.vx *= 0.6; car.vy *= 0.6;
        tc.speed = Math.min(tc.speed, 2);
        this.session.add('collision-traffic');
        car.flash = 0.3;
      }
    }
    if (inst.traffic) inst.traffic = inst.traffic.filter(t => !t.gone);
  },

  updateZonesAndScore(dt, onRoad) {
    const inst = this.inst, car = this.car;
    let limit = inst.limit, inSchool = false, zoneText = null;
    for (const z of inst.zones || []) {
      if (U.inRect(car.x, car.y, z)) {
        limit = z.limit;
        inSchool = z.kind === 'school';
        zoneText = z.kind === 'school' ? `🏫 SCHOOL ZONE — ${z.limit} mph` : `🚧 WORK ZONE — ${z.limit} mph`;
      }
    }
    this.limit = limit;
    UI.setZone(zoneText);

    // tailgating: time-gap under ~0.85s to the car ahead at speed
    let tail = false;
    const fx = Math.cos(car.heading), fy = Math.sin(car.heading);
    for (const tc of inst.traffic || []) {
      const relX = tc.x - car.x, relY = tc.y - car.y;
      const ahead = relX * fx + relY * fy;
      const lat = Math.abs(-fy * relX + fx * relY);
      if (ahead > 0 && lat < 1.7) {
        const gap = ahead - (car.len + tc.len) / 2;
        if (gap < Math.max(5, car.speed * 0.85) && car.speed > 9) tail = true;
      }
    }

    const mph = car.speed * U.MPH;
    this.session.tick(dt, {
      moving: car.speed > 1,
      speedMs: car.speed,
      mph: Math.round(mph),
      mphOver: mph - limit,
      inSchool,
      offroad: !onRoad,
      tailgating: tail,
      tooSlow: !!inst.minMph && mph < inst.minMph && this.time > 10 && onRoad,
    });
  },

  checkPark(dt) {
    const bay = this.inst.goal.bay;
    const corners = U.obbCorners(this.car.obb());
    const cos = Math.cos(-(bay.a || 0)), sin = Math.sin(-(bay.a || 0));
    const inside = corners.every(p => {
      const dx = p[0] - bay.x, dy = p[1] - bay.y;
      const lx = dx * cos - dy * sin, ly = dx * sin + dy * cos;
      return Math.abs(lx) <= bay.l / 2 + 0.18 && Math.abs(ly) <= bay.w / 2 + 0.18;
    });
    if (inside && this.car.speed < 0.25) this.parkT += dt;
    else this.parkT = 0;
    if (this.parkT > 1.2 && !this.parked) {
      this.parked = true;
      this.session.add('parked');
    }
  },

  finish() {
    if (this.finished) return;
    this.finished = true;
    Phone.enabled = false;
    UI.phoneHide();
    UI.peekEnd();
    const res = this.session.finalize();
    this.lastRes = res;
    Store.recordRun(this.scenario.id, res, this.session);
    Leaderboard.submit(this.scenario.id, Store.setting('name') || 'YOU', res.score);
    this.clip = Replay.buildWorst(this.session);
    this.state = 'results';
    UI.buildResults(this, res);
  },

  startReplay() {
    if (!this.clip) return;
    Replay.start(this.clip);
    this.car.vx = this.car.vy = 0;
    this.state = 'replay';
    UI.show(null);
    UI.setObjective('');
    UI.setZone(null);
    UI.attempts(null);
    UI.phoneHide();
    UI.replayCaption(this.clip, true);
  },

  endReplay() {
    UI.replayCaption(null, false);
    this.state = 'results';
    UI.buildResults(this, this.lastRes);
  },

  updateReplay(dt) {
    Replay.step(dt);
    const g = Replay.carState();
    // derive ghost velocity so the camera leads and the speedo reads replay speed
    this.car.vx = (g.x - this.car.x) / Math.max(dt, 0.001);
    this.car.vy = (g.y - this.car.y) / Math.max(dt, 0.001);
    this.car.x = g.x; this.car.y = g.y; this.car.heading = g.h;
    Camera.follow(this.car, dt);
    UI.updateHUD(this);
    if (Input.justPressed('Escape')) this.endReplay();
  },

  draw() {
    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = Weather.groundColor();
    ctx.fillRect(0, 0, W, H);
    if (!this.inst || this.state === 'menu' || this.state === 'brief') return;

    Camera.apply(ctx, W, H);
    const inst = this.inst;
    World.drawRoads(ctx, inst);
    World.drawZones(ctx, inst);
    World.drawMarks(ctx, inst);
    Car.drawMarks(ctx);
    World.drawObstacles(ctx, inst);
    if (inst.draw) inst.draw(ctx, this);
    if (this.state !== 'replay' && inst.checkpoints && inst.nextCp < inst.checkpoints.length) {
      World.drawCheckpoint(ctx, inst.checkpoints[inst.nextCp], this.time);
    }
    // guidance arrow toward the current objective when it is far away
    if (this.state === 'play') {
      let tx = null, ty = null;
      if (inst.checkpoints && inst.nextCp < inst.checkpoints.length) {
        tx = inst.checkpoints[inst.nextCp].x; ty = inst.checkpoints[inst.nextCp].y;
      } else if (inst.goal && inst.goal.type === 'park' && !this.parked) {
        tx = inst.goal.bay.x; ty = inst.goal.bay.y;
      }
      if (tx !== null && U.dist(this.car.x, this.car.y, tx, ty) > 26) {
        const a = Math.atan2(ty - this.car.y, tx - this.car.x);
        ctx.save();
        ctx.translate(this.car.x + Math.cos(a) * 6.2, this.car.y + Math.sin(a) * 6.2);
        ctx.rotate(a);
        ctx.globalAlpha = 0.6 + Math.sin(this.time * 5) * 0.25;
        ctx.fillStyle = '#5fe07a';
        ctx.beginPath();
        ctx.moveTo(1.2, 0); ctx.lineTo(-0.6, -0.75); ctx.lineTo(-0.6, 0.75);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }
    for (const tc of inst.traffic || []) tc.draw(ctx);
    Hazards.draw(ctx, this.time);
    if (this.state === 'replay' && this.clip) {
      // ghost trail
      ctx.strokeStyle = 'rgba(255,210,74,0.5)';
      ctx.lineWidth = 0.25;
      ctx.setLineDash([0.8, 0.8]);
      ctx.beginPath();
      this.clip.frames.forEach((f, i) => i ? ctx.lineTo(f.x, f.y) : ctx.moveTo(f.x, f.y));
      ctx.stroke();
      ctx.setLineDash([]);
    }
    this.car.draw(ctx);
    World.drawScenery(ctx, inst);
    Weather.drawNight(ctx, W, H, this.car);
    Weather.drawRain(ctx, W, H);
  },
};

window.addEventListener('DOMContentLoaded', () => Sim.init());
