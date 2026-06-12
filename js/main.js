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
    Input.init();
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

    const decel = (prevSpeed - car.forwardSpeed) / dt;
    if (decel > 9.5 && prevSpeed > 8 && Hazards.actors.length === 0) this.session.add('harsh-brake');

    this.updateCollisions(dt);
    this.updateZonesAndScore(dt, onRoad);

    if (inst.checkpoints && inst.nextCp < inst.checkpoints.length) {
      const cp = inst.checkpoints[inst.nextCp];
      if (U.dist(car.x, car.y, cp.x, cp.y) < (cp.r || 4) + 1.2) {
        inst.nextCp++;
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
