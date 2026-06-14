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
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    // sky/surroundings reflection probe for metallic car paint
    if (window.RoomEnvironment) {
      try {
        const pmrem = new THREE.PMREMGenerator(this.renderer);
        this._envTex = pmrem.fromScene(new window.RoomEnvironment(), 0.04).texture;
      } catch (e) { this._envTex = null; }
    }
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
    // PBR ground: wet-ish asphalt picks up sun + sky reflection, takes shadows
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(wM, hM),
      new THREE.MeshStandardMaterial({
        map: tex, roughness: Weather.rain > 0.3 ? 0.45 : 0.82, metalness: 0.0,
        envMapIntensity: Weather.rain > 0.3 ? 0.9 : 0.35,
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(b.minX + wM / 2, 0, b.minY + hM / 2);
    mesh.receiveShadow = true;
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
    // r160 uses physical light units — intensities run ~3x the legacy values
    return {
      sky,
      fogFar: mix(mix(520, 150, n), mix(220, 90, n), r),
      hemi: mix(2.9, 0.42, n) * mix(1, 0.75, r),
      sun: mix(3.2, 0.05, n) * mix(1, 0.4, r),
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
    if (!this._mats[color]) this._mats[color] = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.2 });
    return this._mats[color];
  },

  enableShadows(obj) { obj.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return obj; },

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
      const pl = new THREE.PointLight(0xffd9a0, 320, 32, 1.8);
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

