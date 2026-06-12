/* RoadReady — hazard actors: kids, adults, workers, squirrels, deer, runaway carts */
class Walker {
  constructor(kind, x, y, dirX, dirY, range) {
    this.kind = kind;
    this.x = x; this.y = y;
    const speeds = { kid: 2.7, adult: 1.6, worker: 1.5, squirrel: 7.5, deer: 5.5, cart: 2.4 };
    this.speed = speeds[kind] || 1.8;
    const n = Math.hypot(dirX, dirY) || 1;
    this.dx = dirX / n; this.dy = dirY / n;
    this.range = range || 18;
    this.traveled = 0;
    this.dead = false;
    this.rewarded = false;
    this.size = kind === 'squirrel' ? 0.55 : kind === 'deer' ? 1.7 : kind === 'cart' ? 1.0 : 0.75;
    this._zigT = 0; this._zig = 0;
  }

  get done() { return this.dead || this.traveled > this.range; }
  obb() { return { x: this.x, y: this.y, l: this.size, w: this.size, a: 0 }; }

  update(dt) {
    if (this.dead) return;
    if (this.kind === 'squirrel') {
      // squirrels do not believe in straight lines
      this._zigT -= dt;
      if (this._zigT <= 0) { this._zigT = U.rand(0.25, 0.6); this._zig = U.rand(-1.4, 1.4); }
      this.x += -this.dy * this._zig * 2.4 * dt;
      this.y += this.dx * this._zig * 2.4 * dt;
    }
    this.x += this.dx * this.speed * dt;
    this.y += this.dy * this.speed * dt;
    this.traveled += this.speed * dt;
  }
}
