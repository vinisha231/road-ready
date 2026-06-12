/* RoadReady — tiny WebAudio blips. No asset files, no drama.
   The AudioContext arms itself on the first keypress/click (autoplay policy). */
const Sound = {
  ctx: null,

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

  blip(freq, dur, type = 'sine', vol = 0.07, delay = 0) {
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
