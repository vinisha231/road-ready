/* RoadReady — follow camera with speed-based zoom. zoom = device px per meter. */
const Camera = {
  x: 0, y: 0, zoom: 9,
  snap(x, y) { this.x = x; this.y = y; this.zoom = 9; },
  follow(car, dt) {
    const lead = 0.55;
    const tx = car.x + car.vx * lead, ty = car.y + car.vy * lead;
    const k = Math.min(1, 4 * dt);
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;
    const tz = 9 - Math.min(3.2, car.speed * 0.085);
    this.zoom += (tz - this.zoom) * Math.min(1, 1.5 * dt);
  },
  scale() { return this.zoom * (window.devicePixelRatio || 1); },
  apply(ctx, w, h) {
    const z = this.scale();
    ctx.setTransform(z, 0, 0, z, w / 2 - this.x * z, h / 2 - this.y * z);
  },
  toScreen(x, y, w, h) {
    const z = this.scale();
    return [w / 2 + (x - this.x) * z, h / 2 + (y - this.y) * z];
  },
};
