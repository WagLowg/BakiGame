/* ==========================================================================
   ReChoice - js/systems/combat.js
   Cơ chế Chiến đấu: Va chạm, Sát thương, Tiêu diệt quái, Bắn đạn & Lướt né
   ========================================================================== */
'use strict';

const mult = () => Math.min(4, 1 + Math.floor((G ? G.combo : 0) / 10) * 0.5);
const shipHex = slot => {
  if (typeof me !== 'undefined' && me && me.slot === slot && me.colorHex) return me.colorHex;
  return typeof getShipColor === 'function' ? getShipColor(slot, slot === 0)[0] : SHIP_COLORS[slot % 4][0];
};
const pendingBoom = [];

function damage(e, amt, crit) {
  if (e.dead || e.spawn > 0) return;
  const p = e.m.position;
  if (e.inv) {
    rawBlockFx(p.x, p.y, p.z);
    if (typeof q === 'function') q(['bl', r2(p.x), r2(p.y), r2(p.z)]);
    return;
  }
  amt *= e.dmgMul || 1;
  e.hp -= amt; e.flash = 0.08; e.punch = 1;
  rawHitFx(p.x, p.y, p.z, e.t.col, crit, amt);
  if (typeof q === 'function') q(['hx', r2(p.x), r2(p.y), r2(p.z), e.t.col, crit ? 1 : 0, Math.round(amt)]);
  snd('hit');
  if (e.type === 'golem' && e.lvl < 2 && e.hp <= e.max / 2) { splitGolem(e); return; }
  if (e.hp <= 0) { if (e.preventDeath && e.preventDeath(e)) return; kill(e); }
}

function hitBy(e, s, amt, crit) {
  e.lastBoom = s.S.boom;
  e.lastDmg = s.S.dmg;
  e.lastShip = s;
  if (s.boostT > 0) amt *= 2;
  damage(e, amt, crit);
}

function kill(e) {
  if (e.dead) return;
  e.dead = true;
  const p = e.m.position, boss = !!e.t.boss;
  deathFx(p.x, p.y, p.z, e.t.col, boss ? 3 : e.type === 'tank' ? 1.6 : e.type === 'mini' ? 0.6 : 1);
  G.combo++; G.comboT = 2.2; G.kills++;
  G.score += e.t.sc * (1 + G.wave * 0.1) * mult();

  // Nạp Ultimate cho tàu tiêu diệt
  const killer = e.lastShip || me;
  if (killer && typeof killer.chargeUlt === 'function') {
    const charge = boss ? 35 : (e.type === 'tank' ? 10 : 2.5);
    killer.chargeUlt(charge);
  }

  // Rơi Vật phẩm (Feature 3: Pickups)
  if (typeof spawnPickup === 'function' && typeof PK_TYPES !== 'undefined') {
    const pkKeys = Object.keys(PK_TYPES);
    const rndPk = () => pkKeys[Math.floor(Math.random() * pkKeys.length)];
    if (boss) {
      spawnPickup(rndPk(), p.x + rnd(-1.5, 1.5), p.z + rnd(-1.5, 1.5));
      if (Math.random() < 0.6) spawnPickup('heal', p.x + rnd(-1.5, 1.5), p.z + rnd(-1.5, 1.5));
      if (!G.fight) {
        G.pendingLv++;
        setTimeout(() => {
          if (state === 'play' && typeof openLevel === 'function') openLevel();
        }, 450);
        rawBanner('CHIẾN LỢI PHẨM BOSS!', 'Hạ gục Boss · Thưởng 1 Lõi Nâng Cấp!');
      }
    } else if (e.type === 'tank') {
      if (Math.random() < 0.35) spawnPickup(rndPk(), p.x, p.z);
    } else if (Math.random() < 0.04) {
      spawnPickup(rndPk(), p.x, p.z);
    }
  }

  if (e.t.xp > 0) {
    const n = Math.min(boss ? 24 : Math.ceil(e.t.xp), boss ? 24 : 5), val = e.t.xp * (1 + G.wave * 0.05) / n;
    for (let i = 0; i < n; i++) {
      const g = GM.get();
      g.m.position.set(p.x, 0.5, p.z);
      g.v.set(rnd(-1, 1), 0, rnd(-1, 1)).normalize().multiplyScalar(rnd(2, boss ? 14 : 5));
      g.val = val; g.t = Math.random() * 5;
    }
  }

  if (e.type === 'splitter') {
    for (let i = 0; i < 2; i++) {
      const s = spawnEnemy('mini', p.x + rnd(-0.6, 0.6), p.z + rnd(-0.6, 0.6), 0.12);
      s.kx = rnd(-6, 6); s.kz = rnd(-6, 6);
    }
  }
  if (e.type === 'decoy') spray(p.x, p.z, 8, 7, Math.random(), 0.9);
  if (e.type === 'mine') { e.dead = false; mineBoom(e); }
  if (e.type === 'thief') thiefRestore(e);
  if (e.lastBoom > 0) pendingBoom.push({ x: p.x, z: p.z, r: 2.2 + e.lastBoom * 0.8, dmg: e.lastDmg * (0.9 + 0.5 * e.lastBoom), boom: e.lastBoom, src: e.lastDmg });

  if (boss) { G.shake = 1.4; G.slow = 0.9; snd('big'); }
  else { G.shake = Math.max(G.shake, e.type === 'tank' ? 0.4 : 0.15); snd('kill'); }
}

