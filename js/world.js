/* RoadReady — world rendering & surface queries.
   Roads are axis-aligned rects {x,y,w,h,lanes,twoWay} or rings {ring:true,cx,cy,ri,ro}. */
const World = {
  GRASS: '#41573b',
  ASPHALT: '#3a3e45',
  LOT: '#45494f',

  text(ctx, str, x, y, sizeM, color = '#fff', align = 'center') {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sizeM / 20, sizeM / 20);
    ctx.font = '20px -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(str, 0, 0);
    ctx.restore();
  },

  drawRoads(ctx, inst) {
    ctx.fillStyle = this.LOT;
    for (const l of inst.lots || []) ctx.fillRect(l.x, l.y, l.w, l.h);
    ctx.fillStyle = this.ASPHALT;
    for (const r of inst.roads || []) {
      if (r.ring) {
        ctx.beginPath();
        ctx.arc(r.cx, r.cy, r.ro, 0, U.TAU);
        ctx.arc(r.cx, r.cy, r.ri, 0, U.TAU, true);
        ctx.fill();
      } else ctx.fillRect(r.x, r.y, r.w, r.h);
    }
    for (const r of inst.roads || []) if (!r.noMarks) this.drawMarkings(ctx, r);
  },

  drawMarkings(ctx, r) {
    ctx.save();
    if (r.ring) {
      const lanes = r.lanes || 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 0.12;
      ctx.setLineDash([2.2, 2.6]);
      for (let i = 1; i < lanes; i++) {
        ctx.beginPath();
        ctx.arc(r.cx, r.cy, r.ri + (r.ro - r.ri) * i / lanes, 0, U.TAU);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 0.15;
      ctx.beginPath(); ctx.arc(r.cx, r.cy, r.ro - 0.2, 0, U.TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(r.cx, r.cy, r.ri + 0.2, 0, U.TAU); ctx.stroke();
      ctx.restore();
      return;
    }
    const horiz = r.w >= r.h;
    const lanes = r.lanes || 2;
    const laneW = (horiz ? r.h : r.w) / lanes;
    for (let i = 1; i < lanes; i++) {
      const off = (horiz ? r.y : r.x) + laneW * i;
      if (r.twoWay && i * 2 === lanes) {
        ctx.strokeStyle = '#e8c54a';
        ctx.lineWidth = 0.13;
        for (const d of [-0.15, 0.15]) {
          ctx.beginPath();
          if (horiz) { ctx.moveTo(r.x + 0.3, off + d); ctx.lineTo(r.x + r.w - 0.3, off + d); }
          else { ctx.moveTo(off + d, r.y + 0.3); ctx.lineTo(off + d, r.y + r.h - 0.3); }
          ctx.stroke();
        }
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 0.12;
        ctx.setLineDash([2.6, 2.6]);
        ctx.beginPath();
        if (horiz) { ctx.moveTo(r.x, off); ctx.lineTo(r.x + r.w, off); }
        else { ctx.moveTo(off, r.y); ctx.lineTo(off, r.y + r.h); }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    if (!r.noEdges) {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 0.14;
      ctx.beginPath();
      if (horiz) {
        ctx.moveTo(r.x, r.y + 0.18); ctx.lineTo(r.x + r.w, r.y + 0.18);
        ctx.moveTo(r.x, r.y + r.h - 0.18); ctx.lineTo(r.x + r.w, r.y + r.h - 0.18);
      } else {
        ctx.moveTo(r.x + 0.18, r.y); ctx.lineTo(r.x + 0.18, r.y + r.h);
        ctx.moveTo(r.x + r.w - 0.18, r.y); ctx.lineTo(r.x + r.w - 0.18, r.y + r.h);
      }
      ctx.stroke();
    }
    ctx.restore();
  },

  /* Obstacles: {kind, x, y, a, l, w, solid, color, text, flat} */
  drawObstacles(ctx, inst) {
    for (const o of inst.obstacles || []) {
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.rotate(o.a || 0);
      switch (o.kind) {
        case 'car': {
          const L = o.l || 4.4, W = o.w || 1.85;
          ctx.fillStyle = '#101216';
          for (const sx of [-1, 1]) for (const sy of [-1, 1]) ctx.fillRect(sx * L * 0.32 - 0.4, sy * W * 0.5 - 0.14, 0.8, 0.28);
          ctx.fillStyle = o.color || '#7d8aa0';
          ctx.beginPath(); ctx.roundRect(-L / 2, -W / 2, L, W, 0.5); ctx.fill();
          ctx.fillStyle = 'rgba(18,24,36,0.8)';
          ctx.beginPath(); ctx.roundRect(-L * 0.18, -W / 2 + 0.24, L * 0.44, W - 0.48, 0.3); ctx.fill();
          break;
        }
        case 'truck': {
          const L = o.l || 7.5, W = o.w || 2.5;
          ctx.fillStyle = o.color || '#9aa3ad';
          ctx.fillRect(-L / 2, -W / 2, L * 0.72, W);
          ctx.fillStyle = '#5c87b8';
          ctx.beginPath(); ctx.roundRect(L * 0.24, -W / 2, L * 0.26, W, 0.4); ctx.fill();
          break;
        }
        case 'cone':
          if (o.flat) {
            ctx.fillStyle = '#a04a18';
            ctx.beginPath(); ctx.ellipse(0, 0, 0.42, 0.24, 0.5, 0, U.TAU); ctx.fill();
          } else {
            ctx.fillStyle = '#e8742a';
            ctx.beginPath(); ctx.arc(0, 0, 0.3, 0, U.TAU); ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.09;
            ctx.beginPath(); ctx.arc(0, 0, 0.18, 0, U.TAU); ctx.stroke();
          }
          break;
        case 'barrel':
          ctx.fillStyle = '#e8742a';
          ctx.beginPath(); ctx.arc(0, 0, 0.5, 0, U.TAU); ctx.fill();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.14;
          ctx.beginPath(); ctx.arc(0, 0, 0.32, 0, U.TAU); ctx.stroke();
          break;
        case 'barrier': {
          const L = o.l || 3, W = o.w || 0.5;
          ctx.fillStyle = '#e8742a';
          ctx.fillRect(-L / 2, -W / 2, L, W);
          ctx.fillStyle = '#fff';
          for (let s = -L / 2 + 0.3; s < L / 2 - 0.3; s += 0.8) ctx.fillRect(s, -W / 2, 0.35, W);
          break;
        }
        case 'sign': {
          ctx.fillStyle = '#6b7280';
          ctx.fillRect(-0.07, -0.07, 0.14, 0.14);
          if (o.diamond) {
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = o.color || '#f7c948';
            ctx.beginPath(); ctx.roundRect(-0.85, -0.85, 1.7, 1.7, 0.2); ctx.fill();
            ctx.rotate(-Math.PI / 4);
            World.text(ctx, o.text || '!', 0, 0, 0.62, '#1a1505');
          } else {
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.roundRect(-0.8, -1.05, 1.6, 2.1, 0.15); ctx.fill();
            ctx.strokeStyle = '#1a1c20'; ctx.lineWidth = 0.07;
            ctx.beginPath(); ctx.roundRect(-0.68, -0.93, 1.36, 1.86, 0.1); ctx.stroke();
            World.text(ctx, o.small || 'SPEED LIMIT', 0, -0.45, 0.34, '#1a1c20');
            World.text(ctx, o.text || '35', 0, 0.28, 1.0, '#1a1c20');
          }
          break;
        }
      }
      ctx.restore();
    }
  },

  /* Scenery: {kind:'tree'|'bush'|'building', ...} — drawn under the car */
  drawScenery(ctx, inst) {
    for (const s of inst.scenery || []) {
      if (s.kind === 'building') {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(s.x + 0.6, s.y + 0.6, s.w, s.h);
        ctx.fillStyle = s.color || '#6e5f4e';
        ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 0.2;
        ctx.strokeRect(s.x + 0.4, s.y + 0.4, s.w - 0.8, s.h - 0.8);
        if (s.label) this.text(ctx, s.label, s.x + s.w / 2, s.y + s.h / 2, 1.6, 'rgba(255,255,255,0.85)');
      } else {
        const r = s.r || (s.kind === 'bush' ? 0.9 : 2.2);
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath(); ctx.arc(s.x + 0.5, s.y + 0.5, r, 0, U.TAU); ctx.fill();
        ctx.fillStyle = s.kind === 'bush' ? '#4e6b40' : '#395530';
        ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, U.TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        ctx.beginPath(); ctx.arc(s.x - r * 0.25, s.y - r * 0.25, r * 0.55, 0, U.TAU); ctx.fill();
      }
    }
  },

  /* Painted marks: crosswalks, parking bays, arrows, road text */
  drawMarks(ctx, inst) {
    for (const m of inst.marks || []) {
      ctx.save();
      switch (m.kind) {
        case 'crosswalk':
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          if (m.horiz) for (let xx = m.x; xx < m.x + m.w - 0.45; xx += 1.0) ctx.fillRect(xx, m.y, 0.55, m.h);
          else for (let yy = m.y; yy < m.y + m.h - 0.45; yy += 1.0) ctx.fillRect(m.x, yy, m.w, 0.55);
          break;
        case 'bay':
          ctx.translate(m.x, m.y); ctx.rotate(m.a || 0);
          ctx.strokeStyle = m.target ? '#5fe07a' : 'rgba(255,255,255,0.75)';
          ctx.lineWidth = m.target ? 0.22 : 0.12;
          if (m.target) ctx.setLineDash([0.7, 0.45]);
          ctx.strokeRect(-m.l / 2, -m.w / 2, m.l, m.w);
          if (m.target) {
            ctx.setLineDash([]);
            World.text(ctx, 'P', 0, 0, 1.6, 'rgba(95,224,122,0.85)');
          }
          break;
        case 'arrow':
          ctx.translate(m.x, m.y); ctx.rotate(m.a || 0);
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.beginPath();
          ctx.moveTo(1.4, 0); ctx.lineTo(0.2, -0.8); ctx.lineTo(0.2, -0.3); ctx.lineTo(-1.4, -0.3);
          ctx.lineTo(-1.4, 0.3); ctx.lineTo(0.2, 0.3); ctx.lineTo(0.2, 0.8);
          ctx.closePath(); ctx.fill();
          break;
        case 'text':
          ctx.translate(m.x, m.y); ctx.rotate(m.a || 0);
          World.text(ctx, m.text, 0, 0, m.size || 1.4, m.color || 'rgba(255,255,255,0.75)');
          break;
      }
      ctx.restore();
    }
  },

  /* Zones: {x,y,w,h,kind:'school'|'work', limit} — tinted overlays */
  drawZones(ctx, inst) {
    for (const z of inst.zones || []) {
      ctx.fillStyle = z.kind === 'work' ? 'rgba(232,116,42,0.10)' : 'rgba(255,210,74,0.10)';
      ctx.fillRect(z.x, z.y, z.w, z.h);
    }
  },

  drawCheckpoint(ctx, cp, t) {
    const pulse = 1 + Math.sin(t * 4) * 0.08;
    ctx.strokeStyle = 'rgba(95,224,122,0.9)';
    ctx.lineWidth = 0.3;
    ctx.setLineDash([1.1, 0.7]);
    ctx.beginPath(); ctx.arc(cp.x, cp.y, (cp.r || 4) * pulse, 0, U.TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(95,224,122,0.18)';
    ctx.beginPath(); ctx.arc(cp.x, cp.y, (cp.r || 4) * pulse, 0, U.TAU); ctx.fill();
  },

  onRoad(x, y, inst) {
    for (const r of inst.roads || []) {
      if (r.ring) {
        const d = U.dist(x, y, r.cx, r.cy);
        if (d >= r.ri - 0.4 && d <= r.ro + 0.4) return true;
      } else if (U.inRect(x, y, r, 0.4)) return true;
    }
    for (const l of inst.lots || []) if (U.inRect(x, y, l, 0.4)) return true;
    return false;
  },
};
