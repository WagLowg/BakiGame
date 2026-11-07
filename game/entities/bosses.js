/* ==========================================================================
   ReChoice - js/entities/bosses.js
   Hành vi Trí tuệ Nhân tạo (AI) và Cơ chế 10 Trùm Cuối (Bosses) Đặc biệt
   ========================================================================== */
'use strict';

const angTo = (x, z, s) => Math.atan2(s.pos.x - x, s.pos.z - z);
function spray(x, z, n, spd, off = 0, size = 1) { for (let k = 0; k < n; k++) fireE(x, z, off + k * TAU / n, spd, size); }
function fan(x, z, a, n, spread, spd, size = 1) { for (let k = 0; k < n; k++) fireE(x, z, a + (n > 1 ? (k / (n - 1) - 0.5) * spread : 0), spd, size); }
function laserAt(x, z, s, w, warn, fire, col, dmg) { const a = angTo(x, z, s); rawBeam(x, z, x + Math.sin(a) * 70, z + Math.cos(a) * 70, w, warn, fire, col, dmg); if (typeof q === 'function') q(['L', r2(x), r2(z), r2(x + Math.sin(a) * 70), r2(z + Math.cos(a) * 70), r2(w), r2(warn), r2(fire), col]); if (isHost()) sfx.warn(); }
function shock(x, z, spd, maxR, dmg, col) { shocks.push({ x, z, r: 0, spd, maxR, dmg, hit: new Set() }); rawShock(x, z, spd, maxR, col); if (typeof q === 'function') q(['W', r2(x), r2(z), r2(spd), r2(maxR), col]); }
function markShip(s, dur) { rawMark(s.id, dur); if (typeof q === 'function') q(['mk', s.id, r2(dur)]); }
function toast(s, txt) { if (s.local) rawToast(txt); else if (typeof q === 'function') q(['to', s.id, txt]); }
function segDist(px, pz, x1, z1, x2, z2) { const dx = x2 - x1, dz = z2 - z1, l2 = dx * dx + dz * dz || 1; let t = ((px - x1) * dx + (pz - z1) * dz) / l2; t = clamp(t, 0, 1); const ex = x1 + dx * t - px, ez = z1 + dz * t - pz; return Math.sqrt(ex * ex + ez * ez); }
function moveTo(e, x, z, k) { e.m.position.x += (x - e.m.position.x) * k; e.m.position.z += (z - e.m.position.z) * k; }
function enemyDmg(base) { return base * (1 + 0.04 * (G ? G.wave : 1)) * (typeof diffCfg === 'function' ? diffCfg().dmgMul : 1); }
function silentKill(e, fx = true) { if (e.dead) return; e.dead = true; e.silent = true; if (fx) deathFx(e.m.position.x, e.m.position.y, e.m.position.z, e.t.col, 0.8); }

function spawnBee(q, slot) {
  const a = G.time * 1.5 + slot * TAU / 6;
  const b = spawnEnemy('bee', q.m.position.x + Math.cos(a) * 3.8, q.m.position.z + Math.sin(a) * 3.8, 0.5, { owner: q, slot });
  q.bees[slot] = b;
  return b;
}

function summonNotes(o) {
  const n = o.hp < o.max * 0.5 ? 4 : 3;
  o.notes = [];
  for (let i = 0; i < n; i++) {
    const a = i * TAU / n;
    o.notes.push(spawnEnemy('note', Math.cos(a) * 11, Math.sin(a) * 11, 0.7, { owner: o, idx: i, n, lzT: 2 + i * 0.9, a: i }));
  }
  o.summoned = true;
  o.vuln = 0;
  o.st = 0;
  banner('NỐT NHẠC XUẤT HIỆN', 'Phá hết nốt nhạc để gây sát thương');
}

function splitGolem(e) {
  const p = e.m.position.clone();
  e.dead = true; e.silent = true;
  deathFx(p.x, p.y, p.z, 0xff7a2a, 2.2); snd('big'); shake(0.8);
  banner('PHÂN RÃ!', 'Khối đá vỡ đôi');
  const ang = Math.random() * TAU;
  for (const k of [-1, 1]) {
    const lvl = e.lvl + 1, size = [1, 0.72, 0.52][lvl];
    const c = spawnEnemy('golem', p.x + Math.cos(ang) * k * 2, p.z + Math.sin(ang) * k * 2, 0.2, { lvl, size, hp: Math.max(e.max * 0.12, e.hp / 2), max: e.max / 4, stompT: 2 + Math.random() * 2, jump: 0 });
    c.r = e.t.r * size; c.spd = e.spd * 1.35; c.kx = Math.cos(ang) * k * 8; c.kz = Math.sin(ang) * k * 8;
  }
}

function twinPrevent(e) {
  const p = e.partner;
  if (p && !p.dead && !(p.down > 0)) {
    e.down = 3; e.hp = 1; e.inv = true; e.st = 1;
    banner('MỘT NỬA ĐÃ VỠ', '3 giây để hạ nửa còn lại!');
    deathFx(e.m.position.x, 2, e.m.position.z, e.t.col, 1.6);
    return true;
  }
  if (p && !p.dead) { p.down = 0; p.inv = false; kill(p); }
  return false;
}