function hurt(s, d) {
  if (s.dead || s.downed || s.inv > 0 || s.dashT > 0 || state !== 'play') return;
  s.S.hp -= d; s.inv = 0.75; G.combo = 0;
  if (typeof s.chargeUlt === 'function') s.chargeUlt(3);
  emit(s.pos.x, 0.7, s.pos.z, 0xff4f6d, 16, 7, 0.5);
  if (s.local) flashHurt();
  else if (typeof q === 'function') q(['h', s.id]);
  if (s.S.hp <= 0) shipDownOrDie(s);
}

function shipDownOrDie(s) {
  s.S.hp = 0;
  const alliesStanding = Array.from(ships.values()).filter(o => o !== s && !o.dead && !o.downed);
  if (alliesStanding.length > 0) {
    s.downed = true;
    s.firing = false;
    s.reviveProgress = 0;
    s.reviveNear = false;
    if (s.revRing) s.revRing.visible = true;
    s.inv = 1.2;
    emit(s.pos.x, 0.7, s.pos.z, 0xffa500, 20, 6, 0.6);
    snd('hit');
    if (typeof rawBanner === 'function') rawBanner('ĐỒNG ĐỘI GỤC', 'Đến gần để cứu sống!');
    if (typeof q === 'function') q(['sdown', s.id]);
  } else {
    shipDie(s);
  }
}

function updRevive(dt) {
  for (const s of ships.values()) {
    if (s.dead || !s.downed) continue;
    let savior = null;
    for (const other of ships.values()) {
      if (other !== s && !other.dead && !other.downed) {
        const dx = other.pos.x - s.pos.x, dz = other.pos.z - s.pos.z;
        if (dx * dx + dz * dz < 3.2 * 3.2) {
          savior = other;
          break;
        }
      }
    }

    if (savior) {
      s.reviveNear = true;
      s.reviveProgress += dt / 2.5;
      s.revTick = (s.revTick || 0) + dt;
      if (s.revTick > 0.45) {
        s.revTick = 0;
        if (typeof sfx !== 'undefined' && sfx.reviveTick) sfx.reviveTick();
      }
      if (s.revRing) {
        s.revRing.scale.setScalar(1 + s.reviveProgress * 0.45);
        s.revRing.rotation.z += dt * 4;
      }
      if (s.reviveProgress >= 1) {
        s.downed = false;
        s.reviveProgress = 0;
        s.S.hp = Math.round(s.S.maxHp * 0.4);
        s.inv = 2.2;
        if (s.revRing) s.revRing.visible = false;
        if (typeof sfx !== 'undefined' && sfx.reviveDone) sfx.reviveDone();
        rawRing(s.pos.x, s.pos.z, 0x2fe0d0, 5, 0.4);
        emit(s.pos.x, 0.7, s.pos.z, 0x2fe0d0, 24, 8, 0.6);
        if (typeof rawBanner === 'function') rawBanner('HỒI SINH!', 'Đồng đội đã trở lại chiến trường');
        if (typeof q === 'function') q(['srev', s.id]);
      }
    } else {
      s.reviveNear = false;
      s.reviveProgress = Math.max(0, s.reviveProgress - dt * 0.35);
      if (s.revRing) {
        s.revRing.scale.setScalar(1);
        s.revRing.rotation.z += dt * 0.8;
      }
    }
  }

  const anyStanding = Array.from(ships.values()).some(s => !s.dead && !s.downed);
  if (!anyStanding && ships.size > 0 && state === 'play') {
    for (const s of ships.values()) if (s.downed) shipDie(s);
  }
}

