/* RoadReady — cockpit overlay for the 3D view: a steering wheel that actually
   turns, an analog speedo, pedal indicators, gear and blinkers. */
const Cockpit = {
  built: false,

  build() {
    if (this.built) return;
    this.built = true;
    const d = document.createElement('div');
    d.id = 'cockpit';
    d.className = 'hidden';
    d.innerHTML = `
      <div id="dash">
        <div id="cluster">
          <svg id="gauge" viewBox="0 0 200 130" aria-label="speedometer">
            <path d="M 26 112 A 80 80 0 1 1 174 112" fill="none" stroke="#262b36" stroke-width="14" stroke-linecap="round"/>
            <g id="gticks"></g>
            <g id="needle" transform="rotate(-120 100 100)">
              <line x1="100" y1="104" x2="100" y2="34" stroke="#ff5d5d" stroke-width="4" stroke-linecap="round"/>
            </g>
            <circle cx="100" cy="100" r="9" fill="#11141a" stroke="#3a3f4a" stroke-width="2"/>
            <text id="gmph" x="100" y="84" text-anchor="middle" font-size="26" font-weight="800" fill="#eef2f7">0</text>
            <text x="100" y="124" text-anchor="middle" font-size="11" fill="#93a0b4">mph</text>
          </svg>
          <div id="indicators">
            <span id="blinkL" class="blink-ind">◀</span>
            <span id="gear">N</span>
            <span id="blinkR" class="blink-ind">▶</span>
          </div>
        </div>
        <div id="wheelWrap">
          <svg id="wheel" viewBox="0 0 200 200" aria-label="steering wheel">
            <circle cx="100" cy="100" r="86" fill="none" stroke="#1b1e25" stroke-width="24"/>
            <circle cx="100" cy="100" r="86" fill="none" stroke="#333842" stroke-width="16"/>
            <path d="M 22 100 L 74 100 M 126 100 L 178 100 M 100 126 L 100 180"
                  stroke="#262a33" stroke-width="17" stroke-linecap="round"/>
            <circle cx="100" cy="100" r="27" fill="#1b1e25" stroke="#333842" stroke-width="3"/>
            <text x="100" y="107" text-anchor="middle" font-size="17" font-weight="800" fill="#ffd24a">RR</text>
            <rect x="96" y="9" width="8" height="15" rx="3" fill="#ffd24a"/>
          </svg>
        </div>
        <div id="pedals">
          <div class="pedal"><div class="pwell"><div id="pBrake" class="pfill pbrake"></div></div><span>BRAKE</span></div>
          <div class="pedal"><div class="pwell"><div id="pGas" class="pfill pgas"></div></div><span>GAS</span></div>
        </div>
      </div>`;
    document.getElementById('app').appendChild(d);
    // gauge tick marks every 20 mph across the 240° sweep
    let ticks = '';
    for (let mph = 0; mph <= 120; mph += 20) {
      const a = (-120 + mph * 2) * Math.PI / 180;
      const x1 = 100 + Math.sin(a) * 72, y1 = 100 - Math.cos(a) * 72;
      const x2 = 100 + Math.sin(a) * 80, y2 = 100 - Math.cos(a) * 80;
      const lx = 100 + Math.sin(a) * 60, ly = 100 - Math.cos(a) * 60;
      ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#93a0b4" stroke-width="2.5"/>`;
      ticks += `<text x="${lx.toFixed(1)}" y="${(ly + 3).toFixed(1)}" text-anchor="middle" font-size="9" fill="#93a0b4">${mph}</text>`;
    }
    document.getElementById('gticks').innerHTML = ticks;
  },

  show(on) {
    this.build();
    document.getElementById('cockpit').classList.toggle('hidden', !on);
  },

  sync(sim) {
    if (!this.built) return;
    // chase cam keeps the gauge cluster but drops the wheel and dash slab
    document.getElementById('cockpit').classList.toggle('chase', R3D.chase);
    const car = sim.car;
    const mph = Math.round(car.speed * U.MPH);
    document.getElementById('wheel').style.transform = `rotate(${(car.steer / 0.55) * 450}deg)`;
    document.getElementById('needle').setAttribute('transform', `rotate(${-120 + Math.min(126, mph) * 2} 100 100)`);
    document.getElementById('gmph').textContent = mph;
    document.getElementById('pGas').style.height = Math.round(Input.analog.gas * 100) + '%';
    document.getElementById('pBrake').style.height = Math.round(Input.analog.brake * 100) + '%';
    const gear = car.forwardSpeed < -0.15 ? 'R' : (car.speed < 0.15 && Input.analog.gas < 0.05 ? 'N' : 'D');
    const ge = document.getElementById('gear');
    ge.textContent = gear;
    ge.classList.toggle('rev', gear === 'R');
    document.getElementById('blinkL').classList.toggle('on', car.signal === 'L');
    document.getElementById('blinkR').classList.toggle('on', car.signal === 'R');
  },
};
