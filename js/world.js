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
};
