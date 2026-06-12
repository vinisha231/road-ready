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

/* Oriented bounding boxes: {x, y, l, w, a} — center, length along heading, width, angle */
U.obbCorners = function (o) {
  const c = Math.cos(o.a), s = Math.sin(o.a), hl = o.l / 2, hw = o.w / 2;
  return [
    [o.x + c * hl - s * hw, o.y + s * hl + c * hw],
    [o.x + c * hl + s * hw, o.y + s * hl - c * hw],
    [o.x - c * hl + s * hw, o.y - s * hl - c * hw],
    [o.x - c * hl - s * hw, o.y - s * hl + c * hw],
  ];
};

/* SAT collision; returns {ov, ax} = minimum translation to push A out of B, or null */
U.obbCollide = function (A, B) {
  const ca = U.obbCorners(A), cb = U.obbCorners(B);
  const axes = [
    [Math.cos(A.a), Math.sin(A.a)], [-Math.sin(A.a), Math.cos(A.a)],
    [Math.cos(B.a), Math.sin(B.a)], [-Math.sin(B.a), Math.cos(B.a)],
  ];
  let minOv = Infinity, minAx = null;
  for (const ax of axes) {
    let aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;
    for (const p of ca) { const d = p[0] * ax[0] + p[1] * ax[1]; if (d < aMin) aMin = d; if (d > aMax) aMax = d; }
    for (const p of cb) { const d = p[0] * ax[0] + p[1] * ax[1]; if (d < bMin) bMin = d; if (d > bMax) bMax = d; }
    const ov = Math.min(aMax, bMax) - Math.max(aMin, bMin);
    if (ov <= 0) return null;
    if (ov < minOv) { minOv = ov; minAx = ax; }
  }
  let dx = A.x - B.x, dy = A.y - B.y;
  if (dx * minAx[0] + dy * minAx[1] < 0) minAx = [-minAx[0], -minAx[1]];
  return { ov: minOv, ax: minAx };
};

U.rectToObb = function (r) { return { x: r.x + r.w / 2, y: r.y + r.h / 2, l: r.w, w: r.h, a: 0 }; };
