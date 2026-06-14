/* RoadReady — selectable cars. Each model looks distinct in 3D AND drives
   differently: a Lamborghini leaps off the line, the trainer sedan is forgiving.
   Stats multiply the base physics (accel, top speed, lateral grip). */
const Cars = {
  list: [
    {
      id: 'sedan', name: 'Trainer Sedan', badge: '🚗', real: false,
      blurb: 'Forgiving, balanced, loads instantly. Start here.',
      color: '#3f76d6', accent: '#0b1f44',
      stats: { accel: 0.9, top: 0.88, grip: 1.06 },
      spec: { len: 4.5, wid: 1.85, bodyH: 0.66, ride: 0.32, hood: 0.5, cabinLen: 0.46, cabinH: 0.56,
              cabinShift: -0.05, roof: '#dbe4f2', wheelR: 0.34, wing: 0 },
    },
    {
      id: 'gt', name: 'Scuderia GT', badge: '🔴', real: true,
      blurb: 'Real front-engine supercar. Fast, sharp, sounds expensive.',
      color: '#c81f1f', accent: '#1a0606',
      stats: { accel: 1.18, top: 1.14, grip: 1.16 },
      model: { file: 'vendor/models/ferrari.glb', len: 4.6, yaw: Math.PI / 2, lift: 0, paint: '#c81f1f' },
    },
    {
      id: 'track', name: 'GT Track Edition', badge: '⚫', real: true,
      blurb: 'Same supercar, stickier tires and a meaner tune. Murdered-out.',
      color: '#1b1d22', accent: '#000000',
      stats: { accel: 1.26, top: 1.18, grip: 1.24 },
      model: { file: 'vendor/models/ferrari.glb', len: 4.6, yaw: Math.PI / 2, lift: 0, paint: '#15171c' },
    },
    {
      id: 'hyper', name: 'Hyper Concept', badge: '🟢', real: true,
      blurb: 'Low, wide, mid-engine concept exotic. Launches like a scolding.',
      color: '#28c24a', accent: '#06200f',
      stats: { accel: 1.34, top: 1.26, grip: 1.12 },
      model: { file: 'vendor/models/carconcept.glb', len: 4.7, yaw: Math.PI / 2, lift: 0, paint: null },
    },
  ],

  get(id) { return this.list.find(c => c.id === id) || this.list[0]; },
  selected() { return this.get(Store.setting('car') || 'sedan'); },
  select(id) { Store.setting('car', id); },

  /* ---- lazy GLB loading: only fetch the model the player actually picks ---- */
  _cache: {},     // file -> Promise<THREE.Group>
  loading: false,

  loadModel(car) {
    if (!car.model || !window.GLTFLoader) return null;
    const file = car.model.file;
    if (!this._cache[file]) {
      this.loading = true;
      this._cache[file] = new Promise((resolve, reject) => {
        const loader = new window.GLTFLoader();
        if (window._dracoLoader) loader.setDRACOLoader(window._dracoLoader);
        loader.load(file,
          (gltf) => { resolve(gltf.scene); },
          undefined,
          (err) => { delete this._cache[file]; reject(err); });
      });
      this._cache[file].then(() => { this.loading = false; }, () => { this.loading = false; });
    }
    return this._cache[file];
  },

  /* preload the chosen model from the menu so it's ready at the brief screen */
  preloadSelected() { const c = this.selected(); if (c.model) this.loadModel(c); },

  /* push the chosen car's identity into a physics Car */
  applyStats(car) {
    const c = this.selected();
    car.stats = c.stats;
    car.color = c.color;
    if (c.model) { car.len = c.model.len; car.wid = c.id === 'hyper' ? 2.0 : 1.92; }
    else { car.len = c.spec.len; car.wid = c.spec.wid; }
    car.modelId = c.id;
  },

  /* Build a detailed three.js Group for a model. Needs global THREE (only
     called from R3D once WebGL is up). Sets userData.tailMat for brake lights. */
  build3D(id) {
    const car = this.get(id), sp = car.spec;
    const L = sp.len, W = sp.wid;
    const mat = (col) => new THREE.MeshLambertMaterial({ color: col });
    const grp = new THREE.Group();

    // lower body slab
    const lower = new THREE.Mesh(new THREE.BoxGeometry(L, sp.bodyH, W), mat(car.color));
    lower.position.y = sp.ride + sp.bodyH / 2;
    grp.add(lower);

    // hood + trunk wedge for sportier cars (chamfered front)
    if (sp.wedge || sp.lowback) {
      const nose = new THREE.Mesh(new THREE.BoxGeometry(L * 0.34, sp.bodyH * 0.6, W * 0.96), mat(car.color));
      nose.position.set(L * 0.31, sp.ride + sp.bodyH * 0.42, 0);
      grp.add(nose);
    }

    // cabin / greenhouse — shape varies per model
    const cabinW = W * 0.82;
    let cabin;
    if (sp.round) {
      cabin = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), mat(sp.roof));
      cabin.scale.set(L * sp.cabinLen * 0.6, sp.cabinH, cabinW * 0.5);
    } else if (sp.wedge) {
      // angular low canopy
      cabin = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 1, L * sp.cabinLen, 4), mat(sp.roof));
      cabin.rotation.x = Math.PI / 2;
      cabin.rotation.z = Math.PI / 4;
      cabin.scale.set(cabinW * 0.42, 1, sp.cabinH * 1.4);
    } else {
      cabin = new THREE.Mesh(new THREE.BoxGeometry(L * sp.cabinLen, sp.cabinH, cabinW), mat(sp.roof));
    }
    cabin.position.set(L * sp.cabinShift, sp.ride + sp.bodyH + sp.cabinH / 2 - 0.02, 0);
    grp.add(cabin);

    // glass band (windshield wrap)
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(L * (sp.cabinLen + 0.12), sp.cabinH * 0.62, cabinW + 0.04),
      new THREE.MeshLambertMaterial({ color: 0x121a26, transparent: true, opacity: 0.86 })
    );
    glass.position.set(L * sp.cabinShift, sp.ride + sp.bodyH + sp.cabinH * 0.34, 0);
    grp.add(glass);

    // beltline accent stripe
    const belt = new THREE.Mesh(new THREE.BoxGeometry(L * 0.98, 0.06, W + 0.02), mat(car.accent));
    belt.position.y = sp.ride + sp.bodyH - 0.02;
    grp.add(belt);

    // BMW kidney-grille hint: dark front face
    if (sp.grille) {
      const gr = new THREE.Mesh(new THREE.BoxGeometry(0.08, sp.bodyH * 0.5, W * 0.5), mat(0x14161a));
      gr.position.set(L / 2 + 0.01, sp.ride + sp.bodyH * 0.5, 0);
      grp.add(gr);
    }

    // wheels (fatter & darker for the exotics)
    const wr = sp.wheelR;
    const wheelGeo = new THREE.CylinderGeometry(wr, wr, sp.wedge ? 0.34 : 0.26, 16);
    const rimGeo = new THREE.CylinderGeometry(wr * 0.5, wr * 0.5, 0.28, 6);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const w = new THREE.Mesh(wheelGeo, mat(0x101216));
      w.rotation.x = Math.PI / 2;
      w.position.set(sx * L * 0.32, wr, sz * (W / 2 - 0.02));
      grp.add(w);
      const rim = new THREE.Mesh(rimGeo, mat(0x9aa3ad));
      rim.rotation.x = Math.PI / 2;
      rim.position.set(sx * L * 0.32, wr, sz * (W / 2 + 0.02));
      grp.add(rim);
    }

    // rear wing for the sports cars
    if (sp.wing > 0) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, W * 0.9), mat(car.accent));
      wing.position.set(-L / 2 + 0.2, sp.ride + sp.bodyH + sp.wing, 0);
      grp.add(wing);
      for (const sz of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, sp.wing, 0.1), mat(car.accent));
        post.position.set(-L / 2 + 0.2, sp.ride + sp.bodyH + sp.wing / 2, sz * W * 0.32);
        grp.add(post);
      }
    }

    // headlights (emissive) + taillights (brake-reactive, exposed via userData)
    const head = new THREE.MeshLambertMaterial({ color: 0xfff2c0, emissive: 0xffe9a0, emissiveIntensity: 0.9 });
    const tailMat = new THREE.MeshLambertMaterial({ color: 0x7a1612, emissive: 0x550000, emissiveIntensity: 0.6 });
    const ly = sp.ride + sp.bodyH * 0.55;
    for (const sz of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.32), head);
      h.position.set(L / 2 + 0.02, ly, sz * (W / 2 - 0.34));
      grp.add(h);
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, sp.wedge ? W * 0.7 : 0.3), tailMat);
      t.position.set(-L / 2 - 0.02, ly, sp.wedge ? 0 : sz * (W / 2 - 0.3));
      grp.add(t);
      if (sp.wedge) break; // single full-width light bar
    }
    grp.userData.tailMat = tailMat;
    return grp;
  },
};
