/* RoadReady — math & geometry helpers */
const U = {
  TAU: Math.PI * 2,
  MPH: 2.23694,
  clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; },
  lerp(a, b, t) { return a + (b - a) * t; },
  dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); },
  angDiff(a, b) { let d = (b - a) % U.TAU; if (d > Math.PI) d -= U.TAU; if (d < -Math.PI) d += U.TAU; return d; },
  rand(lo, hi) { return lo + Math.random() * (hi - lo); },
  randInt(lo, hi) { return Math.floor(U.rand(lo, hi + 1)); },
  choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  mph(ms) { return Math.round(Math.abs(ms) * U.MPH); },
  ms(mph) { return mph / U.MPH; },
  inRect(x, y, r, pad = 0) { return x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad; },
};