function thiefRestore(e) {
  for (const [sid, id] of e.stolen) {
    const s = ships.get(sid); if (!s) continue;
    s.upg[id] = (s.upg[id] || 0) + 1;
    recalcStats(s); syncStats(s);
  }
  if (e.stolen.length) banner('LẤY LẠI NÂNG CẤP', '+' + e.stolen.length + ' nâng cấp và toàn bộ kinh nghiệm bị cướp');
  if (e.xpStore > 0) gainXp(e.xpStore);
  e.stolen = [];
}

function thiefTouch(e, s) {
  if ((e.stealCd[s.id] || 0) > G.time) return;
  e.stealCd[s.id] = G.time + 2.5;
  const ids = Object.keys(s.upg).filter(k => s.upg[k] > 0 && k !== 'heal');
  if (!ids.length) return;
  const id = ids[Math.floor(Math.random() * ids.length)];
  s.upg[id]--; recalcStats(s); syncStats(s); e.stolen.push([s.id, id]);
  toast(s, 'BỊ CƯỚP: ' + UMAP[id].n.toUpperCase());
  snd('steal'); emit(s.pos.x, 1, s.pos.z, 0x3dff8a, 20, 7, 0.5);
}

function ghostStrike(e) {
  const s = e.markTgt; const from = e.m.position.clone();
  if (s && !s.dead) {
    const bx = s.pos.x - s.aim.x * 2.6, bz = s.pos.z - s.aim.z * 2.6;
    e.m.position.x = bx; e.m.position.z = bz;
    deathFx(from.x, 1.5, from.z, 0xb07bff, 1); deathFx(bx, 1.5, bz, 0xff6bd6, 1.4);
    for (const o of ships.values()) {
      if (o.dead) continue;
      if (Math.hypot(o.pos.x - bx, o.pos.z - bz) < 3.4) hurt(o, enemyDmg(28));
    }
    ring(bx, bz, 0xff2a4a, 7, 0.4); snd('big'); shake(0.8);
  }
  e.expose = 2.6; e.a = 1;
}

function mineBoom(e) {
  if (e.dead) return;
  const p = e.m.position; e.dead = true; e.silent = true;
  deathFx(p.x, 0.5, p.z, 0xff3355, 1.3);
  spray(p.x, p.z, 8, 7, Math.random(), 0.9);
  shock(p.x, p.z, 9, 3.5, enemyDmg(14), 0xff3355);
  snd('kill');
}

