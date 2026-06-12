/* RoadReady — car physics. Units: meters, seconds, radians. */
class Car {
  constructor(x, y, heading, color = '#d8434e') {
    this.x = x; this.y = y; this.heading = heading;
    this.vx = 0; this.vy = 0;
    this.steer = 0;
    this.color = color;
    this.len = 4.4; this.wid = 1.85;
    this.wheelbase = 2.6;
    this.skidding = false;
    this.flash = 0;
  }

  static marks = []; // shared skid mark segments {x1,y1,x2,y2}

  static drawMarks(ctx) {
    if (!Car.marks.length) return;
    ctx.strokeStyle = 'rgba(20,20,24,0.42)';
    ctx.lineWidth = 0.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const m of Car.marks) { ctx.moveTo(m.x1, m.y1); ctx.lineTo(m.x2, m.y2); }
    ctx.stroke();
  }

  get speed() { return Math.hypot(this.vx, this.vy); }
  get forwardSpeed() { return this.vx * Math.cos(this.heading) + this.vy * Math.sin(this.heading); }
  obb() { return { x: this.x, y: this.y, l: this.len, w: this.wid, a: this.heading }; }

  /* c: {throttle -1..1, steer -1..1, handbrake}; grip: lateral decay rate (1/s);
     surface: 1 on asphalt, <1 on grass; brakeFx: braking efficiency (rain < 1) */
  update(dt, c, grip, surface = 1, brakeFx = 1) {
    const ACCEL = 7.2, BRAKE = 11, MAXFWD = 35, MAXREV = -6.5;
    const fx = Math.cos(this.heading), fy = Math.sin(this.heading);
    const rx = -fy, ry = fx;
    let vf = this.vx * fx + this.vy * fy;
    let vl = this.vx * rx + this.vy * ry;

    if (c.throttle > 0) {
      // engine power tapers as speed climbs — 0-30 is easy, 50-65 is a commitment
      const taper = Math.max(0.22, 1 - (Math.max(0, vf) / MAXFWD) * 0.85);
      vf += (vf < -0.2 ? BRAKE * brakeFx : ACCEL * taper * surface) * c.throttle * dt;
    } else if (c.throttle < 0) {
      vf += (vf > 0.2 ? BRAKE * brakeFx : ACCEL * 0.5) * c.throttle * dt;
    }
    this.braking = c.throttle < 0 && vf > 0.2;
    this.reversing = vf < -0.2;
    const drag = (Math.abs(vf) * 0.10 + 0.9 + (1 - surface) * 4) * dt;
    vf = Math.abs(vf) <= drag ? 0 : vf - Math.sign(vf) * drag;
    vf = U.clamp(vf, MAXREV, MAXFWD);

    // full steering lock only at low speed
    const speedFactor = 1 / (1 + Math.abs(vf) * 0.055);
    const target = c.steer * 0.55 * speedFactor;
    this.steer += U.clamp(target - this.steer, -3.2 * dt, 3.2 * dt);
    if (Math.abs(vf) > 0.05) this.heading += (vf / this.wheelbase) * Math.tan(this.steer) * dt;

    // lateral grip: tires bleed off sideways velocity at `grip` per second.
    // Rain or a pulled handbrake lowers it — corner too fast and you slide.
    const g = grip * (c.handbrake ? 0.22 : 1) * (0.4 + 0.6 * surface);
    vl *= Math.exp(-g * dt);
    this.skidding = Math.abs(vl) > 1.55 || (c.handbrake && Math.abs(vf) > 4);

    this.vx = fx * vf + rx * vl;
    this.vy = fy * vf + ry * vl;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.flash > 0) this.flash -= dt;

    // lay rubber from the rear axle while sliding
    const rax = this.x - fx * this.len * 0.32, ray = this.y - fy * this.len * 0.32;
    if (this.skidding && this.speed > 2 && this._rear) {
      for (const s of [-1, 1]) {
        Car.marks.push({
          x1: this._rear.x + rx * s * this.wid * 0.4, y1: this._rear.y + ry * s * this.wid * 0.4,
          x2: rax + rx * s * this.wid * 0.4, y2: ray + ry * s * this.wid * 0.4,
        });
      }
      if (Car.marks.length > 900) Car.marks.splice(0, Car.marks.length - 900);
    }
    this._rear = { x: rax, y: ray };
  }

  draw(ctx) {
    const L = this.len, W = this.wid;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.heading);
    // soft drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.roundRect(-L / 2 + 0.16, -W / 2 + 0.2, L + 0.18, W + 0.18, 0.6); ctx.fill();
    // tires
    ctx.fillStyle = '#15171c';
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      ctx.fillRect(sx * L * 0.32 - 0.42, sy * W * 0.5 - 0.16, 0.84, 0.32);
    }
    // body
    ctx.fillStyle = this.flash > 0 ? '#ffffff' : this.color;
    ctx.beginPath(); ctx.roundRect(-L / 2, -W / 2, L, W, 0.55); ctx.fill();
    // cabin glass
    ctx.fillStyle = 'rgba(18,24,36,0.85)';
    ctx.beginPath(); ctx.roundRect(-L * 0.20, -W / 2 + 0.24, L * 0.46, W - 0.48, 0.3); ctx.fill();
    // headlights & taillights
    ctx.fillStyle = '#ffefb0';
    ctx.fillRect(L / 2 - 0.30, -W / 2 + 0.16, 0.24, 0.44);
    ctx.fillRect(L / 2 - 0.30, W / 2 - 0.60, 0.24, 0.44);
    // taillights: glow under braking, white when backing up
    if (this.braking) {
      ctx.fillStyle = 'rgba(255,45,45,0.35)';
      ctx.beginPath(); ctx.arc(-L / 2, -W / 2 + 0.36, 0.65, 0, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(-L / 2, W / 2 - 0.36, 0.65, 0, U.TAU); ctx.fill();
    }
    ctx.fillStyle = this.braking ? '#ff2d2d' : '#e8473f';
    ctx.fillRect(-L / 2 + 0.06, -W / 2 + 0.16, 0.2, 0.4);
    ctx.fillRect(-L / 2 + 0.06, W / 2 - 0.56, 0.2, 0.4);
    if (this.reversing) {
      ctx.fillStyle = '#f2f4f8';
      ctx.fillRect(-L / 2 + 0.06, -0.42, 0.18, 0.32);
      ctx.fillRect(-L / 2 + 0.06, 0.1, 0.18, 0.32);
    }
    ctx.restore();
  }
}
