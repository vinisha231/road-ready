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

  draw(ctx, t) {
    if (this.dead) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    const bob = Math.sin(t * 9 + this.traveled * 4) * 0.06;
    switch (this.kind) {
      case 'squirrel': {
        ctx.rotate(Math.atan2(this.dy, this.dx));
        ctx.fillStyle = '#8a5a33';
        ctx.beginPath(); ctx.ellipse(0, 0, 0.32, 0.16, 0, 0, U.TAU); ctx.fill();
        ctx.strokeStyle = '#8a5a33'; ctx.lineWidth = 0.14;
        ctx.beginPath(); ctx.moveTo(-0.28, 0); ctx.quadraticCurveTo(-0.62, -0.25, -0.5, -0.5); ctx.stroke();
        break;
      }
      case 'deer': {
        ctx.rotate(Math.atan2(this.dy, this.dx));
        ctx.fillStyle = '#a87f4f';
        ctx.beginPath(); ctx.ellipse(0, 0, 0.85, 0.38, 0, 0, U.TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(0.85, 0, 0.22, 0, U.TAU); ctx.fill();
        ctx.strokeStyle = '#6e5230'; ctx.lineWidth = 0.08;
        ctx.beginPath();
        ctx.moveTo(0.9, -0.15); ctx.lineTo(1.15, -0.5); ctx.moveTo(1.0, -0.32); ctx.lineTo(1.25, -0.32);
        ctx.stroke();
        break;
      }
      case 'cart': {
        ctx.rotate(Math.atan2(this.dy, this.dx));
        ctx.strokeStyle = '#aab2bd'; ctx.lineWidth = 0.1;
        ctx.strokeRect(-0.5, -0.35, 1.0, 0.7);
        ctx.beginPath();
        ctx.moveTo(-0.5, 0); ctx.lineTo(0.5, 0); ctx.moveTo(0, -0.35); ctx.lineTo(0, 0.35);
        ctx.stroke();
        break;
      }
      default: { // people, drawn top-down: shoulders + head
        const palette = { kid: ['#e8554a', '#3f7fd1', '#3aa657'], adult: ['#6b7fa3', '#7a6f8f'], worker: ['#ff8c1a'] };
        const colors = palette[this.kind] || palette.adult;
        ctx.fillStyle = colors[Math.floor(this.traveled * 7) % colors.length === -1 ? 0 : Math.abs(Math.floor(this.x * 3)) % colors.length];
        const sh = this.kind === 'kid' ? 0.5 : 0.62;
        ctx.beginPath(); ctx.ellipse(bob, 0, sh / 2, sh / 1.45, Math.atan2(this.dy, this.dx) + Math.PI / 2, 0, U.TAU); ctx.fill();
        if (this.kind === 'worker') {
          ctx.strokeStyle = '#f5f04a'; ctx.lineWidth = 0.08;
          ctx.beginPath(); ctx.arc(bob, 0, sh / 2.6, 0, U.TAU); ctx.stroke();
        }
        ctx.fillStyle = this.kind === 'worker' ? '#ffd24a' : '#caa080';
        ctx.beginPath(); ctx.arc(bob, 0, 0.18, 0, U.TAU); ctx.fill();
        break;
      }
    }
    ctx.restore();
  }
}
