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

  /* Darkness overlay with a headlight cone cut out in front of the car */
  _nightCanvas: null,
  drawNight(ctx, w, h, car) {
    if (this.night <= 0.02 || !car) return;
    if (!this._nightCanvas || this._nightCanvas.width !== w || this._nightCanvas.height !== h) {
      this._nightCanvas = document.createElement('canvas');
      this._nightCanvas.width = w; this._nightCanvas.height = h;
    }
    const nc = this._nightCanvas, g = nc.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, w, h);
    g.fillStyle = `rgba(7,9,26,${0.8 * this.night})`;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-out';
    const [cx, cy] = Camera.toScreen(car.x, car.y, w, h);
    const z = Camera.scale();
    let grad = g.createRadialGradient(cx, cy, 0, cx, cy, 17 * z);
    grad.addColorStop(0, 'rgba(0,0,0,0.6)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(cx, cy, 17 * z, 0, U.TAU); g.fill();
    const reach = 50 * z, spread = 0.3;
    const tipX = cx + Math.cos(car.heading) * 1.6 * z;
    const tipY = cy + Math.sin(car.heading) * 1.6 * z;
    grad = g.createRadialGradient(tipX, tipY, 0, tipX, tipY, reach);
    grad.addColorStop(0, 'rgba(0,0,0,0.95)');
    grad.addColorStop(0.65, 'rgba(0,0,0,0.55)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(tipX, tipY);
    g.arc(tipX, tipY, reach, car.heading - spread, car.heading + spread);
    g.closePath(); g.fill();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(nc, 0, 0);
    // warm beam tint
    ctx.fillStyle = 'rgba(255,236,170,0.05)';
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.arc(tipX, tipY, reach * 0.9, car.heading - spread, car.heading + spread);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  },

  groundColor() {
    return `rgb(${Math.round(0x41 - this.night * 30)},${Math.round(0x57 - this.night * 36)},${Math.round(0x3b - this.night * 24)})`;
  },
};