const AI = {
  queen(e, dt) {
    const m = e.m.position; e.tq -= dt;
    if (e.open) { if (e.tq <= 0) { e.open = 0; e.st = 0; e.tq = e.hp < e.max * 0.5 ? 4 : 5.5; } }
    else if (e.tq <= 0) {
      e.open = 1; e.st = 1; e.tq = 3.2;
      for (let i = 0; i < (e.hp < e.max * 0.5 ? 6 : 4); i++) {
        const a = Math.random() * TAU, r = rnd(5, RA - 3);
        spawnEnemy('egg', Math.cos(a) * r, Math.sin(a) * r, 0.4, { hatch: 0, owner: e });
      }
      spray(m.x, m.z, 12, 8, Math.random(), 1.1); snd('big'); shake(0.4);
    }
    e.inv = !e.open;
    e.beeT -= dt;
    if (e.beeT <= 0) { e.beeT = 6; for (let i = 0; i < 6; i++) { const b = e.bees[i]; if (!b || b.dead) { spawnBee(e, i); break; } } }
    e.ph += dt; moveTo(e, Math.cos(e.ph * 0.22) * 7, Math.sin(e.ph * 0.22) * 7, Math.min(1, dt * 0.5));
    e.st = e.open ? 1 : 0;
    G.bossInfo = e.open ? 'VỎ MỞ · BẮN NGAY!' : 'VỎ ĐANG ĐÓNG';
    return false;
  },
  bee(e, dt) {
    const q = e.owner; if (!q || q.dead) { silentKill(e); return false; }
    const a = G.time * 1.5 + e.slot * TAU / 6;
    e.m.position.x = q.m.position.x + Math.cos(a) * 3.8;
    e.m.position.z = q.m.position.z + Math.sin(a) * 3.8;
    e.m.position.y = 1.4 + Math.sin(G.time * 4 + e.slot) * 0.3;
    e.m.rotation.y = -a;
    return false;
  },
  egg(e, dt) {
    e.hatch += dt / 4; e.a = e.hatch;
    if (e.hatch >= 1) {
      const p = e.m.position; silentKill(e, false); deathFx(p.x, 0.6, p.z, 0xffe08a, 0.8);
      for (let i = 0; i < 3; i++) {
        const s = spawnEnemy('mini', p.x + rnd(-0.7, 0.7), p.z + rnd(-0.7, 0.7), 0.15);
        s.kx = rnd(-6, 6); s.kz = rnd(-6, 6);
      }
    }
    return false;
  },
  golem(e, dt, tgt, dx, dz, d) {
    e.stompT -= dt;
    const base = e.t.y * e.size;
    if (e.jump > 0) {
      e.jump -= dt; const k = 1 - e.jump / 0.75;
      e.m.position.y = base + Math.sin(k * Math.PI) * 3.4 * e.size; e.st = 1;
      if (e.jump <= 0) {
        e.st = 0; e.m.position.y = base; const p = e.m.position;
        shock(p.x, p.z, 12 + e.lvl * 2, 15 - e.lvl * 3.5, enemyDmg(18), 0xff7a2a);
        shake(0.8); snd('big'); deathFx(p.x, 0.3, p.z, 0xff9a3d, 1.2 * e.size);
      }
      return [dx / d, dz / d, e.spd * 0.5];
    }
    if (e.stompT <= 0) { e.stompT = 4.2 - e.lvl * 0.9 + rnd(0, 1); e.jump = 0.75; }
    e.m.position.y = base;
    e.m.rotation.y = Math.atan2(dx, dz);
    G.bossInfo = 'KHỐI ĐÁ: ' + enemies.filter(x => !x.dead && x.type === 'golem').length;
    return [dx / d, dz / d, e.spd];
  },
  hole(e, dt, tgt, dx, dz, d) {
    e.cyc -= dt;
    if (e.st === 0 && e.cyc <= 0) { e.st = 1; e.cyc = 3.6; banner('HỐ ĐEN THỞ RA', 'Lõi đã lộ · bắn ngay!'); sfx.warn(); }
    else if (e.st === 1 && e.cyc <= 0) { e.st = 0; e.cyc = e.hp < e.max * 0.5 ? 5.5 : 7; }
    e.inv = e.st === 0;
    if (e.st === 0) {
      e.spitT -= dt;
      if (e.spitT <= 0) { e.spitT = e.hp < e.max * 0.5 ? 2 : 2.7; spray(e.m.position.x, e.m.position.z, 10, 6, Math.random(), 1.9); snd('enemyShot'); }
    }
    e.m.rotation.y += dt * (e.st ? 3 : 1);
    G.bossInfo = e.st ? 'LÕI LỘ RA' : 'ĐANG HÚT';
    return [dx / d, dz / d, e.st ? 0.4 : 1.1];
  },
  twinA(e, dt, tgt) { return AI.twin(e, dt, tgt); },
  twinB(e, dt, tgt) { return AI.twin(e, dt, tgt); },
  twin(e, dt, tgt) {
    const p = e.partner;
    if (e.lead) G.twinAng += dt * 0.22 * ((p && p.dead) || e.hp < e.max * 0.5 ? 1.6 : 1);
    const a = G.twinAng + (e.type === 'twinB' ? Math.PI : 0);
    moveTo(e, Math.cos(a) * 10, Math.sin(a) * 10, Math.min(1, dt * 2));
    if (e.down > 0) {
      e.down -= dt; e.st = 1; e.inv = true;
      if (e.down <= 0) {
        if (p && !p.dead && !(p.down > 0)) {
          e.hp = e.max; e.st = 0; e.inv = false;
          banner('HỒI SINH', 'Nửa kia hồi lại đầy máu');
          spawnFx(e.m.position.x, e.m.position.z, e.t.col, true);
        } else { e.down = 0; }
      }
      G.bossInfo = 'MỘT NỬA ĐÃ VỠ · ' + Math.max(0, e.down).toFixed(1) + 's';
      return false;
    }
    e.st = 0; e.inv = false;
    if (tgt) {
      const want = Math.atan2(tgt.pos.x - e.m.position.x, tgt.pos.z - e.m.position.z);
      let df = want - e.face; df = Math.atan2(Math.sin(df), Math.cos(df)); e.face += clamp(df, -dt * 0.8, dt * 0.8);
    }
    e.m.rotation.y = e.face;
    e.fireT -= dt;
    if (e.fireT <= 0 && tgt) {
      e.fireT = e.hp < e.max * 0.5 ? 1.7 : 2.4;
      fan(e.m.position.x, e.m.position.z, angTo(e.m.position.x, e.m.position.z, tgt), 3, 0.5, 11, 1.1);
      snd('enemyShot');
    }
    if (!(p && p.down > 0) && !(e.down > 0)) G.bossInfo = 'BẮN VÀO MẶT TỐI';
    return false;
  },
  maestro(e, dt) {
    moveTo(e, 0, 0, Math.min(1, dt * 0.5));
    e.m.position.y = e.t.y + Math.sin(G.time * 1.5) * 0.3;
    const alive = e.notes.filter(n => !n.dead).length;
    if (e.vuln > 0) { e.vuln -= dt; e.st = 1; e.inv = false; if (e.vuln <= 0) summonNotes(e); }
    else if (!alive && e.summoned) { e.vuln = 6; e.st = 1; banner('NHẠC TẮT!', 'Bắn Nhạc Trưởng ngay'); snd('big'); }
    else { e.st = 0; e.inv = true; e.hp = Math.min(e.max, e.hp + e.max * 0.012 * dt); }
    e.beatT -= dt;
    if (e.beatT <= 0) { e.beatT = 60 / 116 * 2; e.ang += 0.45; spray(e.m.position.x, e.m.position.z, 6, 6, e.ang, 0.9); e.punch = 1; }
    e.m.rotation.y += dt * 0.2;
    G.bossInfo = e.vuln > 0 ? 'BẮN NGAY · ' + e.vuln.toFixed(1) + 's' : 'NỐT NHẠC: ' + alive;
    return false;
  },
  note(e, dt) {
    const o = e.owner; if (!o || o.dead) { silentKill(e); return false; }
    const a = G.time * 0.35 + e.idx * TAU / e.n, r = 11 + Math.sin(G.time + e.idx) * 1.5;
    e.m.position.x = o.m.position.x + Math.cos(a) * r;
    e.m.position.z = o.m.position.z + Math.sin(a) * r;
    e.m.rotation.y = -a;
    e.lzT -= dt;
    if (e.lzT <= 0) {
      e.lzT = (o.hp < o.max * 0.5 ? 2.6 : 3.6) + rnd(0, 0.6);
      const s = nearestShip(e.m.position.x, e.m.position.z);
      if (s) laserAt(e.m.position.x, e.m.position.z, s, 1.15, 1, 0.4, NOTE_COLS[e.idx % 4], enemyDmg(20));
    }
    return false;
  },
  ghost(e, dt, tgt, dx, dz, d) {
    const near = tgt ? Math.hypot(dx, dz) < 7 : false;
    const want = e.expose > 0 || e.flash > 0 || e.punch > 0.2 ? 1 : near ? 0.75 : 0.1;
    e.a += (want - e.a) * Math.min(1, dt * (want > e.a ? 12 : 2.5)); e.vis = e.a;
    if (e.expose > 0) { e.expose -= dt; e.dmgMul = 1.6; G.bossInfo = 'LỘ HÌNH · x1.6 SÁT THƯƠNG'; return [0, 0, 0]; }
    e.dmgMul = 1;
    if (e.markT > 0) { e.markT -= dt; G.bossInfo = 'ĐANG SĂN MỒI…'; if (e.markT <= 0) ghostStrike(e); return [dx / d, dz / d, e.spd * 0.3]; }
    G.bossInfo = 'TÀNG HÌNH';
    e.decoyT -= dt;
    if (e.decoyT <= 0) {
      e.decoyT = 7.5;
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * TAU; spawnEnemy('decoy', e.m.position.x + Math.cos(a) * 3, e.m.position.z + Math.sin(a) * 3, 0.3, { owner: e });
      }
    }
    e.mkCd -= dt;
    if (e.mkCd <= 0) {
      const al = aliveShips();
      if (al.length) { e.mkCd = e.hp < e.max * 0.5 ? 6 : 8; e.markTgt = al[Math.floor(Math.random() * al.length)]; e.markT = 2; markShip(e.markTgt, 2); snd('warn'); }
    }
    e.wan += dt * 0.6;
    const tx = (tgt ? tgt.pos.x : 0) + Math.cos(e.wan) * 9, tz = (tgt ? tgt.pos.z : 0) + Math.sin(e.wan) * 9;
    const wx = tx - e.m.position.x, wz = tz - e.m.position.z, wd = Math.hypot(wx, wz) || 1;
    e.m.rotation.y = Math.atan2(dx, dz);
    return [wx / wd, wz / wd, e.spd];
  },
  decoy(e, dt, tgt, dx, dz, d) { e.m.rotation.y = Math.atan2(dx, dz); return [dx / d, dz / d, e.spd]; },
  thief(e, dt, tgt, dx, dz, d) {
    e.size = 1 + Math.min(0.8, e.grow); e.r = e.t.r * e.size; e.a = e.grow;
    e.fireT -= dt;
    if (e.fireT <= 0 && tgt) {
      e.fireT = 2; const n = Math.min(7, 1 + e.stolen.length);
      fan(e.m.position.x, e.m.position.z, angTo(e.m.position.x, e.m.position.z, tgt), n, 0.18 * n, 11, 1); snd('enemyShot');
    }
    let best = null, bd = 14 * 14;
    for (const g of GM.items) {
      if (!g.on) continue;
      const qd = (g.m.position.x - e.m.position.x) ** 2 + (g.m.position.z - e.m.position.z) ** 2;
      if (qd < bd) { bd = qd; best = g; }
    }
    G.bossInfo = 'ĐÃ CƯỚP: ' + e.stolen.length + ' NÂNG CẤP';
    if (best) {
      const gx = best.m.position.x - e.m.position.x, gz = best.m.position.z - e.m.position.z, gd = Math.hypot(gx, gz) || 1;
      e.m.rotation.y = Math.atan2(gx, gz); return [gx / gd, gz / gd, e.spd * 1.15];
    }
    e.m.rotation.y = Math.atan2(dx, dz);
    return [dx / d, dz / d, e.spd];
  },
  clock(e, dt) {
    e.m.position.x = 0; e.m.position.z = 0;
    const sp = e.hp < e.max * 0.5 ? 1.35 : 1;
    e.a += dt * 0.33 * sp; e.b -= dt * 1.05 * sp;
    for (const s of ships.values()) {
      if (s.dead) continue;
      const hd = segDist(s.pos.x, s.pos.z, 0, 0, Math.sin(e.a) * RA, Math.cos(e.a) * RA);
      const md = segDist(s.pos.x, s.pos.z, 0, 0, Math.sin(e.b) * RA, Math.cos(e.b) * RA);
      if (hd < 1.0 + 0.45 || md < 0.38 + 0.45) hurt(s, enemyDmg(18));
    }
    e.bubT -= dt;
    if (e.bubT <= 0) {
      e.bubT = 6;
      if (enemies.filter(x => !x.dead && x.type === 'bubble').length < 3) {
        const a = Math.random() * TAU, r = rnd(8, RA - 6);
        spawnEnemy('bubble', Math.cos(a) * r, Math.sin(a) * r, 0.5, { life: 10, owner: e });
      }
    }
    e.rwT -= dt;
    if (e.stT > 0) { e.stT -= dt; if (e.stT <= 0) e.st = 0; }
    if (e.rwT <= 0) {
      e.rwT = 5;
      if (e.rwHp - e.hp < e.max * 0.06 && e.hp < e.rwHp) {
        e.hp = e.rwHp;
        banner('TUA NGƯỢC!', 'Sát thương chưa đủ · dồn bắn nhanh hơn');
        snd('rewind'); e.st = 1; e.stT = 0.6; ring(0, 0, 0x7ad7ff, 14, 0.8);
      }
      e.rwHp = e.hp;
    }
    const need = Math.ceil(e.hp - (e.rwHp - e.max * 0.06));
    G.bossInfo = 'TUA NGƯỢC SAU ' + Math.max(0, e.rwT).toFixed(1) + 's · ' + (need > 0 ? 'CẦN THÊM ' + need + ' SÁT THƯƠNG' : 'ĐỦ SÁT THƯƠNG');
    return false;
  },
  bubble(e, dt) { e.life -= dt; if (e.life <= 0) silentKill(e, false); return false; },
  dhead(e, dt, tgt) {
    const n = e.segs.filter(s => !s.dead).length; e.inv = n >= 5;
    let spd = e.spd;
    e.chT -= dt;
    if (e.chT <= 0 && tgt && e.wind <= 0 && e.charge <= 0) { e.wind = 0.8; e.chT = 9; e.st = 1; snd('warn'); }
    let want;
    if (e.wind > 0) { e.wind -= dt; spd = 2; want = tgt ? angTo(e.m.position.x, e.m.position.z, tgt) : e.dirA; if (e.wind <= 0) { e.charge = 1.1; snd('dash'); } }
    else if (e.charge > 0) { e.charge -= dt; spd = 24; want = e.dirA; if (e.charge <= 0) e.st = 0; }
    else { e.phi += dt * 0.45; const tx = Math.cos(e.phi) * 18, tz = Math.sin(e.phi * 2) * 12; want = Math.atan2(tx - e.m.position.x, tz - e.m.position.z); }
    let df = want - e.dirA; df = Math.atan2(Math.sin(df), Math.cos(df)); e.dirA += clamp(df, -dt * (e.wind > 0 ? 6 : 2.4), dt * (e.wind > 0 ? 6 : 2.4));
    const p = e.m.position; p.x += Math.sin(e.dirA) * spd * dt; p.z += Math.cos(e.dirA) * spd * dt;
    const pl = Math.hypot(p.x, p.z); if (pl > RA - 2) { p.x *= (RA - 2) / pl; p.z *= (RA - 2) / pl; e.dirA = Math.atan2(-p.x, -p.z) + rnd(-0.5, 0.5); }
    e.m.rotation.y = e.dirA; p.y = e.t.y + Math.sin(G.time * 3) * 0.2;
    const last = e.path[0]; if (!last || Math.hypot(last[0] - p.x, last[1] - p.z) > 0.25) { e.path.unshift([p.x, p.z]); if (e.path.length > 420) e.path.pop(); }

    let k = 0, acc = 0, i = 0; const alive = e.segs.filter(s => !s.dead);
    for (const sg of alive) {
      i++; const wantSeg = i * 1.25;
      while (k < e.path.length - 1) {
        const a = e.path[k], b = e.path[k + 1]; const l = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (acc + l >= wantSeg) {
          const f = (wantSeg - acc) / l;
          sg.m.position.x = a[0] + (b[0] - a[0]) * f; sg.m.position.z = a[1] + (b[1] - a[1]) * f;
          sg.m.rotation.y = Math.atan2(a[0] - b[0], a[1] - b[1]); break;
        }
        acc += l; k++;
      }
      sg.m.position.y = sg.t.y + Math.sin(G.time * 3 - i * 0.5) * 0.25;
      sg.a = 1 - i / 26; sg.size = 0.6 + 0.4 * (1 - i / 22);
    }
    e.mineT -= dt;
    if (e.mineT <= 0 && alive.length) {
      e.mineT = 2.2;
      if (enemies.filter(x => !x.dead && x.type === 'mine').length < 12) {
        const tl = alive[alive.length - 1].m.position; spawnEnemy('mine', tl.x, tl.z, 0.2, { age: 0 });
      }
    }
    G.bossInfo = e.inv ? 'ĐỐT THÂN: ' + n + ' · ĐẦU CÒN GIÁP' : 'ĐẦU RỒNG LỘ RA!';
    return false;
  },
  dseg(e, dt) { if (!e.owner || e.owner.dead) { silentKill(e); } return false; },
  mine(e, dt) {
    e.age += dt; e.st = e.age > 0.8 ? 1 : 0; const s = nearestShip(e.m.position.x, e.m.position.z);
    if (e.age > 8 || (e.st && s && Math.hypot(s.pos.x - e.m.position.x, s.pos.z - e.m.position.z) < 2.2)) mineBoom(e);
    return false;
  },
  ultimate(e, dt, tgt, dx, dz, d) {
    const r = e.hp / e.max, ph = r > 0.667 ? 1 : r > 0.333 ? 2 : 3;
    if (ph !== e.phase) {
      e.phase = ph; e.st = ph; e.atkT = 2.5;
      if (ph === 2) { banner('GIAI ĐOẠN 2', 'Nhạc · Bóng ma · Thời gian'); summonNotes(e); }
      if (ph === 3) { banner('GIAI ĐOẠN 3', 'Đấu trường đang thu nhỏ!'); G.shrink = true; for (const n of e.notes) if (!n.dead) silentKill(n); }
      snd('boss'); shake(1.2); deathFx(e.m.position.x, e.m.position.y, e.m.position.z, 0xffc04d, 2.5);
    }
    e.st = ph;
    if (e.pullT > 0) { e.pullT -= dt; e.a = 1; } else e.a = 0;
    const alive = e.notes.filter(n => !n.dead).length;
    if (ph === 2) {
      if (alive) { e.inv = true; e.hp = Math.min(e.max * 0.667, e.hp + e.max * 0.004 * dt); }
      else { e.inv = false; if (e.summoned && !e.vuln) { e.vuln = 7; } if (e.vuln > 0) { e.vuln -= dt; if (e.vuln <= 0 && e.phase === 2) summonNotes(e); } }
    } else e.inv = false;

    const p = e.m.position;
    e.atkT -= dt;
    if (e.atkT <= 0 && tgt) {
      const pick = ph === 1 ? ['eggs', 'pull', 'burst', 'twin'][Math.floor(Math.random() * 4)]
        : ph === 2 ? ['decoy', 'bubble', 'burst'][Math.floor(Math.random() * 3)]
        : ['burst', 'charge', 'mines'][Math.floor(Math.random() * 3)];

      if (pick === 'eggs') { for (let i = 0; i < 4; i++) { const a = Math.random() * TAU, rr = rnd(6, RA - 3); spawnEnemy('egg', Math.cos(a) * rr, Math.sin(a) * rr, 0.4, { hatch: 0, owner: e }); } e.atkT = 3; }
      else if (pick === 'pull') { e.pullT = 3; banner('LỰC HÚT', 'Chạy ra xa!'); e.atkT = 4; }
      else if (pick === 'burst') { spray(p.x, p.z, ph === 3 ? 32 : 24, 10, Math.random(), 1.2); snd('big'); shake(0.5); e.atkT = 2.2; }
      else if (pick === 'twin') { for (let k = 0; k < 2; k++) fan(p.x, p.z, angTo(p.x, p.z, tgt) + (k ? 0.6 : -0.6), 5, 0.8, 12, 1); e.atkT = 2.5; }
      else if (pick === 'decoy') { for (let i = 0; i < 3; i++) { const a = Math.random() * TAU; spawnEnemy('decoy', p.x + Math.cos(a) * 4, p.z + Math.sin(a) * 4, 0.3, { owner: e }); } e.atkT = 3.5; }
      else if (pick === 'bubble') { for (let i = 0; i < 2; i++) { const a = Math.random() * TAU, rr = rnd(6, RA - 6); spawnEnemy('bubble', Math.cos(a) * rr, Math.sin(a) * rr, 0.5, { life: 9, owner: e }); } e.atkT = 3; }
      else if (pick === 'charge') { e.charge = 1.2; e.chDir = angTo(p.x, p.z, tgt); snd('dash'); e.atkT = 3; }
      else if (pick === 'mines') { for (let i = 0; i < 4; i++) { const a = Math.random() * TAU, rr = rnd(3, RA - 2); spawnEnemy('mine', Math.cos(a) * rr, Math.sin(a) * rr, 0.3, { age: 0 }); } e.atkT = 2.5; }
    }
    if (ph === 3) {
      e.spT -= dt;
      if (e.spT <= 0) { e.spT = 0.11; e.ang = (e.ang || 0) + 0.37; fireE(p.x, p.z, e.ang, 7.5, 1); fireE(p.x, p.z, e.ang + Math.PI, 7.5, 1); }
    }
    G.bossInfo = 'GIAI ĐOẠN ' + ph + (ph === 2 && alive ? ' · PHÁ NỐT NHẠC' : '');
    e.m.rotation.y += dt * 0.3;
    if (e.charge > 0) { e.charge -= dt; return [Math.sin(e.chDir), Math.cos(e.chDir), 20]; }
    return [dx / d, dz / d, e.spd * (ph === 3 ? 1.3 : 1)];
  }
};

