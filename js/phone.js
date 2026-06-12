/* RoadReady — distracted driving: the phone buzzes, you choose your fate.
   Press P to peek (vision blurs, points gone). Ignore it for the bonus. */
const Phone = {
  enabled: false,
  buzzing: false,
  nextBuzz: 0,
  buzzLeft: 0,
  peek: 0,
  MSGS: [
    'mom: where r u??',
    'group chat: 47 new messages',
    'bestie: DID YOU SEE THIS 👀',
    'spotify: your weekly mix is ready',
    'mom: call me NOW',
    'unknown: your package was delivered??',
    'group chat: someone said your name 👀',
  ],

  reset(enabled) {
    this.enabled = !!enabled;
    this.buzzing = false;
    this.peek = 0;
    this.nextBuzz = U.rand(7, 14);
    UI.phoneHide();
    UI.peekEnd();
  },

  update(sim, dt) {
    if (this.peek > 0) {
      this.peek -= dt;
      if (this.peek <= 0) UI.peekEnd();
    }
    if (!this.enabled) return;
    if (!this.buzzing) {
      this.nextBuzz -= dt;
      if (this.nextBuzz <= 0 && sim.car.speed > 5) {
        this.buzzing = true;
        this.buzzLeft = 5;
        UI.phoneShow(U.choice(this.MSGS));
      }
    } else {
      this.buzzLeft -= dt;
      if (Input.justPressed('KeyP')) {
        this.buzzing = false;
        UI.phoneHide();
        sim.session.add('distracted');
        this.peek = 1.5;
        UI.peekStart();
        this.nextBuzz = U.rand(10, 18);
      } else if (this.buzzLeft <= 0) {
        this.buzzing = false;
        UI.phoneHide();
        sim.session.add('resisted-phone');
        this.nextBuzz = U.rand(12, 22);
      }
    }
  },
};
