/* RoadReady — weather & time of day. Grip drops in rain; night dims the world. */
const Weather = {
  rain: 0,   // 0..1
  night: 0,  // 0..1

  set(rain, night) {
    this.rain = rain || 0;
    this.night = night || 0;
    this._drops = [];
  },

  /* Lateral grip decay rate for the car (1/s). Dry ≈ 7, heavy rain ≈ 2.8.
     Take that turn at 47 mph in the rain and you WILL slide. */
  grip() { return 7.0 - 4.2 * this.rain; },

  /* Stopping power also suffers when wet */
  brakeFactor() { return 1 - 0.25 * this.rain; },

  _drops: [],
  updateRain(dt, w, h) {
    if (this.rain <= 0) return;
    const want = Math.round(140 * this.rain);
    while (this._drops.length < want) {
      this._drops.push({ x: Math.random() * w, y: Math.random() * h, s: U.rand(620, 980), l: U.rand(14, 26) });
    }
    for (const d of this._drops) {
      d.y += d.s * dt;
      d.x -= d.s * 0.18 * dt;
      if (d.y > h + 30) { d.y = -30; d.x = Math.random() * (w + 200); }
    }
  },

  drawRain(ctx, w, h) {
    if (this.rain <= 0) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.strokeStyle = `rgba(190,210,235,${0.16 + this.rain * 0.18})`;
    ctx.lineWidth = Math.max(1, (window.devicePixelRatio || 1));
    ctx.beginPath();
    for (const d of this._drops) {
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.l * 0.18, d.y + d.l);
    }
    ctx.stroke();
    // wet sheen
    ctx.fillStyle = `rgba(120,150,200,${0.05 * this.rain})`;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  },

  groundColor() {
    return `rgb(${Math.round(0x41 - this.night * 30)},${Math.round(0x57 - this.night * 36)},${Math.round(0x3b - this.night * 24)})`;
  },
};
