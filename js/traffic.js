/* RoadReady — AI traffic: cars that follow waypoint paths and brake for whatever is ahead */
class AICar {
  constructor(path, opts = {}) {
    this.path = path;
    this.i = 1;
    this.x = path[0][0]; this.y = path[0][1];
    this.heading = Math.atan2(path[1][1] - path[0][1], path[1][0] - path[0][0]);
    this.cruise = opts.speed || 12;
    this.speed = opts.startSpeed !== undefined ? opts.startSpeed : this.cruise;
    this.loop = !!opts.loop;
    this.color = opts.color || U.choice(['#8a93a5', '#a8b3c5', '#6f7d94', '#b08968', '#7a9e7e', '#9f7aea', '#cf6679']);
    this.len = 4.4; this.wid = 1.85;
    this.gone = false;
  }

  obb() { return { x: this.x, y: this.y, l: this.len, w: this.wid, a: this.heading }; }

  update(dt, blockers) {
    if (this.gone) return;
    let tgt = this.path[this.i];
    if (tgt && U.dist(this.x, this.y, tgt[0], tgt[1]) < 3.2) {
      this.i++;
      if (this.i >= this.path.length) {
        if (this.loop) this.i = 0;
        else { this.gone = true; return; }
      }
    }
    tgt = this.path[this.i >= this.path.length ? 0 : this.i];
    const des = Math.atan2(tgt[1] - this.y, tgt[0] - this.x);
    this.heading += U.clamp(U.angDiff(this.heading, des), -1.9 * dt, 1.9 * dt);
    this.x += Math.cos(this.heading) * this.speed * dt;
    this.y += Math.sin(this.heading) * this.speed * dt;
    this.speed += U.clamp(this.cruise - this.speed, -7.5 * dt, 2.8 * dt);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.heading);
    const L = this.len, W = this.wid;
    ctx.fillStyle = '#101216';
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) ctx.fillRect(sx * L * 0.32 - 0.4, sy * W * 0.5 - 0.14, 0.8, 0.28);
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.roundRect(-L / 2, -W / 2, L, W, 0.5); ctx.fill();
    ctx.fillStyle = 'rgba(18,24,36,0.8)';
    ctx.beginPath(); ctx.roundRect(-L * 0.18, -W / 2 + 0.24, L * 0.44, W - 0.48, 0.3); ctx.fill();
    ctx.fillStyle = '#ffefb0';
    ctx.fillRect(L / 2 - 0.26, -W / 2 + 0.16, 0.2, 0.4);
    ctx.fillRect(L / 2 - 0.26, W / 2 - 0.56, 0.2, 0.4);
    ctx.restore();
  }
}