function bossAI(e, dt, dx, dz, d) {
  const m = e.m, enr = e.hp < e.max * 0.5;
  let ax = dx / d, az = dz / d, spd = e.spd * (enr ? 1.25 : 1);
  if (e.mode === 'wind') {
    e.modeT -= dt; e.flash = 0.05; spd = 0;
    if (Math.random() < 0.5) emit(m.position.x, 1, m.position.z, 0xff3fa4, 2, 6, 0.4);
    if (e.modeT <= 0) { e.mode = 'charge'; e.modeT = 0.75; e.cx = ax; e.cz = az; G.shake = 0.5; snd('dash'); }
    return [ax, az, 0];
  }
  if (e.mode === 'charge') {
    e.modeT -= dt; e.vx = e.cx * 24; e.vz = e.cz * 24; if (e.modeT <= 0) e.mode = null;
    emit(m.position.x, 0.6, m.position.z, 0xff3fa4, 3, 3, 0.4);
    return [e.cx, e.cz, 24];
  }
  if (e.mode === 'spiral') {
    e.modeT -= dt; e.scd -= dt;
    if (e.scd <= 0) {
      e.scd = enr ? 0.055 : 0.075; e.ang += 0.33; const arms = enr ? 4 : 3;
      for (let k = 0; k < arms; k++) fireE(m.position.x, m.position.z, e.ang + k * TAU / arms, 8.5);
    }
    if (e.modeT <= 0) e.mode = null;
    return [ax, az, spd * 0.35];
  }
  e.atkT -= dt;
  if (e.atkT <= 0 && state === 'play') {
    const pick = ['burst', 'spiral', 'summon', 'charge'][Math.floor(Math.random() * 4)];
    if (pick === 'burst') {
      const n = enr ? 28 : 20, off = Math.random() * TAU;
      for (let k = 0; k < n; k++) fireE(m.position.x, m.position.z, off + k * TAU / n, 10);
      if (enr) setTimeout(() => { if (!e.dead && state === 'play') for (let k = 0; k < n; k++) fireE(m.position.x, m.position.z, off + (k + 0.5) * TAU / n, 8); }, 350);
      G.shake = 0.4; snd('big'); e.atkT = 2.2;
    } else if (pick === 'spiral') { e.mode = 'spiral'; e.modeT = 2.4; e.scd = 0; e.atkT = 3.4; }
    else if (pick === 'summon') {
      for (let k = 0; k < (enr ? 5 : 3); k++) {
        const a = Math.random() * TAU;
        spawnEnemy(Math.random() < 0.5 ? 'chaser' : 'shooter', m.position.x + Math.cos(a) * 4, m.position.z + Math.sin(a) * 4, 0.5);
      }
      e.atkT = 2.6;
    } else { e.mode = 'wind'; e.modeT = 0.65; e.atkT = 3.2; }
    if (enr) e.atkT *= 0.7;
  }
  if (e.mode === 'charge') {
    const wantAng = Math.atan2(e.cx, e.cz);
    m.rotation.y = lerpAngle(m.rotation.y, wantAng, Math.min(1, dt * 10));
  } else {
    const wantAng = Math.atan2(dx, dz);
    m.rotation.y = lerpAngle(m.rotation.y, wantAng, Math.min(1, dt * 3.5));
  }
  m.rotation.z = Math.sin((typeof G !== 'undefined' && G ? G.time : 0) * 2.5) * 0.05;
  m.position.y = e.t.y + Math.sin(G.time * 2) * 0.2;
  return [ax, az, spd];
}

