/* ==========================================================================
   ReChoice - js/network/sync.js
   Đồng bộ Mạng Multiplayer: Snapshot máy chủ, Nội suy máy khách & Lực vật lý
   ========================================================================== */
'use strict';

let fxq = [];
function q(ev) {
  if (NET.mode === 'host' && NET.running) fxq.push(ev);
}

function snapshot() {
  const p = [];
  for (const s of ships.values()) {
    p.push([
      s.id, r2(s.pos.x), r2(s.pos.z), r2(s.g.rotation.y), r2(s.g.rotation.z),
      Math.ceil(s.S.hp), s.S.maxHp,
      (s.inv > 0 ? 1 : 0) | (s.dashT > 0 ? 2 : 0) | (s.dead ? 4 : 0),
      s.blades.length
    ]);
  }

  const e = [];
  for (const x of enemies) {
    if (!x.dead) {
      e.push([
        x.id, x.ti, r2(x.m.position.x), r2(x.m.position.y), r2(x.m.position.z),
        r2(x.m.rotation.y), r2(x.m.rotation.x), r2(x.m.scale.x),
        x.flash > 0 ? 1 : 0, x.st | 0, r2(x.a || 0), r2(x.b || 0), x.inv ? 1 : 0
      ]);
    }
  }

  const m = [];
  for (const g of GM.items) {
    if (g.on) m.push(r2(g.m.position.x), r2(g.m.position.z));
  }

  Net.send({
    t: 's',
    g: [
      G.wave, Math.floor(G.score), G.level, r2(G.xp), G.xpNext, G.combo,
      r2(G.bossR), STATES.indexOf(state), r2(G.time), r2(G.shake), r2(RA),
      G.bossKind, G.bossInfo, G.bossInv ? 1 : 0
    ],
    p, e, m, fx: fxq
  });
  fxq = [];
}

function applySnap(m) {
  const g = m.g;
  G.wave = g[0]; G.score = g[1]; G.level = g[2]; G.xp = g[3]; G.xpNext = g[4]; G.combo = g[5]; G.bossR = g[6];
  const st = STATES[g[7]];
  if (Math.abs(G.time - g[8]) > 0.5) G.time = g[8];
  G.shake = Math.max(G.shake, g[9] * 0.5);
  RA = g[10];
  G.bossKind = g[11];
  G.bossInfo = g[12] || '';
  G.bossInv = g[13];

  if (st === 'play' && state === 'levelup') { $('lvl').hidden = true; curOffer = null; state = 'play'; }
  else if (st === 'dying' && state === 'play') state = 'dying';

  for (const [id, x, z, ry, rz, hp, maxHp, fl, nb] of m.p) {
    const s = ships.get(id); if (!s) continue;
    s.S.hp = hp; s.S.maxHp = maxHp;
    const dead = !!(fl & 4);
    if (s.local) {
      if (dead && !s.dead) { s.firing = false; if (ships.size > 1) rawBanner('TÀU VỠ', 'Hồi sinh ở đợt sau'); }
      s.netInv = !!(fl & 1);
    } else {
      s.tx = x; s.tz = z; s.tRy = ry; s.tRz = rz; s.netInv = !!(fl & 3);
      if (s.dead && !dead) s.pos.set(x, 0, z);
    }
    s.dead = dead; s.g.visible = !dead;
    syncBlades(s, nb);
  }

  const seen = new Set();
  for (const [id, ti, x, y, z, ry, rx, sc, fl, st2, a, b, inv] of m.e) {
    seen.add(id);
    let e = netEn.get(id);
    if (!e) {
      const type = TYPES[ti]; if (!type) continue;
      const vis = buildEnemy(type);
      e = Object.assign(vis, { id, type, t: T[type], punch: 0, flashV: 0 });
      vis.m.position.set(x, y, z); vis.m.rotation.set(rx, ry, 0);
      netEn.set(id, e);
    }
    e.tx = x; e.ty = y; e.tz = z; e.tRy = ry; e.tRx = rx;
    e.m.scale.setScalar(Math.max(0.01, sc));
    if (fl && !e.fl0) e.punch = 1; e.fl0 = fl; e.flashV = fl ? 1 : 0;
    e.st = st2; e.a = a; e.b = b; e.inv = !!inv;
  }
  for (const [id, e] of netEn) if (!seen.has(id)) { disposeEnemy(e); netEn.delete(id); }

  const gm = m.m, n = gm.length / 2; let k = 0;
  for (const it of GM.items) {
    if (k < n) {
      if (!it.on) { it.on = true; it.m.visible = true; }
      it.m.position.x = gm[k * 2]; it.m.position.z = gm[k * 2 + 1]; k++;
    } else if (it.on) GM.free(it);
  }
  while (k < n) {
    const it = GM.get(); it.t = Math.random() * 5; it.m.position.set(gm[k * 2], 0.5, gm[k * 2 + 1]); k++;
  }

  for (const ev of m.fx) applyFx(ev);
}

