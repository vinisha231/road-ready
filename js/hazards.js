/* RoadReady — hazard perception: proximity triggers spawn actors that cross your path.
   Trigger: {x,y,r, kind, sx,sy, dx,dy, range} — when the car gets within r while moving,
   a `kind` actor spawns at (sx,sy) heading (dx,dy). Stop in time for a bonus. */
const Hazards = {
  actors: [],
  triggers: [],

  reset(triggers) {
    this.actors = [];
    this.triggers = (triggers || []).map(t => Object.assign({ armed: true, r: 26 }, t));
  },

  update(sim, dt) {
    const car = sim.car;
    for (const tr of this.triggers) {
      if (!tr.armed) continue;
      if (U.dist(car.x, car.y, tr.x, tr.y) < tr.r && car.speed > 2.5) {
        tr.armed = false;
        this.actors.push(new Walker(tr.kind, tr.sx, tr.sy, tr.dx, tr.dy, tr.range));
      }
    }
    for (const a of this.actors) {
      a.update(dt);
      if (a.dead) continue;
      if (car.speed > 1 && U.obbCollide(car.obb(), a.obb())) {
        a.dead = true;
        const type = (a.kind === 'squirrel' || a.kind === 'deer') ? 'hit-animal'
          : a.kind === 'cart' ? 'collision' : 'hit-pedestrian';
        sim.session.add(type, a.kind === 'cart' ? 'Hit a runaway cart' : undefined);
      } else if (!a.rewarded && U.dist(car.x, car.y, a.x, a.y) < 13 && car.speed < 1.0) {
        a.rewarded = true;
        sim.session.add('hazard-avoided');
      }
    }
    this.actors = this.actors.filter(a => !a.done);
  },

  draw(ctx, t) {
    for (const a of this.actors) a.draw(ctx, t);
  },
};