function startFight(idx) {
  const [ex, ez] = edgePos(), bx = ex * 0.55, bz = ez * 0.55;
  const f = { kind: idx, parts: [] };
  G.fight = f; G.bossKind = idx;
  switch (BOSSES[idx].key) {
    case 'queen': {
      const q = spawnEnemy('queen', bx, bz, 1.4, { open: 0, tq: 4, beeT: 1, bees: [], eggT: 0 });
      f.main = q;
      for (let i = 0; i < 6; i++) spawnBee(q, i);
      break;
    }
    case 'golem': f.main = spawnEnemy('golem', bx, bz, 1.4, { lvl: 0, stompT: 3, jump: 0, size: 1 }); break;
    case 'hole': f.main = spawnEnemy('hole', 0, 0, 1.6, { cyc: 6, spitT: 2 }); break;
    case 'twins': {
      G.twinAng = Math.random() * TAU;
      const A = spawnEnemy('twinA', Math.cos(G.twinAng) * 10, Math.sin(G.twinAng) * 10, 1.4, { face: 0, fireT: 2, down: 0, preventDeath: twinPrevent });
      const B = spawnEnemy('twinB', -Math.cos(G.twinAng) * 10, -Math.sin(G.twinAng) * 10, 1.4, { face: 0, fireT: 3.1, down: 0, preventDeath: twinPrevent });
      A.partner = B; B.partner = A; A.lead = true; f.main = A; break;
    }
    case 'maestro': {
      const m = spawnEnemy('maestro', 0, 0, 1.6, { vuln: 0, beatT: 1, notes: [], summoned: false, ang: 0 });
      f.main = m; summonNotes(m); break;
    }
    case 'ghost': f.main = spawnEnemy('ghost', bx, bz, 1.4, { a: 1, expose: 0, markT: 0, mkCd: 4, decoyT: 3, wan: Math.random() * TAU }); break;
    case 'thief': f.main = spawnEnemy('thief', bx, bz, 1.4, { grow: 0, stolen: [], xpStore: 0, fireT: 2, stealCd: {} }); break;
    case 'clock': f.main = spawnEnemy('clock', 0, 0, 1.6, { a: 0, b: Math.PI, bubT: 3, rwT: 5, rwHp: 0, stT: 0 }); f.main.rwHp = f.main.hp; break;
    case 'dragon': {
      const h = spawnEnemy('dhead', ex * 0.8, ez * 0.8, 1.2, { segs: [], path: [], dirA: Math.atan2(-ex, -ez), phi: Math.random() * TAU, chT: 8, wind: 0, charge: 0, mineT: 3 });
      for (let i = 0; i < 20; i++) {
        const sg = spawnEnemy('dseg', ex * 0.8, ez * 0.8, 0.9 + i * 0.03, { owner: h, idx: i }); h.segs.push(sg);
      }
      f.main = h; break;
    }
    case 'ultimate': f.main = spawnEnemy('ultimate', 0, 0, 2, { phase: 1, atkT: 3, notes: [], summoned: false, pullT: 0, spT: 0, mineT: 3, chargeT: 6, charge: 0, a: 0 }); break;
  }
  G.boss = f.main;
  G.bossMax = enemies.filter(e => !e.dead && (e.t.boss || e.t.bar)).reduce((s, e) => s + e.max, 0) || 1;
  shake(1); addRipple(0, 0, 2);
}

