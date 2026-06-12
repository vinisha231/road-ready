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

  get speed() { return Math.hypot(this.vx, this.vy); }
  get forwardSpeed() { return this.vx * Math.cos(this.heading) + this.vy * Math.sin(this.heading); }
  obb() { return { x: this.x, y: this.y, l: this.len, w: this.wid, a: this.heading }; }

  /* c: {throttle -1..1, steer -1..1, handbrake}; grip: lateral decay rate (1/s);
     surface: 1 on asphalt, <1 on grass */
  update(dt, c, grip, surface = 1) {
    const ACCEL = 6.5, BRAKE = 11, MAXFWD = 35, MAXREV = -6.5;
    const fx = Math.cos(this.heading), fy = Math.sin(this.heading);
    const rx = -fy, ry = fx;
    let vf = this.vx * fx + this.vy * fy;
    let vl = this.vx * rx + this.vy * ry;

    if (c.throttle > 0) vf += (vf < -0.2 ? BRAKE : ACCEL * surface) * c.throttle * dt;
    else if (c.throttle < 0) vf += (vf > 0.2 ? BRAKE : ACCEL * 0.55) * c.throttle * dt;
    const drag = (Math.abs(vf) * 0.10 + 0.9 + (1 - surface) * 4) * dt;
    vf = Math.abs(vf) <= drag ? 0 : vf - Math.sign(vf) * drag;
    vf = U.clamp(vf, MAXREV, MAXFWD);

    // full steering lock only at low speed
    const speedFactor = 1 / (1 + Math.abs(vf) * 0.055);
    const target = c.steer * 0.55 * speedFactor;
    this.steer += U.clamp(target - this.steer, -3.2 * dt, 3.2 * dt);
    if (Math.abs(vf) > 0.05) this.heading += (vf / this.wheelbase) * Math.tan(this.steer) * dt;

    vl = 0; // perfect lateral grip for now

    this.vx = fx * vf + rx * vl;
    this.vy = fy * vf + ry * vl;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.flash > 0) this.flash -= dt;
  }
}