function shipDie(s) {
  s.S.hp = 0; s.dead = true; s.g.visible = false; s.firing = false;
  if (s.revRing) s.revRing.visible = false;
  const p = s.pos;
  deathFx(p.x, 0.7, p.z, shipHex(s.slot), 3); snd('big'); G.shake = 1.2;
  if (s.local) {
    if (ships.size > 1) rawBanner('TÀU VỠ', 'Hồi sinh ở đợt sau');
  } else if (typeof q === 'function') {
    q(['dd', s.id]);
  }
  if (!aliveShips().length) { state = 'dying'; G.deadT = 1.8; G.slow = 1.4; G.shake = 1.5; }
}

function shoot(s, vis) {
  const S = s.S, n = S.multi, base = Math.atan2(s.aim.x, s.aim.z), step = n > 1 ? Math.min(0.15, 0.85 / (n - 1)) : 0;
  const px = s.pos.x, pz = s.pos.z, col = shipHex(s.slot);
  for (let i = 0; i < n; i++) {
    const a = base + (i - (n - 1) / 2) * step + rnd(-0.025, 0.025);
    const b = PB.get();
    b.m.position.set(px + Math.sin(a) * 0.9, 0.65, pz + Math.cos(a) * 0.9);
    b.v.set(Math.sin(a) * S.bspd, 0, Math.cos(a) * S.bspd); b.spd = S.bspd;
    b.life = 1.1; b.pierce = S.pierce; b.hit.clear(); b.r = 0.22 * S.bsize; b.owner = s.id; b.id = vis ? 0 : ++bSeq;
    const vs = Math.pow(S.bsize, 0.6);
    b.core.scale.set(vs * 0.8, vs * 0.8, vs * 2.6);
    b.m.rotation.y = a;
    b.gl.material.color.setHex(col);
    b.gl.scale.setScalar(1.05 * vs);
    b.core.material.color.copy(lighten(col, 0.3));
    if (!vis && typeof q === 'function') q(['pb', b.id, s.id, r2(b.m.position.x), r2(b.m.position.z), r2(b.v.x), r2(b.v.z), r2(S.bsize)]);
  }
  if (s.local) {
    rawEmit(px + s.aim.x * 1.1, 0.65, pz + s.aim.z * 1.1, 0xffd28a, 3, 3, 0.15, 0.2, 0.35);
    rawGlow(px + s.aim.x * 1.1, 0.65, pz + s.aim.z * 1.1, col, 1.4, 0.06);
    sfx.shoot();
  }
  s.recoil = 1;
}

function dash() {
  if (state !== 'play' || ovl || !me || me.dead || me.dashCool > 0 || me.dashT > 0) return;
  let dx = 0, dz = 0;
  const mv = typeof moveInput === 'function' ? moveInput() : { x: 0, z: 0 };
  if (mv.x || mv.z) { dx = mv.x; dz = mv.z; } else { dx = me.aim.x; dz = me.aim.z; }
  const l = Math.hypot(dx, dz) || 1;
  me.dashDir.set(dx / l, 0, dz / l); me.dashT = 0.18; me.dashCool = me.S.dashCd; me.dashId++;
  sfx.dash(); rawRing(me.pos.x, me.pos.z, 0x2fe0d0, 3, 0.3); caFx = Math.max(caFx, 0.5);
  rawEmit(me.pos.x, 0.6, me.pos.z, 0x9cf7ff, 14, 6, 0.4, 0.3, 0.4);
}

function gainXp(v) {
  G.xp += v;
  while (G.xp >= G.xpNext) {
    G.xp -= G.xpNext;
    G.level++;
    G.xpNext = Math.round(G.xpNext * 1.22 + 5);
    G.pendingLv++;
  }
  if (G.pendingLv > 0 && state === 'play') openLevel();
}