function endFight() {
  const f = G.fight; G.fight = null;
  const df = typeof diffCfg === 'function' ? diffCfg() : { bossCore: true, bossClearHeal: 35, name: 'VỪA' };
  for (const e of enemies) if (!e.dead && e.t.part) silentKill(e);
  const healAmt = df.bossClearHeal !== undefined ? df.bossClearHeal : 35;
  for (const s of ships.values()) if (!s.dead) s.S.hp = Math.min(s.S.maxHp, s.S.hp + healAmt);
  G.bossKind = -1; G.boss = null; G.shrink = false;

  // Cơ chế Thưởng Lõi Boss: Chỉ nhận khi độ khó cho phép (Easy & Normal)
  if (df.bossCore) {
    G.pendingLv++;
    setTimeout(() => {
      if (state === 'play' && typeof openLevel === 'function') openLevel();
    }, 450);
  }

  if (f && f.kind === 9) {
    G.wins++; G.score += 50000 * (typeof loopMul === 'function' ? loopMul() : 1);
    banner('CHIẾN THẮNG TUYỆT ĐỐI!', 'Lõi Hư Không Đã Vỡ · Thắng Toàn Diện!');
    snd('win');
    if (typeof q === 'function') q(['V']);
    victoryFx();
  } else if (f && f.kind >= 0) {
    const sub = df.bossCore ? 'Chiến lợi phẩm: Chọn 1 Lõi Nâng Cấp!' : `Chế độ ${df.name}: Hạ Trùm Khủng · Không cấp Lõi!`;
    banner(BOSSES[f.kind].name.toUpperCase() + ' ĐÃ BỊ HẠ!', sub);
    snd('lvl');
  } else {
    const sub = df.bossCore ? 'Chiến lợi phẩm: Chọn 1 Lõi Nâng Cấp!' : `Chế độ ${df.name}: Hạ Trùm Thành Công · Không cấp Lõi!`;
    banner('TRÙM ĐÃ BỊ TIÊU DIỆT!', sub);
    snd('lvl');
  }
}
