/* RoadReady — tiny WebAudio blips. No asset files, no drama.
   The AudioContext arms itself on the first keypress/click (autoplay policy). */
const Sound = {
  ctx: null,
  muted: false,

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      if (this._engGain) this._engGain.gain.value = 0;
      if (this._scrGain) this._scrGain.gain.value = 0;
    }
    return this.muted;
  },

  init() {
    const arm = () => {
      if (!this.ctx) {
        try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* no audio, no problem */ }
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    };
    window.addEventListener('keydown', arm);
    window.addEventListener('pointerdown', arm);
  },

  /* continuous engine hum + tire screech, lazily built once the context is live */
  _ensureLoops() {
    if (!this.ctx || this.ctx.state !== 'running' || this._engOsc) return;
    const c = this.ctx;
    this._engOsc = c.createOscillator();
    this._engOsc.type = 'sawtooth';
    this._engOsc.frequency.value = 55;
    const filt = c.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 220;
    this._engGain = c.createGain();
    this._engGain.gain.value = 0;
    this._engOsc.connect(filt);
    filt.connect(this._engGain);
    this._engGain.connect(c.destination);
    this._engOsc.start();
    // white-noise screech through a bandpass
    const buf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900;
    bp.Q.value = 1.4;
    this._scrGain = c.createGain();
    this._scrGain.gain.value = 0;
    src.connect(bp);
    bp.connect(this._scrGain);
    this._scrGain.connect(c.destination);
    src.start();
  },

  engine(speed, throttle, active) {
    this._ensureLoops();
    if (!this._engOsc) return;
    const t = this.ctx.currentTime;
    const on = active && !this.muted;
    this._engOsc.frequency.setTargetAtTime(52 + speed * 3.4 + (throttle > 0 ? 14 : 0), t, 0.1);
    const vol = on ? 0.011 + Math.min(0.016, speed * 0.0007) + (throttle > 0 ? 0.009 : 0) : 0;
    this._engGain.gain.setTargetAtTime(vol, t, 0.09);
  },

  screech(active) {
    if (!this._scrGain) return;
    this._scrGain.gain.setTargetAtTime(active && !this.muted ? 0.045 : 0, this.ctx.currentTime, 0.05);
  },

  blip(freq, dur, type = 'sine', vol = 0.07, delay = 0) {
    if (this.muted) return;
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur);
  },

  bad() { this.blip(150, 0.22, 'square', 0.06); },
  good() { this.blip(660, 0.1); this.blip(880, 0.12, 'sine', 0.07, 0.09); },
  checkpoint() { this.blip(784, 0.09, 'triangle'); this.blip(1046, 0.12, 'triangle', 0.07, 0.08); },
  honk() { this.blip(370, 0.16, 'square', 0.09); this.blip(311, 0.2, 'square', 0.09, 0.05); },
};
