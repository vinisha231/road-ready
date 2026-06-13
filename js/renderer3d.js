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

/* ---------- mesh factories ---------- */
Object.assign(R3D, {
  _mats: {},
  mat(color) {
    if (!this._mats[color]) this._mats[color] = new THREE.MeshLambertMaterial({ color });
    return this._mats[color];
  },

  makeVehicle(color, truck = false) {
    const grp = new THREE.Group();
    const L = truck ? 7.5 : 4.4, W = truck ? 2.5 : 1.85;
    const bodyMat = new THREE.MeshLambertMaterial({ color });
    const body = new THREE.Mesh(new THREE.BoxGeometry(L, truck ? 1.6 : 0.62, W), bodyMat);
    body.position.y = truck ? 1.15 : 0.62;
    grp.add(body);
    if (!truck) {
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(L * 0.45, 0.5, W * 0.84), this.mat(0x1a2230));
      cabin.position.set(-L * 0.06, 1.12, 0);
      grp.add(cabin);
    } else {
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.3, W * 0.95), this.mat(0x5c87b8));
      cab.position.set(L * 0.38, 1.0, 0);
      grp.add(cab);
    }
    const wheelGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.26, 14);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const w = new THREE.Mesh(wheelGeo, this.mat(0x14161b));
      w.rotation.x = Math.PI / 2;
      w.position.set(sx * L * 0.33, 0.33, sz * (W / 2));
      grp.add(w);
    }
    // headlights & taillights (emissive so they read at night)
    const head = new THREE.MeshLambertMaterial({ color: 0xfff2c0, emissive: 0xffe9a0, emissiveIntensity: 0.9 });
    const tailMat = new THREE.MeshLambertMaterial({ color: 0x7a1612, emissive: 0x550000, emissiveIntensity: 0.6 });
    for (const sz of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.34), head);
      h.position.set(L / 2 + 0.02, truck ? 0.9 : 0.62, sz * (W / 2 - 0.34));
      grp.add(h);
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.3), tailMat);
      t.position.set(-L / 2 - 0.02, truck ? 0.9 : 0.62, sz * (W / 2 - 0.3));
      grp.add(t);
    }
    grp.userData.tailMat = tailMat;
    return grp;
  },

  makeTree(s) {
    const grp = new THREE.Group();
    const r = s.r || 2;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 1.7, 8), this.mat(0x5d4630));
    trunk.position.y = 0.85;
    grp.add(trunk);
    const f1 = new THREE.Mesh(new THREE.SphereGeometry(r * 0.85, 10, 8), this.mat(0x39542f));
    f1.position.y = 1.6 + r * 0.7;
    f1.scale.y = 1.15;
    grp.add(f1);
    return grp;
  },

  makeBuilding(s) {
    const hgt = 4.5 + ((s.w * 7 + s.h * 13) % 5);
    const grp = new THREE.Group();
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 128;
    const g = cv.getContext('2d');
    g.fillStyle = '#' + new THREE.Color(s.color || '#6e5f4e').getHexString();
    g.fillRect(0, 0, 256, 128);
    g.fillStyle = 'rgba(240,240,210,0.55)';
    for (let y = 16; y < 110; y += 30) for (let x = 12; x < 244; x += 26) g.fillRect(x, y, 14, 18);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(s.w, hgt, s.h),
      new THREE.MeshLambertMaterial({ map: tex })
    );
    box.position.set(s.x + s.w / 2, hgt / 2, s.y + s.h / 2);
    grp.add(box);
    if (s.label) {
      const lc = document.createElement('canvas');
      lc.width = 512; lc.height = 64;
      const lg = lc.getContext('2d');
      lg.fillStyle = '#2b2620';
      lg.fillRect(0, 0, 512, 64);
      lg.fillStyle = '#f3e9d4';
      lg.font = 'bold 36px sans-serif';
      lg.textAlign = 'center';
      lg.textBaseline = 'middle';
      lg.fillText(s.label, 256, 34);
      const ltex = new THREE.CanvasTexture(lc);
      ltex.colorSpace = THREE.SRGBColorSpace;
      const signW = Math.min(s.w * 0.9, 14);
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(signW, signW / 8),
        new THREE.MeshLambertMaterial({ map: ltex })
      );
      // face south (+Z) toward the road in most scenarios
      sign.position.set(s.x + s.w / 2, hgt - 0.8, s.y + s.h + 0.06);
      grp.add(sign);
    }
    return grp;
  },

  makeSign(o) {
    const grp = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), this.mat(0x6b7280));
    pole.position.y = 1.2;
    grp.add(pole);
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 160;
    const g = cv.getContext('2d');
    if (o.diamond) {
      g.translate(64, 80);
      g.rotate(Math.PI / 4);
      g.fillStyle = '#' + new THREE.Color(o.color || '#f7c948').getHexString();
      g.fillRect(-45, -45, 90, 90);
      g.rotate(-Math.PI / 4);
      g.fillStyle = '#1a1505';
      g.font = '44px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(o.text || '!', 0, 2);
    } else {
      g.fillStyle = '#f5f5f0';
      g.fillRect(14, 4, 100, 152);
      g.strokeStyle = '#1a1c20';
      g.lineWidth = 5;
      g.strokeRect(22, 12, 84, 136);
      g.fillStyle = '#1a1c20';
      g.textAlign = 'center';
      g.font = 'bold 17px sans-serif';
      g.fillText((o.small || 'SPEED LIMIT').split(' ')[0], 64, 42);
      g.fillText((o.small || 'SPEED LIMIT').split(' ')[1] || '', 64, 62);
      g.font = 'bold 56px sans-serif';
      g.fillText(o.text || '35', 64, 122);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 1.25),
      new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide })
    );
    panel.position.y = 2.0;
    panel.rotation.y = -Math.PI / 2; // face oncoming (mostly eastbound) traffic
    grp.add(panel);
    return grp;
  },

  makeLamp(o, night) {
    const grp = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 5.2, 8), this.mat(0x3c424c));
    pole.position.y = 2.6;
    grp.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.08), this.mat(0x3c424c));
    arm.position.set(0.8, 5.1, 0);
    grp.add(arm);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0xffd980, emissiveIntensity: night ? 1.2 : 0.15 })
    );
    head.position.set(1.5, 5.0, 0);
    grp.add(head);
    if (night && this._lampLights < 10) {
      this._lampLights++;
      const pl = new THREE.PointLight(0xffd9a0, 60, 30, 1.8);
      pl.position.set(1.5, 4.9, 0);
      grp.add(pl);
    }
    grp.rotation.y = -(o.a || 0);
    return grp;
  },

  makeProp(o) {
    switch (o.kind) {
      case 'car': return this.makeVehicle(o.color || '#7d8aa0');
      case 'truck': return this.makeVehicle(o.color || '#9aa3ad', true);
      case 'cone': {
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.6, 10), this.mat(0xe8742a));
        c.position.y = 0.3;
        const g = new THREE.Group();
        g.add(c);
        return g;
      }
      case 'barrel': {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.95, 12), this.mat(0xe8742a));
        b.position.y = 0.48;
        const g = new THREE.Group();
        g.add(b);
        return g;
      }
      case 'barrier': {
        const g = new THREE.Group();
        const bar = new THREE.Mesh(new THREE.BoxGeometry(o.l || 3, 0.5, o.w || 0.5), this.mat(0xe8742a));
        bar.position.y = 0.75;
        g.add(bar);
        for (const sx of [-1, 1]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.5), this.mat(0xd8dade));
          leg.position.set(sx * ((o.l || 3) / 2 - 0.3), 0.3, 0);
          g.add(leg);
        }
        return g;
      }
      case 'deerprop': {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 0.5), this.mat(0xa87f4f));
        body.position.y = 0.95;
        g.add(body);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.32), this.mat(0xa87f4f));
        head.position.set(0.85, 1.5, 0);
        g.add(head);
        for (const sx of [-0.5, 0.5]) for (const sz of [-0.16, 0.16]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.1, 0.09), this.mat(0x8a6a40));
          leg.position.set(sx, 0.55, sz);
          g.add(leg);
        }
        return g;
      }
      case 'sign': return this.makeSign(o);
      case 'lamp': return this.makeLamp(o, Weather.night > 0.05);
      default: return null;
    }
  },

  makeActor(a) {
    const g = new THREE.Group();
    if (a.kind === 'squirrel') {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.2), this.mat(0x8a5a33));
      b.position.y = 0.12;
      g.add(b);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.1), this.mat(0x744a28));
      tail.position.set(-0.35, 0.25, 0);
      g.add(tail);
    } else if (a.kind === 'deer') {
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 0.5), this.mat(0xa87f4f));
      b.position.y = 0.95;
      g.add(b);
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.32), this.mat(0xa87f4f));
      h.position.set(0.8, 1.5, 0);
      g.add(h);
    } else if (a.kind === 'cart') {
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.75, 0.7), new THREE.MeshLambertMaterial({ color: 0xaab2bd, wireframe: true }));
      b.position.y = 0.55;
      g.add(b);
    } else {
      const colors = { kid: 0xe8554a, adult: 0x6b7fa3, worker: 0xff8c1a };
      const hgt = a.kind === 'kid' ? 1.25 : 1.7;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, hgt - 0.3, 8), this.mat(colors[a.kind] || 0x6b7fa3));
      body.position.y = (hgt - 0.3) / 2;
      g.add(body);
      const headC = a.kind === 'worker' ? 0xffd24a : 0xcaa080;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), this.mat(headC));
      head.position.y = hgt - 0.1;
      g.add(head);
    }
    return g;
  },
});