function applyFx(ev) {
  switch (ev[0]) {
    case 'p': rawEmit(ev[1], ev[2], ev[3], ev[4], ev[5], ev[6], ev[7], ev[8]); break;
    case 'r': rawRing(ev[1], ev[2], ev[3], ev[4], ev[5]); break;
    case 'b': rawBolt(new V3(ev[1], ev[2], ev[3]), new V3(ev[4], ev[5], ev[6])); break;
    case 'n': rawBanner(ev[1], ev[2]); break;
    case 'I': rawIntro(ev[1]); break;
    case 's': if (sfx[ev[1]]) sfx[ev[1]](); break;
    case 'k': rawDeathFx(ev[1], ev[2], ev[3], ev[4], ev[5]); break;
    case 'hx': rawHitFx(ev[1], ev[2], ev[3], ev[4], !!ev[5], ev[6]); break;
    case 'sp': rawSpawnFx(ev[1], ev[2], ev[3], !!ev[4]); break;
    case 'bl': rawBlockFx(ev[1], ev[2], ev[3]); break;
    case 'L': rawBeam(ev[1], ev[2], ev[3], ev[4], ev[5], ev[6], ev[7], ev[8], 0); sfx.warn(); break;
    case 'W': rawShock(ev[1], ev[2], ev[3], ev[4], ev[5]); break;
    case 'mk': rawMark(ev[1], ev[2]); break;
    case 'to': if (ev[1] === NET.myId) rawToast(ev[2]); break;
    case 'V': victoryFx(); break;
    case 'pb': {
      if (ev[2] === NET.myId) break;
      const b = PB.get(); b.id = ev[1]; b.owner = ev[2];
      b.m.position.set(ev[3], 0.65, ev[4]); b.v.set(ev[5], 0, ev[6]); b.spd = Math.hypot(ev[5], ev[6]);
      b.life = 1.1; b.pierce = 0; b.hit.clear(); const vs = Math.pow(ev[7], 0.6);
      b.core.scale.set(vs * 0.8, vs * 0.8, vs * 2.6); b.m.rotation.y = Math.atan2(ev[5], ev[6]);
      const os = ships.get(ev[2]); const oc = os ? shipHex(os.slot) : 0xffb547;
      b.gl.material.color.setHex(oc); b.core.material.color.copy(lighten(oc, 0.3)); b.gl.scale.setScalar(1.05 * vs);
      netPB.set(b.id, b); break;
    }
    case 'pf': { const b = netPB.get(ev[1]); if (b) { PB.free(b); netPB.delete(ev[1]); } break; }
    case 'eb': {
      const b = EB.get(); b.id = ev[1]; b.m.position.set(ev[2], 0.8, ev[3]); b.v.set(ev[4], 0, ev[5]);
      b.life = 6; b.m.rotation.y = Math.atan2(ev[4], ev[5]);
      const sz = ev[6] || 1; b.core.scale.set(1.3 * sz, 1.3 * sz, 2.2 * sz); b.gl.scale.setScalar(2.1 * sz);
      netEB.set(b.id, b); break;
    }
    case 'ef': { const b = netEB.get(ev[1]); if (b) { EB.free(b); netEB.delete(ev[1]); } break; }
    case 'h': if (ev[1] === NET.myId) flashHurt(); break;
    case 'dd': if (ev[1] === NET.myId) rawBanner('TÀU VỠ', 'Hồi sinh ở đợt sau'); break;
    case 'rs': if (ev[1] === NET.myId && me) { me.pos.set(ev[2], 0, ev[3]); me.vx = me.vz = 0; me.dead = false; me.g.visible = true; rawBanner('HỒI SINH', 'Quay lại chiến đấu!'); } break;
  }
}

function sendInput() {
  if (!me) return;
  Net.send({
    t: 'in', x: r2(me.pos.x), z: r2(me.pos.z), ry: r2(me.g.rotation.y), rz: r2(me.g.rotation.z),
    ax: r2(me.aim.x), az: r2(me.aim.z), f: (me.firing && !me.dead) ? 1 : 0, d: me.dashT > 0 ? 1 : 0
  });
}

function enemyList() { return NET.mode === 'guest' ? netEn.values() : enemies; }

const pullV = { x: 0, z: 0 };
function pullAt(x, z) {
  pullV.x = pullV.z = 0;
  for (const e of enemyList()) {
    if (e.dead) continue;
    let k = 0;
    if (e.type === 'hole') k = e.st ? -18 : 30;
    else if (e.type === 'ultimate' && e.a > 0.5) k = 26;
    if (!k) continue;
    const dx = e.m.position.x - x, dz = e.m.position.z - z, d = Math.hypot(dx, dz) || 1;
    pullV.x += dx / d * k / (2 + d * 0.6); pullV.z += dz / d * k / (2 + d * 0.6);
  }
  return pullV;
}

function slowAt(x, z) {
  for (const e of enemyList()) {
    if (e.dead || e.type !== 'bubble') continue;
    const dx = e.m.position.x - x, dz = e.m.position.z - z;
    if (dx * dx + dz * dz < 16 * e.m.scale.x * e.m.scale.x) return 0.5;
  }
  return 1;
}
