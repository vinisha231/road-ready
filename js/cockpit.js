/* RoadReady — premium digital cockpit overlay for the 3D view.
   A curved widescreen instrument cluster (big speed + live lane-assist road +
   gear + power/brake bars), an ambient light strip, and a realistic leather
   steering wheel with metallic spokes, paddle shifters and a hub badge.
   All SVG/CSS/canvas — original art, day & night aware. */
const Cockpit = {
  built: false,
  _roadOffset: 0,
  _curve: 0,

  build() {
    if (this.built) return;
    this.built = true;
    const d = document.createElement('div');
    d.id = 'cockpit';
    d.className = 'hidden';
    d.innerHTML = `
      <div id="ambient"></div>

      <!-- compact heads-up shown in chase cam -->
      <div id="chaseHud">
        <div class="ch-speed"><span id="chSpeed">0</span><small>mph</small></div>
        <div id="chGear">N</div>
      </div>

      <div id="dash">
        <div id="dashGrain"></div>
        <div id="ventL" class="vent"></div>
        <div id="ventR" class="vent"></div>

        <div id="cluster">
          <div class="cl-wing left">
            <div class="cl-speed"><span id="ckSpeed">0</span></div>
            <div class="cl-unit">mph</div>
            <svg class="cl-arc" viewBox="0 0 120 120">
              <path d="M 14 106 A 56 56 0 0 1 106 106" fill="none" stroke="#283042" stroke-width="7" stroke-linecap="round"/>
              <path id="ckArc" d="M 14 106 A 56 56 0 0 1 106 106" fill="none" stroke="#5aa9ff" stroke-width="7" stroke-linecap="round" stroke-dasharray="220" stroke-dashoffset="220"/>
            </svg>
          </div>

          <div class="cl-center">
            <canvas id="ckRoad" width="420" height="240"></canvas>
            <div class="cl-blink"><span id="ckBL">▲</span></div>
            <div class="cl-nav"><span id="ckNav">Keep lane</span></div>
          </div>

          <div class="cl-wing right">
            <div id="ckGear" class="cl-gear">N</div>
            <div class="cl-limit-sign"><span id="ckLimit">35</span></div>
            <div class="cl-bars">
              <div class="cl-bar"><i id="ckGas" class="gas"></i></div>
              <div class="cl-bar"><i id="ckBrake" class="brk"></i></div>
            </div>
          </div>
        </div>

        <div id="wheelWrap">${this.wheelSVG()}</div>
      </div>`;
    document.getElementById('app').appendChild(d);
    this.roadCtx = document.getElementById('ckRoad').getContext('2d');
  },

  wheelSVG() {
    // stitches around the inner rim
    let stitch = '';
    for (let a = 0; a < 360; a += 9) {
      const r1 = 120, r2 = 126, rad = a * Math.PI / 180;
      stitch += `<line x1="${(180 + Math.cos(rad) * r1).toFixed(1)}" y1="${(180 + Math.sin(rad) * r1).toFixed(1)}" x2="${(180 + Math.cos(rad) * r2).toFixed(1)}" y2="${(180 + Math.sin(rad) * r2).toFixed(1)}" stroke="#6b5a3e" stroke-width="1.4" stroke-dasharray="3 3" opacity="0.6"/>`;
    }
    return `
      <svg id="wheel" viewBox="0 0 360 360" aria-label="steering wheel">
        <defs>
          <radialGradient id="rim" cx="50%" cy="38%" r="65%">
            <stop offset="0%" stop-color="#3a3f49"/>
            <stop offset="55%" stop-color="#23262d"/>
            <stop offset="100%" stop-color="#0e1015"/>
          </radialGradient>
          <linearGradient id="spoke" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#454b57"/>
            <stop offset="50%" stop-color="#23272f"/>
            <stop offset="100%" stop-color="#15181e"/>
          </linearGradient>
          <radialGradient id="hub" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stop-color="#2a2f39"/>
            <stop offset="100%" stop-color="#101216"/>
          </radialGradient>
        </defs>

        <!-- paddle shifters peeking behind the rim -->
        <path d="M 96 70 q -34 12 -40 54 l 16 4 q 8 -38 32 -46 z" fill="#1a1d23" opacity="0.9"/>
        <path d="M 264 70 q 34 12 40 54 l -16 4 q -8 -38 -32 -46 z" fill="#1a1d23" opacity="0.9"/>

        <!-- rim -->
        <circle cx="180" cy="180" r="150" fill="none" stroke="url(#rim)" stroke-width="40"/>
        ${stitch}
        <!-- top marker stripe (M-style) -->
        <rect x="171" y="20" width="6" height="22" fill="#2f6fd0"/>
        <rect x="177" y="20" width="6" height="22" fill="#7a8a9a"/>
        <rect x="183" y="20" width="6" height="22" fill="#c81f1f"/>

        <!-- spokes -->
        <path d="M 70 196 L 150 186 L 150 210 L 78 226 Z" fill="url(#spoke)"/>
        <path d="M 290 196 L 210 186 L 210 210 L 282 226 Z" fill="url(#spoke)"/>
        <path d="M 158 214 L 202 214 L 196 300 L 164 300 Z" fill="url(#spoke)"/>

        <!-- multifunction buttons -->
        <rect x="96" y="194" width="30" height="13" rx="3" fill="#11141a"/>
        <rect x="96" y="210" width="30" height="13" rx="3" fill="#11141a"/>
        <rect x="234" y="194" width="30" height="13" rx="3" fill="#11141a"/>
        <rect x="234" y="210" width="30" height="13" rx="3" fill="#11141a"/>

        <!-- hub + badge -->
        <circle cx="180" cy="200" r="42" fill="url(#hub)" stroke="#3a4150" stroke-width="2"/>
        <circle cx="180" cy="200" r="27" fill="#0e1117" stroke="#46506a" stroke-width="2.5"/>
        <text x="180" y="208" text-anchor="middle" font-size="22" font-weight="900" fill="#ffd24a" font-family="-apple-system,Segoe UI,sans-serif">RR</text>
      </svg>`;
  },

  show(on) {
    this.build();
    document.getElementById('cockpit').classList.toggle('hidden', !on);
  },

  sync(sim) {
    if (!this.built) return;
    const cp = document.getElementById('cockpit');
    const chase = R3D.chase;
    cp.classList.toggle('chase', chase);
    const car = sim.car;
    const mph = Math.round(car.speed * U.MPH);
    const night = (typeof Weather !== 'undefined' && Weather.night > 0.35);
    cp.classList.toggle('night', night);
    cp.classList.toggle('braking', !!car.braking);

    // chase: compact HUD only
    document.getElementById('chSpeed').textContent = mph;
    if (chase) {
      document.getElementById('chGear').textContent = this.gear(car);
      return;
    }

    // speed + arc (0..120 mph)
    document.getElementById('ckSpeed').textContent = mph;
    const arc = document.getElementById('ckArc');
    arc.setAttribute('stroke-dashoffset', String(220 - Math.min(1, mph / 120) * 220));
    arc.setAttribute('stroke', mph > sim.limit + 4 ? '#ff5d5d' : '#5aa9ff');

    // gear + limit
    const g = this.gear(car);
    const ge = document.getElementById('ckGear');
    ge.textContent = g;
    ge.className = 'cl-gear ' + g.toLowerCase();
    document.getElementById('ckLimit').textContent = sim.limit;

    // power / brake bars
    document.getElementById('ckGas').style.height = Math.round(Input.analog.gas * 100) + '%';
    document.getElementById('ckBrake').style.height = Math.round(Input.analog.brake * 100) + '%';

    // blinkers + nav hint
    const bl = document.getElementById('ckBL');
    bl.className = car.signal === 'L' ? 'on left' : car.signal === 'R' ? 'on right' : '';
    document.getElementById('ckNav').textContent =
      car.signal === 'L' ? 'Changing left' : car.signal === 'R' ? 'Changing right'
      : mph > sim.limit + 4 ? 'Slow down' : 'Keep lane';

    // steering wheel rotation
    document.getElementById('wheel').style.transform = `rotate(${(car.steer / 0.55) * 380}deg)`;

    // animated lane-assist cluster road
    this.drawRoad(sim, mph, night);
  },

  gear(car) {
    if (car.forwardSpeed < -0.15) return 'R';
    if (car.speed < 0.15 && Input.analog.gas < 0.05) return 'N';
    return 'D';
  },

  /* BMW-style lane view: perspective road scrolling toward you, curving with steer */
  drawRoad(sim, mph, night) {
    const ctx = this.roadCtx, W = 420, H = 240;
    this._roadOffset = (this._roadOffset + sim.car.speed * 0.02 + 0.02) % 1;
    this._curve += (sim.car.steer * 60 - this._curve) * 0.1;
    const cv = this._curve;

    ctx.fillStyle = night ? '#081020' : '#0a1626';
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2, vanY = 46, vanX = cx + cv;
    const roadBottomHalf = 150, roadTopHalf = 10;
    // asphalt wedge
    ctx.beginPath();
    ctx.moveTo(cx - roadBottomHalf, H);
    ctx.lineTo(vanX - roadTopHalf, vanY);
    ctx.lineTo(vanX + roadTopHalf, vanY);
    ctx.lineTo(cx + roadBottomHalf, H);
    ctx.closePath();
    const road = ctx.createLinearGradient(0, vanY, 0, H);
    road.addColorStop(0, '#1b2433');
    road.addColorStop(1, '#2b3647');
    ctx.fillStyle = road;
    ctx.fill();

    // glowing side lane lines (assist style)
    ctx.strokeStyle = night ? '#3aa0ff' : '#5ab0ff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#5aa9ff';
    ctx.shadowBlur = 10;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + side * roadBottomHalf, H);
      ctx.lineTo(vanX + side * roadTopHalf, vanY);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // scrolling dashed center line
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 7; i++) {
      const t0 = (i + this._roadOffset) / 7, t1 = t0 + 0.5 / 7;
      if (t1 > 1) continue;
      const y0 = vanY + (H - vanY) * t0, y1 = vanY + (H - vanY) * t1;
      const x0 = U.lerp(vanX, cx, t0), x1 = U.lerp(vanX, cx, t1);
      ctx.lineWidth = U.lerp(1.5, 6, t0);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }

    // ego car chevron at the bottom
    ctx.fillStyle = mph > sim.limit + 4 ? '#ff5d5d' : '#5aa9ff';
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(cx, H - 34);
    ctx.lineTo(cx - 16, H - 8);
    ctx.lineTo(cx, H - 16);
    ctx.lineTo(cx + 16, H - 8);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  },
};