/* ---------- scene assembly & per-frame sync ---------- */
Object.assign(R3D, {
  build(inst) {
    if (!this.ok) return;
    if (this.scene) {
      this.scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material && o.material.map) o.material.map.dispose();
      });
    }
    this._mats = {};
    this._lampLights = 0;
    this.inst = inst;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87b5d9);
    this.scene.fog = new THREE.Fog(0x87b5d9, 60, 500);
    if (this._envTex) this.scene.environment = this._envTex;
    this._hemi = new THREE.HemisphereLight(0xcfe5ff, 0x46543e, 1.0);
    this.scene.add(this._hemi);
    this._sun = new THREE.DirectionalLight(0xfff2d9, 1.6);
    this._sun.position.set(120, 180, 60);
    // crisp local shadows: a tight ortho frustum that follows the car each frame
    this._sun.castShadow = true;
    this._sun.shadow.mapSize.set(2048, 2048);
    this._sun.shadow.camera.near = 1;
    this._sun.shadow.camera.far = 220;
    const SH = 36;
    this._sun.shadow.camera.left = -SH;
    this._sun.shadow.camera.right = SH;
    this._sun.shadow.camera.top = SH;
    this._sun.shadow.camera.bottom = -SH;
    this._sun.shadow.bias = -0.0006;
    this._sun.shadow.normalBias = 0.02;
    this.scene.add(this._sun);
    this.scene.add(this._sun.target);
    this._atmo = this.atmosphereTargets();

    const b = this.bounds(inst);
    this._b = b;
    this.scene.add(this.bakeGround(inst, b));
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), this.mat(0x44603c));
    apron.rotation.x = -Math.PI / 2;
    apron.position.set((b.minX + b.maxX) / 2, -0.08, (b.minY + b.maxY) / 2);
    this.scene.add(apron);

    // static & semi-static props
    this._obMap = new Map();
    for (const o of inst.obstacles || []) this.addObstacle(o);
    for (const s of inst.scenery || []) {
      let m = null;
      if (s.kind === 'building') m = this.makeBuilding(s);
      else if (s.kind === 'bush') {
        m = new THREE.Mesh(new THREE.SphereGeometry(s.r || 0.9, 8, 6), this.mat(0x4e6b40));
        m.position.set(s.x, (s.r || 0.9) * 0.7, s.y);
      } else {
        m = this.makeTree(s);
        m.position.set(s.x, 0, s.y);
      }
      if (m) this.scene.add(this.enableShadows(m));
    }

    // player car: body shows on the chase cam; the lights stay on either way
    // (lights must NOT be children of the hidden body — hidden groups stop illuminating)
    this.player = new THREE.Group();
    this.playerBody = new THREE.Group();
    this.player.add(this.playerBody);
    this.buildPlayerCar(inst);
    this.scene.add(this.player);
    this._headlights = [];
    for (const sz of [-1, 1]) {
      const sp = new THREE.SpotLight(0xfff1c4, 0, 60, 0.45, 0.45, 1.2);
      sp.position.set(2.15, 0.75, sz * 0.62);
      const tgt = new THREE.Object3D();
      tgt.position.set(16, 0, sz * 1.2);
      this.player.add(tgt);
      sp.target = tgt;
      this.player.add(sp);
      this._headlights.push(sp);
    }

    // objective beacon: ground halo + light pillar
    this._beacon = new THREE.Group();
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(4, 0.18, 8, 36),
      new THREE.MeshBasicMaterial({ color: 0x5fe07a, transparent: true, opacity: 0.85 })
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.12;
    this._beacon.add(halo);
    this._haloMesh = halo;
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.9, 26, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x5fe07a, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })
    );
    pillar.position.y = 13;
    this._beacon.add(pillar);
    this.scene.add(this._beacon);

    // rain particles live in a box that follows the camera
    this._rain = null;
    this.ensureRain();

    this._tcMap = new Map();
    this._acMap = new Map();
    this.chase = false;
    this.applyAtmosphere();
  },

  /* rain can start mid-run (emergency round 3) — create particles on demand */
  ensureRain() {
    if (this._rain || Weather.rain <= 0 || !this.scene) return;
    {
      const n = Math.round(900 * Weather.rain);
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        pos[i * 3] = U.rand(-25, 25);
        pos[i * 3 + 1] = U.rand(0, 18);
        pos[i * 3 + 2] = U.rand(-25, 25);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this._rain = new THREE.Points(geo, new THREE.PointsMaterial({
        color: 0x9db8d9, size: 0.06, transparent: true, opacity: 0.65, sizeAttenuation: true,
      }));
      this.scene.add(this._rain);
    }
  },

  addObstacle(o) {
    const m = this.makeProp(o);
    if (!m) return;
    m.position.set(o.x, 0, o.y);
    m.rotation.y = -(o.a || 0);
    this.enableShadows(m);
    this.scene.add(m);
    this._obMap.set(o, m);
  },

  /* fill playerBody with the selected car: a real GLB if it has one (loaded
     lazily, with a procedural placeholder while it streams), else procedural */
  buildPlayerCar(inst) {
    const sel = Cars.selected();
    while (this.playerBody.children.length) this.playerBody.remove(this.playerBody.children[0]);
    if (sel.model && window.GLTFLoader) {
      // placeholder so you're not staring at nothing during the download
      const ph = this.enableShadows(Cars.build3D('sedan'));
      ph.userData.placeholder = true;
      this.playerBody.add(ph);
      const p = Cars.loadModel(sel);
      if (p) p.then((scene) => {
        if (this.inst !== inst || Cars.selected().id !== sel.id) return; // moved on
        for (const c of [...this.playerBody.children]) this.playerBody.remove(c);
        this.playerBody.add(this.enableShadows(this.processModel(scene, sel)));
      }).catch(() => { /* keep placeholder on failure */ });
    } else {
      this.playerBody.add(this.enableShadows(Cars.build3D(sel.id)));
    }
  },

  /* scale to target length, drop onto the ground, aim nose +X, recolor paint,
     cast shadows. Clones geometry-shared scene + per-mesh materials so two cars
     sharing one GLB stay independent. */
  processModel(srcScene, car) {
    const root = srcScene.clone(true);
    const wrap = new THREE.Group();
    wrap.add(root);
    if (car.model.yaw) root.rotation.y = car.model.yaw;

    // measure, scale to target length (longest horizontal axis), recenter, ground
    let box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3(); box.getSize(size);
    const lengthAxis = Math.max(size.x, size.z) || 1;
    const s = car.model.len / lengthAxis;
    root.scale.setScalar(s);
    box = new THREE.Box3().setFromObject(root);
    const center = new THREE.Vector3(); box.getCenter(center);
    root.position.x -= center.x;
    root.position.z -= center.z;
    root.position.y -= box.min.y;              // wheels on the ground
    root.position.y += car.model.lift || 0;

    let tailMat = null;
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = false;
      if (Array.isArray(o.material)) o.material = o.material.map((m) => m.clone());
      else if (o.material) o.material = o.material.clone();
      const m = o.material;
      const name = (o.name + ' ' + (m && m.name || '')).toLowerCase();
      // recolor the painted body panels (precise tokens — avoid carpet/carbon)
      if (car.model.paint && m && m.color && /body|paint|carrosserie|exterior|coque/.test(name)) {
        m.color.set(car.model.paint);
        if ('metalness' in m) { m.metalness = 0.85; m.roughness = 0.3; }
        if ('clearcoat' in m) { m.clearcoat = 1; m.clearcoatRoughness = 0.1; }
      }
      if (/taillight/.test(name)) tailMat = m;
    });
    wrap.userData.tailMat = tailMat;
    this.playerBody.userData.tailMat = tailMat;
    return wrap;
  },

  /* keep a Map of sim object -> mesh in sync with a live array */
  syncPool(list, map, maker) {
    const seen = new Set(list);
    for (const item of list) {
      let m = map.get(item);
      if (!m) {
        m = this.enableShadows(maker(item));
        this.scene.add(m);
        map.set(item, m);
      }
      m.position.set(item.x, 0, item.y);
      m.rotation.y = -(item.heading !== undefined ? item.heading : Math.atan2(item.dy || 0, item.dx || 1));
    }
    for (const [item, m] of map) {
      if (!seen.has(item) || item.dead || item.gone) {
        this.scene.remove(m);
        map.delete(item);
      }
    }
  },

  sync(sim, dt) {
    const inst = sim.inst, car = sim.car;
    // obstacles can appear (emergency rounds), vanish, or get flattened
    for (const o of inst.obstacles || []) if (!this._obMap.has(o)) this.addObstacle(o);
    for (const [o, m] of this._obMap) {
      if (!(inst.obstacles || []).includes(o)) { this.scene.remove(m); this._obMap.delete(o); continue; }
      if (o.kind === 'cone') m.rotation.z = o.flat ? Math.PI / 2.3 : 0;
    }
    this.syncPool(inst.traffic || [], this._tcMap, (tc) => this.makeVehicle(tc.color, false));
    for (const [tc, m] of this._tcMap) {
      m.userData.tailMat.emissiveIntensity = tc.braking ? 2.2 : 0.5;
      m.userData.tailMat.emissive.setHex(tc.braking ? 0xff2010 : 0x550000);
    }
    this.syncPool(Hazards.actors, this._acMap, (a) => this.makeActor(a));

    // player
    this.player.position.set(car.x, 0, car.y);
    this.player.rotation.y = -car.heading;
    // keep the sun (and its tight shadow frustum) centered on the car
    if (this._sun) {
      this._sun.position.set(car.x + 70, 130, car.y + 45);
      this._sun.target.position.set(car.x, 0, car.y);
      this._sun.target.updateMatrixWorld();
    }
    const ptm = this.playerBody.userData.tailMat;
    if (ptm) {
      ptm.emissiveIntensity = car.braking ? 2.4 : 0.5;
      ptm.emissive.setHex(car.braking ? 0xff2010 : 0x550000);
    }
    const lightOn = Weather.night > 0.02;
    for (const sp of this._headlights) sp.intensity = lightOn ? 3000 : 0;
    // hide the body in cockpit view so it doesn't block the camera
    this.playerBody.visible = this.chase;

    // beacon follows the active objective
    let bx = null, by = null, br = 4;
    if (inst.checkpoints && inst.nextCp < inst.checkpoints.length) {
      const cp = inst.checkpoints[inst.nextCp];
      bx = cp.x; by = cp.y; br = cp.r || 4;
    } else if (inst.goal && inst.goal.type === 'park' && !sim.parked) {
      bx = inst.goal.bay.x; by = inst.goal.bay.y; br = 3;
    }
    this._beacon.visible = bx !== null;
    if (bx !== null) {
      this._beacon.position.set(bx, 0, by);
      const pulse = 1 + Math.sin(sim.time * 4) * 0.07;
      this._haloMesh.scale.setScalar((br / 4) * pulse);
    }

    // rain box rides along with the camera
    this.ensureRain();
    if (this._rain) {
      const p = this._rain.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let y = p.getY(i) - dt * 22;
        if (y < 0) y += 18;
        p.setY(i, y);
      }
      p.needsUpdate = true;
      this._rain.position.set(this.camera.position.x, 0, this.camera.position.z);
    }

    this.applyAtmosphere(dt);
    this.updateCamera(sim, dt);
  },

  updateCamera(sim, dt) {
    const car = sim.car;
    const fx = Math.cos(car.heading), fz = Math.sin(car.heading);
    const cam = this.camera;
    if (this.chase) {
      const tx = car.x - fx * 9.5, tz = car.y - fz * 9.5;
      const k = Math.min(1, dt * 5);
      this._cx = this._cx === undefined ? tx : this._cx + (tx - this._cx) * k;
      this._cz = this._cz === undefined ? tz : this._cz + (tz - this._cz) * k;
      cam.position.set(this._cx, 4.0, this._cz);
      cam.lookAt(car.x + fx * 4, 1.0, car.y + fz * 4);
      cam.fov = 60;
    } else {
      this._cx = this._cz = undefined;
      // driver's eye, slightly right-of-center stays neutral in a sim
      const shake = Math.min(1, car.speed / 30) * 0.025;
      const ex = car.x + fx * 0.3 + (Math.random() - 0.5) * shake;
      const ez = car.y + fz * 0.3 + (Math.random() - 0.5) * shake;
      cam.position.set(ex, 1.18 + (Math.random() - 0.5) * shake, ez);
      // look ahead, biased into the steering direction like real eyes do
      const look = car.heading + car.steer * 1.6;
      cam.lookAt(ex + Math.cos(look) * 12, 1.0, ez + Math.sin(look) * 12);
      cam.rotation.z += -car.steer * 0.35 * Math.min(1, car.speed / 14);
      cam.fov = 63 + Math.min(11, car.speed * 0.22);
    }
    cam.updateProjectionMatrix();
  },

  /* ---- mirrors: extra rear-facing render passes scissored onto the canvas ----
     Only in cockpit view. Each mirror is a small camera looking backward; the
     player body is shown during these passes so you see your own rear quarter. */
  ensureMirrors() {
    if (this._mirrors) return;
    const cam = () => { const c = new THREE.PerspectiveCamera(38, 3, 0.1, 400); return c; };
    this._mirrors = {
      rear: { cam: cam(), back: 1, side: 0, yaw: 0, fov: 42 },
      left: { cam: cam(), back: 0.2, side: -1, yaw: 0.5, fov: 50 },
      right: { cam: cam(), back: 0.2, side: 1, yaw: -0.5, fov: 50 },
    };
  },

  /* CSS-pixel rectangles for each mirror, matched by the DOM frames in Cockpit */
  mirrorRects() {
    const W = window.innerWidth, H = window.innerHeight;
    const rw = Math.min(360, W * 0.32), rh = rw * 0.26;
    const sw = Math.min(150, W * 0.13), sh = sw * 0.7;
    return {
      rear: { x: (W - rw) / 2, y: 10, w: rw, h: rh },
      left: { x: W * 0.045, y: H * 0.5, w: sw, h: sh },
      right: { x: W * 0.955 - sw, y: H * 0.5, w: sw, h: sh },
    };
  },

  renderMirrors(sim) {
    this.ensureMirrors();
    const car = sim.car;
    const rects = this.mirrorRects();
    const pr = this.renderer.getPixelRatio();
    const Hpx = this.renderer.domElement.height;
    const eyeY = 1.12;
    this.playerBody.visible = true; // show our own car in the glass

    this.renderer.setScissorTest(true);
    for (const key of ['rear', 'left', 'right']) {
      const m = this._mirrors[key], r = rects[key];
      const fx = Math.cos(car.heading), fz = Math.sin(car.heading);
      const rx = -fz, rz = fx; // right vector
      // eye position offset toward that mirror
      const ex = car.x - fx * 0.2 + rx * m.side * (car.wid * 0.5);
      const ez = car.y - fz * 0.2 + rz * m.side * (car.wid * 0.5);
      m.cam.position.set(ex, eyeY, ez);
      const look = car.heading + Math.PI + m.yaw; // face backward
      m.cam.up.set(0, 1, 0);
      m.cam.lookAt(ex + Math.cos(look) * 10, eyeY - 0.5, ez + Math.sin(look) * 10);
      m.cam.fov = m.fov;
      m.cam.aspect = r.w / r.h;
      m.cam.updateProjectionMatrix();

      // convert CSS rect (origin top-left) to GL viewport (origin bottom-left)
      const vx = r.x * pr, vy = Hpx - (r.y + r.h) * pr, vw = r.w * pr, vh = r.h * pr;
      this.renderer.setViewport(vx, vy, vw, vh);
      this.renderer.setScissor(vx, vy, vw, vh);
      this.renderer.render(this.scene, m.cam);
    }
    this.renderer.setScissorTest(false);
    const fullPx = this.renderer.domElement;
    this.renderer.setViewport(0, 0, fullPx.width, fullPx.height);
  },

  render(sim, dt) {
    if (!this.ok || !this.scene) return;
    this.sync(sim, dt);
    // main pass
    this.playerBody.visible = this.chase;
    this.renderer.render(this.scene, this.camera);
    // mirror passes (cockpit only); restore body visibility after
    if (!this.chase) {
      this.renderMirrors(sim);
      this.playerBody.visible = this.chase;
    }
  },
});
