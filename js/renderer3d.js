/* RoadReady — 3D behind-the-wheel renderer (three.js r160).
   Renders the SAME scenario data as the 2D view: 2D (x, y) maps to 3D (x, 0, z),
   heading 0 = +X, so mesh rotation.y = -heading. Physics, scoring, hazards and
   traffic all stay in the shared 2D-planar modules. */
const R3D = {
  ok: false,
  renderer: null,
  scene: null,
  camera: null,
  chase: false,
  inst: null,

  init(canvas) {
    if (this.renderer) return this.ok;
    if (!window.THREE) return false;
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    } catch (e) {
      return false;
    }
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.camera = new THREE.PerspectiveCamera(63, 1, 0.1, 900);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.ok = true;
    return true;
  },

  resize() {
    if (!this.renderer) return;
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  },

  /* world extent of a scenario, padded so the horizon isn't a cliff */
  bounds(inst) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const eat = (x, y) => {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    };
    for (const r of inst.roads || []) {
      if (r.ring) { eat(r.cx - r.ro, r.cy - r.ro); eat(r.cx + r.ro, r.cy + r.ro); }
      else { eat(r.x, r.y); eat(r.x + r.w, r.y + r.h); }
    }
    for (const l of inst.lots || []) { eat(l.x, l.y); eat(l.x + l.w, l.y + l.h); }
    for (const s of inst.scenery || []) { eat(s.x, s.y); if (s.w) eat(s.x + s.w, s.y + s.h); }
    for (const o of inst.obstacles || []) eat(o.x, o.y);
    for (const c of inst.checkpoints || []) eat(c.x, c.y);
    if (!isFinite(minX)) { minX = minY = 0; maxX = maxY = 100; }
    return { minX: minX - 90, minY: minY - 90, maxX: maxX + 90, maxY: maxY + 90 };
  },

  /* Bake roads, lane paint, zones, crosswalks and curbs into one big ground
     texture using the existing 2D drawing code. Realistic roads for free. */
  bakeGround(inst, b) {
    const wM = b.maxX - b.minX, hM = b.maxY - b.minY;
    const s = Math.min(5, 7000 / Math.max(wM, hM));
    const cv = document.createElement('canvas');
    cv.width = Math.round(wM * s);
    cv.height = Math.round(hM * s);
    const g = cv.getContext('2d');
    g.scale(s, s);
    g.translate(-b.minX, -b.minY);
    g.fillStyle = '#4a6342';
    g.fillRect(b.minX, b.minY, wM, hM);
    // gravel shoulders under the asphalt edges
    g.fillStyle = '#6e6f64';
    for (const r of inst.roads || []) {
      if (r.ring) {
        g.beginPath();
        g.arc(r.cx, r.cy, r.ro + 1.3, 0, U.TAU);
        g.arc(r.cx, r.cy, Math.max(0.1, r.ri - 1.3), 0, U.TAU, true);
        g.fill();
      } else {
        g.fillRect(r.x - 1.3, r.y - 1.3, r.w + 2.6, r.h + 2.6);
      }
    }
    World.drawRoads(g, inst);
    World.drawZones(g, inst);
    World.drawMarks(g, inst);
    if (inst.draw) { try { inst.draw(g, Sim); } catch (e) { /* scenario decor is optional */ } }

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(wM, hM),
      new THREE.MeshLambertMaterial({ map: tex })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(b.minX + wM / 2, 0, b.minY + hM / 2);
    return mesh;
  },

  /* sky, fog and sunlight follow the weather; lerped live so the emergency
     scenario's mid-run rain rolls in believably */
  _atmo: null,
  atmosphereTargets() {
    const n = Weather.night, r = Weather.rain;
    const mix = (a, b, t) => a + (b - a) * t;
    const day = { r: 0x87 / 255, g: 0xb5 / 255, b: 0xd9 / 255 };
    const nite = { r: 0x07 / 255, g: 0x0a / 255, b: 0x1c / 255 };
    let sky = { r: mix(day.r, nite.r, n), g: mix(day.g, nite.g, n), b: mix(day.b, nite.b, n) };
    const gray = (sky.r + sky.g + sky.b) / 3;
    sky = { r: mix(sky.r, gray, r * 0.7), g: mix(sky.g, gray, r * 0.7), b: mix(sky.b, gray * 1.05, r * 0.7) };
    return {
      sky,
      fogFar: mix(mix(520, 150, n), mix(220, 90, n), r),
      hemi: mix(1.05, 0.14, n) * mix(1, 0.75, r),
      sun: mix(1.7, 0.02, n) * mix(1, 0.4, r),
    };
  },

  applyAtmosphere(dt) {
    const t = this.atmosphereTargets();
    const a = this._atmo;
    const k = dt === undefined ? 1 : Math.min(1, dt * 1.2);
    a.sky.r += (t.sky.r - a.sky.r) * k;
    a.sky.g += (t.sky.g - a.sky.g) * k;
    a.sky.b += (t.sky.b - a.sky.b) * k;
    a.fogFar += (t.fogFar - a.fogFar) * k;
    a.hemi += (t.hemi - a.hemi) * k;
    a.sun += (t.sun - a.sun) * k;
    this.scene.background.setRGB(a.sky.r, a.sky.g, a.sky.b);
    this.scene.fog.color.copy(this.scene.background);
    this.scene.fog.far = a.fogFar;
    this.scene.fog.near = a.fogFar * 0.12;
    this._hemi.intensity = a.hemi;
    this._sun.intensity = a.sun;
  },
};