function chain(src, s) {
  const sp = src.m.position, list = [];
  for (const e of enemies) {
    if (e === src || e.dead || e.spawn > 0 || e.t.ghost) continue;
    const d = e.m.position.distanceToSquared(sp);
    if (d < 49) list.push([d, e]);
  }
  list.sort((a, b) => a[0] - b[0]);
  for (const [, e] of list.slice(0, 2)) {
    bolt(sp.clone(), e.m.position.clone());
    hitBy(e, s, s.S.dmg * 0.65, false);
  }
  if (list.length) snd('zap');
}

/* ---------- Chiêu Tất Sát Diện Rộng (Screen-wide AoE Ultimate Helpers) ---------- */
function playerBeam(s, x1, z1, x2, z2, w, dur, col, dmg) {
  rawBeam(x1, z1, x2, z2, w, 0, dur, col, 0);
  const dx = x2 - x1, dz = z2 - z1, l2 = dx * dx + dz * dz || 1;
  const distToLine = (px, pz) => {
    const t = clamp(((px - x1) * dx + (pz - z1) * dz) / l2, 0, 1);
    return Math.hypot(x1 + dx * t - px, z1 + dz * t - pz);
  };
  for (const e of enemies) {
    if (e.dead || e.spawn > 0) continue;
    if (distToLine(e.m.position.x, e.m.position.z) < w * 0.6 + e.r) {
      hitBy(e, s, dmg, true);
    }
  }
  for (const b of EB.items) {
    if (b.on && distToLine(b.m.position.x, b.m.position.z) < w * 0.7 + b.r) {
      EB.free(b);
    }
  }
}

function playerShockwave(s, x, z, maxR, dmg, col) {
  rawShock(x, z, 28, maxR, col);
  rawRing(x, z, col, maxR, 0.65);
  for (const e of enemies) {
    if (e.dead || e.spawn > 0) continue;
    const dx = e.m.position.x - x, dz = e.m.position.z - z;
    const d = Math.hypot(dx, dz);
    if (d < maxR) {
      const k = 1 - d / (maxR + 4);
      hitBy(e, s, dmg * k, true);
      if (!e.t.heavy && d > 0.1) {
        e.kx += (dx / d) * 14 * k;
        e.kz += (dz / d) * 14 * k;
      }
    }
  }
  for (const b of EB.items) {
    if (b.on && Math.hypot(b.m.position.x - x, b.m.position.z - z) < maxR) {
      EB.free(b);
    }
  }
}

function spawnFeatherBarrage(s, count, spread, spd, col, pierce = 4, bsize = 1.6, baseAngle = null) {
  if (!s || s.dead) return;
  const base = baseAngle !== null ? baseAngle : Math.atan2(s.aim.x, s.aim.z);
  const px = s.pos.x, pz = s.pos.z;
  const rx = Math.cos(base), rz = -Math.sin(base); // Vector vuông góc sang ngang cánh

  for (let i = 0; i < count; i++) {
    const frac = count > 1 ? (i / (count - 1) - 0.5) : 0;
    const a = base + frac * spread;
    const wingOffset = frac * 2.2;
    const b = PB.get();
    b.m.position.set(
      px + rx * wingOffset + Math.sin(a) * 0.8,
      0.68,
      pz + rz * wingOffset + Math.cos(a) * 0.8
    );
    b.v.set(Math.sin(a) * spd, 0, Math.cos(a) * spd);
    b.spd = spd;
    b.life = 1.45;
    b.pierce = pierce;
    b.hit.clear();
    b.r = 0.26 * bsize;
    b.owner = s.id;
    b.id = ++bSeq;

    const vs = Math.pow(bsize, 0.65);
    b.core.scale.set(vs * 1.1, vs * 0.9, vs * 3.2);
    b.m.rotation.y = a;
    b.gl.material.color.setHex(col);
    b.gl.scale.setScalar(1.25 * vs);
    b.core.material.color.copy(lighten(col, 0.45));
  }
}

// Aliases tương thích
function beam(x1, z1, x2, z2, w, dur, dmg, col = 0x2fe0d0) {
  playerBeam(me || { S: { dmg: 10, boom: 0 }, boostT: 0 }, x1, z1, x2, z2, w, dur, col, dmg);
}
function shockwave(x, z, r, maxR, dmg, col = 0xff7a1f) {
  playerShockwave(me || { S: { dmg: 10, boom: 0 }, boostT: 0 }, x, z, maxR || r, dmg, col);
}
