/* ==========================================================================
   ReChoice - js/main.js
   Vòng lặp Trò chơi Chính (Game Loop), Cập nhật Vật lý & Điều phối Hệ thống
   ========================================================================== */
'use strict';

let G = null;
const clock = new THREE.Clock();

function clearWorld() {
  for (const e of enemies) disposeEnemy(e);
  enemies.length = 0;
  for (const e of netEn.values()) disposeEnemy(e);
  netEn.clear();

  PB.clear(); EB.clear(); GM.clear(); RG.clear(); DB.clear();
  if (typeof PK !== 'undefined') PK.clear();
  pendingBoom.length = 0; netPB.clear(); netEB.clear();

  for (const b of bolts) { scene.remove(b.l); b.l.geometry.dispose(); b.l.material.dispose(); }
  bolts.length = 0;
  for (const b of beams) { scene.remove(b.m); b.m.material.dispose(); }
  beams.length = 0;
  shocks.length = 0;
  for (const k of marks) { scene.remove(k.m); k.m.material.dispose(); }
  marks.length = 0;
  for (let k = 0; k < PMAX; k++) pLife[k] = 0;

  fxq = [];
  RA = R;
}

function menuShip() {
  clearWorld();
  clearShips();
  NET.myId = 'me';
  const s = addShip('me', '', 0, true);
  s.pos.set(0, 0, 0);
}

function newRun(list) {
  clearWorld();
  clearShips();
  for (const [id, name, slot] of list) {
    const s = addShip(id, name, slot, id === NET.myId);
    const [x, z] = spawnPoint(slot, list.length);
    s.pos.set(x, 0, z); s.tx = x; s.tz = z; s.lx = x; s.lz = z; s.inv = 1.2;
  }
  if (engine && engine.cameraCtrl && me) engine.cameraCtrl.setTarget(me);
  G = {
    wave: 0, toSpawn: 0, spawnT: 0, spawnEvery: 1, breakT: 0, bossPending: 0, bossQueue: -1,
    score: 0, kills: 0, shake: 0, slow: 0, boss: null, bossR: 0, bossMax: 1, bossKind: -1,
    bossInfo: '', bossInv: 0, fight: null, combo: 0, comboT: 0, vacuum: false, deadT: 0, time: 0,
    level: 1, xp: 0, xpNext: 8, pendingLv: 0, lvlT: 0, practice: false, wins: 0, twinAng: 0, shrink: false
  };

  if (isHost()) {
    let w = 1;
    if (PRACTICE > 1) {
      G.practice = true; w = PRACTICE;
      const picks = Math.floor(PRACTICE * 0.6);
      for (const s of ships.values()) for (let i = 0; i < picks; i++) {
        const o = makeOffer(s); const id = o[Math.floor(Math.random() * o.length)];
        s.upg[id] = (s.upg[id] || 0) + 1; UMAP[id].f(s.S, s);
      }
      for (const s of ships.values()) { s.S.hp = s.S.maxHp; syncStats(s); }
      G.level = 1 + picks;
    }
    startWave(w);
    if (G.practice) setTimeout(() => rawToast('CHẾ ĐỘ LUYỆN TẬP · KHÔNG GHI ĐIỂM'), 2400);
  }
  chips();
}

function lerpAngle(a, b, k) {
  let d = b - a;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return a + d * k;
}

function easeBack(t) {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}

function controlLocal(dt) {
  const s = me;
  if (!s || s.dead || s.downed) return;
  const pp = s.pos, S = s.S;
  const mv = ovl ? { x: 0, z: 0 } : moveInput();
  const slow = slowAt(pp.x, pp.z);

  if (s.dashT > 0) {
    s.dashT -= dt; s.vx = s.dashDir.x * 38; s.vz = s.dashDir.z * 38;
  } else {
    const k = Math.min(1, dt * 12);
    s.vx += (mv.x * S.speed * slow - s.vx) * k;
    s.vz += (mv.z * S.speed * slow - s.vz) * k;
  }

  const pl0 = pullAt(pp.x, pp.z);
  pp.x += (s.vx + pl0.x) * dt;
  pp.z += (s.vz + pl0.z) * dt;
  const pl = Math.hypot(pp.x, pp.z);
  if (pl > RA - 0.8) { pp.x *= (RA - 0.8) / pl; pp.z *= (RA - 0.8) / pl; }

  let firing = (autoFire || mouse.down) && !ovl;
  if (isTouch) {
    const t = sticks.R;
    if (t.id !== null && Math.hypot(t.x, t.y) > 0.2) {
      s.aim.set(t.x, 0, t.y).normalize(); firing = !ovl;
    } else if (mv.x || mv.z) {
      s.aim.set(mv.x, 0, mv.z).normalize(); firing = false;
    }
    reticle.position.set(pp.x + s.aim.x * 6, 0.05, pp.z + s.aim.z * 6);
  } else {
    ndc.set(mouse.x / innerWidth * 2 - 1, -(mouse.y / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    if (ray.ray.intersectPlane(aimPlane, aimPt)) {
      tmp.set(aimPt.x - pp.x, 0, aimPt.z - pp.z);
      if (tmp.lengthSq() > 0.04) s.aim.copy(tmp.normalize());
      reticle.position.set(aimPt.x, 0.05, aimPt.z);
    }
  }

  const target = Math.atan2(-s.aim.x, -s.aim.z);
  let dr = target - s.g.rotation.y;
  dr = Math.atan2(Math.sin(dr), Math.cos(dr));
  s.g.rotation.y += dr * Math.min(1, dt * 20);
  s.g.rotation.z = -s.vx * 0.014 * Math.cos(s.g.rotation.y) + s.vz * 0.014 * Math.sin(s.g.rotation.y);
  s.firing = firing;
  s.dashCool -= dt;

  if (NET.mode === 'guest') {
    s.fireCd -= dt * slow;
    if (firing && s.fireCd <= 0) { s.fireCd = 1 / S.rate; s.shoot(true); }
  }
}

function update(dt) {
  G.time += dt;

  /* Đợt & Boss Spawning */
  if (state === 'play') {
    if (G.breakT > 0) {
      G.breakT -= dt;
      if (G.breakT <= 0) startWave(G.wave + 1);
    } else {
      if (G.bossPending > 0) {
        G.bossPending -= dt;
        if (G.bossPending <= 0) {
          if (G.bossQueue >= 0) startFight(G.bossQueue);
          else {
            const [x, z] = edgePos();
            const b = spawnEnemy('boss', x * 0.7, z * 0.7, 1.2);
            G.fight = { kind: -1, main: b }; G.boss = b; G.bossKind = -1; G.bossMax = b.max;
          }
          G.shake = 1;
        }
      }
      if (G.toSpawn > 0) {
        G.spawnT -= dt;
        if (G.spawnT <= 0) {
          G.spawnT = G.spawnEvery * rnd(0.6, 1.4);
          const grp = Math.min(G.toSpawn, 1 + Math.floor(Math.random() * Math.min(5, 1 + G.wave / 3)));
          const [, , a] = edgePos();
          const type = pickType();
          for (let i = 0; i < grp; i++) {
            const aa = a + (i - (grp - 1) / 2) * 0.12;
            spawnEnemy(type, Math.cos(aa) * (RA - 1.5), Math.sin(aa) * (RA - 1.5));
          }
          G.toSpawn -= grp;
        }
      } else if (enemies.length === 0 && G.bossPending <= 0) {
        G.breakT = 2.8; G.vacuum = true;
        for (const s of ships.values()) if (!s.dead) s.S.hp = Math.min(s.S.maxHp, s.S.hp + 10);
        banner('ĐỢT ' + G.wave + ' SẠCH', '+10 giáp · chuẩn bị đợt ' + (G.wave + 1)); snd('lvl');
      }
    }
  }

  if (G.fight && !enemies.some(e => !e.dead && e.t.boss)) endFight();
  RA += ((G.shrink ? 17 : R) - RA) * Math.min(1, dt * 0.25);

  /* Cập nhật các tàu */
  if (state === 'play' && me && !me.dead && !me.downed) controlLocal(dt);
  for (const s of ships.values()) {
    if (!s.local) {
      s.dashT -= dt;
      if (!s.dead) {
        const k = Math.min(1, dt * 14);
        s.pos.x += (s.tx - s.pos.x) * k; s.pos.z += (s.tz - s.pos.z) * k;
        const pl = Math.hypot(s.pos.x, s.pos.z);
        if (pl > RA - 0.8) { s.pos.x *= (RA - 0.8) / pl; s.pos.z *= (RA - 0.8) / pl; }
        s.g.rotation.y = lerpAngle(s.g.rotation.y, s.tRy, k); s.g.rotation.z += (s.tRz - s.g.rotation.z) * k;
      }
    }
    if (s.dead || s.downed) continue;
    s.inv -= dt;
    if (s.boostT > 0) s.boostT -= dt;
    if (s.S.regen) s.S.hp = Math.min(s.S.maxHp, s.S.hp + s.S.regen * dt);

    // Xử lý hiệu ứng & cơ chế Chiêu Tất Sát Diện Rộng độc quyền
    if (s.ultActive > 0) {
      s.ultActive -= dt;
      s.ultTimer = (s.ultTimer || 0) - dt;
      if (s.ultTimer <= 0) {
        s.ultTimer = 0.24;
        const baseAng = Math.atan2(s.aim.x, s.aim.z);
        const rx = Math.cos(baseAng), rz = -Math.sin(baseAng);
        if (s.local) rawEmit(s.pos.x + rnd(-0.8, 0.8), 0.7, s.pos.z + rnd(-0.8, 0.8), s.colorHex, 3, 3, 0.3);

        if (s.shipClass === 'striker') {
          // Bão Tố Lôi Đình: 2 cột Lôi Quang song song + Sóng đạn lông vũ điện từ
          for (const sOff of [-0.52, 0.52]) {
            const sx = s.pos.x + rx * sOff, sz = s.pos.z + rz * sOff;
            playerBeam(s, sx, sz, sx + s.aim.x * 34, sz + s.aim.z * 34, 0.95, 0.22, s.colorHex, 95);
          }
          spawnFeatherBarrage(s, 8, 1.2 + Math.sin(tAll * 10) * 0.3, 33, s.colorHex, 4, 1.45, baseAng);
        } else if (s.shipClass === 'colossus') {
          // Tận Thế Nhiệt Hạch: Sóng xung kích diện rộng + Bão đạn pháo 360 độ
          playerShockwave(s, s.pos.x, s.pos.z, 19, 135, 0xff5522);
          spawnFeatherBarrage(s, 10, TAU * 0.9, 25, 0xff6622, 3, 1.85, tAll * 2.5);
        } else if (s.shipClass === 'phantom') {
          // Băng Phong Tuyệt Kỹ: 2 cột Laser Băng Tuyết + Dải đạn lông vũ pha lê uốn lượn
          G.slow = Math.max(G.slow, 2.5);
          for (const sOff of [-0.5, 0.5]) {
            const sx = s.pos.x + rx * sOff, sz = s.pos.z + rz * sOff;
            playerBeam(s, sx, sz, sx + s.aim.x * 36, sz + s.aim.z * 36, 1.1, 0.22, 0xb88cff, 110);
          }
          const waveAng = baseAng + Math.sin(tAll * 9) * 0.38;
          spawnFeatherBarrage(s, 10, 1.45, 35, 0x55f0ff, 5, 1.55, waveAng);
        } else if (s.shipClass === 'dronemaster') {
          // Ma Trận Hủy Diệt: 4 Cột Laser Vệ Tinh xoay tròn 360 độ + Xoáy đạn lượng tử
          for (let i = 0; i < 4; i++) {
            const ang = tAll * 2.6 + (i / 4) * TAU;
            const ex = s.pos.x + Math.cos(ang) * 26;
            const ez = s.pos.z + Math.sin(ang) * 26;
            playerBeam(s, s.pos.x, s.pos.z, ex, ez, 0.85, 0.22, 0x2fe0d0, 115);
          }
          spawnFeatherBarrage(s, 6, TAU * 0.84, 28, 0x2fe0d0, 4, 1.4, tAll * 4);
        }
      }
    }

    s.fireCd -= dt * slowAt(s.pos.x, s.pos.z);
    if (state === 'play' && s.firing && s.fireCd <= 0) { s.fireCd = 1 / s.S.rate; shoot(s, false); }
  }
  if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }
  if (typeof updRevive === 'function') updRevive(dt);
  if (typeof updPickups === 'function') updPickups(dt);

  /* Đạn người chơi */
  for (const b of PB.items) {
    if (!b.on) continue;
    const pv = pullAt(b.m.position.x, b.m.position.z);
    if (pv.x || pv.z) {
      b.v.x += pv.x * dt * 3; b.v.z += pv.z * dt * 3;
      const l = Math.hypot(b.v.x, b.v.z) || 1;
      b.v.x *= b.spd / l; b.v.z *= b.spd / l;
      b.m.rotation.y = Math.atan2(b.v.x, b.v.z);
    }
    b.life -= dt; b.m.position.addScaledVector(b.v, dt);
    if (b.life <= 0 || Math.hypot(b.m.position.x, b.m.position.z) > RA + 5) { PB.free(b); continue; }
    const owner = ships.get(b.owner); if (!owner) { PB.free(b); continue; }
    const S = owner.S;

    for (const e of enemies) {
      if (e.dead || e.spawn > 0 || b.hit.has(e) || e.t.ghost) continue;
      const dx = e.m.position.x - b.m.position.x, dz = e.m.position.z - b.m.position.z, rr = e.r + b.r;
      if (dx * dx + dz * dz < rr * rr) {
        b.hit.add(e);
        if ((e.type === 'twinA' || e.type === 'twinB') && !e.inv) {
          const fx = Math.sin(e.face), fz = Math.cos(e.face);
          if (-dx * fx - dz * fz > 0) {
            PB.free(b); q(['pf', b.id]); const bp = b.m.position;
            fireE(bp.x, bp.z, Math.atan2(owner.pos.x - bp.x, owner.pos.z - bp.z), 15, 0.9);
            rawBlockFx(bp.x, 1.2, bp.z); q(['bl', r2(bp.x), 1.2, r2(bp.z)]); break;
          }
        }
        if (e.inv) { hitBy(e, owner, 0, false); PB.free(b); q(['pf', b.id]); break; }
        const crit = Math.random() < S.crit;
        if (!e.t.heavy) { const kb = e.type === 'tank' ? 1 : 3.5; e.kx += b.v.x / S.bspd * kb; e.kz += b.v.z / S.bspd * kb; }
        hitBy(e, owner, S.dmg * (crit ? 2.5 : 1), crit);
        if ((S.chain > 0 && Math.random() < S.chain) || (owner.ultActive > 0 && owner.shipClass === 'striker')) chain(e, owner);
        if (b.pierce-- <= 0) { PB.free(b); q(['pf', b.id]); break; }
      }
    }
  }

  /* Đạn kẻ địch */
  for (const b of EB.items) {
    if (!b.on) continue;
    b.life -= dt; b.m.position.addScaledVector(b.v, dt);
    const p = b.m.position;
    if (b.life <= 0 || Math.hypot(p.x, p.z) > RA + 4) { EB.free(b); continue; }
    if (state !== 'play') continue;
    for (const s of ships.values()) {
      if (s.dead) continue;
      const dx = p.x - s.pos.x, dz = p.z - s.pos.z, rr = 0.45 + b.r;
      if (dx * dx + dz * dz < rr * rr) {
        if (s.inv > 0 || s.dashT > 0) continue;
        EB.free(b); q(['ef', b.id]); hurt(s, 12 + G.wave * 0.8); break;
      }
    }
  }

  /* Laser Beams */
  for (const bm of beams) {
    if (!bm.dmg || bm.t < bm.warn || bm.t > bm.warn + bm.fire) continue;
    for (const s of ships.values()) {
      if (s.dead || bm.hit.has(s.id)) continue;
      if (segDist(s.pos.x, s.pos.z, bm.x1, bm.z1, bm.x2, bm.z2) < bm.w * 0.5 + 0.45 && s.dashT <= 0 && s.inv <= 0) {
        bm.hit.add(s.id); hurt(s, bm.dmg);
      }
    }
  }

  /* Sóng chấn động */
  for (let i = shocks.length - 1; i >= 0; i--) {
    const w = shocks[i]; w.r += w.spd * dt;
    if (w.r > w.maxR) { shocks.splice(i, 1); continue; }
    for (const s of ships.values()) {
      if (s.dead || w.hit.has(s.id)) continue;
      const d = Math.hypot(s.pos.x - w.x, s.pos.z - w.z);
      if (Math.abs(d - w.r) < 0.9 && s.dashT <= 0) { w.hit.add(s.id); hurt(s, w.dmg); }
    }
  }

  /* Kẻ địch */
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i]; if (e.dead) continue;
    const m = e.m;
    if (e.spawn > 0) {
      e.spawn -= dt; const s = 1 - Math.max(e.spawn, 0) / (e.spawn0 || 0.45);
      m.scale.setScalar(Math.max(0.01, easeBack(Math.min(1, s))) * e.size);
      m.rotation.y += dt * 6; continue;
    }
    m.scale.setScalar(e.size);
    const tgt = nearestShip(m.position.x, m.position.z);
    const tx = tgt ? tgt.pos.x : 0, tz = tgt ? tgt.pos.z : 0;
    const dx = tx - m.position.x, dz = tz - m.position.z, d = Math.hypot(dx, dz) || 1;
    let ax = dx / d, az = dz / d, spd = e.spd, custom = false;

    if (e.ai) {
      const r = e.ai(e, dt, tgt, dx, dz, d);
      if (r === false) custom = true; else { ax = r[0]; az = r[1]; spd = r[2]; }
    } else if (e.type === 'shooter') {
      const rg = e.t.range;
      if (d < rg * 0.55) { ax = -ax; az = -az; }
      else if (d < rg) { const sx = -az * e.dir, sz = ax * e.dir; ax = sx; az = sz; spd *= 0.7; }
      e.cd -= dt;
      if (tgt && e.cd <= 0 && d < rg + 4 && state === 'play') {
        e.cd = e.t.fire * rnd(0.8, 1.2); fireE(m.position.x, m.position.z, Math.atan2(dx, dz), 11);
        e.flash = 0.12; snd('enemyShot');
      }
    } else if (e.type === 'boss') {
      const r = bossAI(e, dt, dx, dz, d); ax = r[0]; az = r[1]; spd = r[2];
    }
    if (e.dead) continue;

    if (!custom) {
      if (!e.t.heavy || e.type === 'golem' || e.type === 'boss') for (let j = i + 1; j < enemies.length; j++) {
        const o = enemies[j]; if (o.dead || o.t.ghost || (o.t.heavy && o.type !== 'golem' && o.type !== 'boss')) continue;
        const sx = o.m.position.x - m.position.x, sz = o.m.position.z - m.position.z, rr = (e.r + o.r) * 0.95, d2 = sx * sx + sz * sz;
        if (d2 < rr * rr && d2 > 1e-4) {
          const dd = Math.sqrt(d2), push = (rr - dd) * 0.5 / dd;
          const we = e.type === 'boss' ? 0.1 : 1, wo = o.type === 'boss' ? 0.1 : 1;
          m.position.x -= sx * push * we; m.position.z -= sz * push * we;
          o.m.position.x += sx * push * wo; o.m.position.z += sz * push * wo;
        }
      }
      const k = Math.min(1, dt * 5);
      e.vx += (ax * spd - e.vx) * k; e.vz += (az * spd - e.vz) * k;
      m.position.x += (e.vx + e.kx) * dt; m.position.z += (e.vz + e.kz) * dt;
      const kd = Math.pow(0.02, dt); e.kx *= kd; e.kz *= kd;
      const el = Math.hypot(m.position.x, m.position.z);
      if (el > RA - 0.5) { m.position.x *= (RA - 0.5) / el; m.position.z *= (RA - 0.5) / el; }
      e.ph += dt;
      if (!e.ai) {
        m.position.y = e.t.y + Math.sin(e.ph * 3) * 0.15;
        if (e.t.face) {
          const want = (e.type === 'shooter' && tgt) ? Math.atan2(dx, dz) : Math.atan2(e.vx, e.vz);
          m.rotation.y = lerpAngle(m.rotation.y, want, Math.min(1, dt * 8));
          m.rotation.z = Math.sin(e.ph * 6) * 0.12;
        } else {
          m.rotation.y += dt * (e.type === 'tank' ? 0.8 : 2.2);
          m.rotation.x += dt * (e.type === 'boss' ? 0.4 : 1.1);
        }
      }
    }
    e.flash -= dt; e.flashV = e.flash > 0 ? 1 : 0;

    if (e.t.ghost) continue;
    for (const s of ships.values()) {
      if (s.dead || e.dead) continue;
      const sx = s.pos.x - m.position.x, sz = s.pos.z - m.position.z, sd = Math.hypot(sx, sz) || 1;
      const airborne = e.type === 'golem' && e.st === 1;
      if (state === 'play' && sd < e.r + 0.55 && s.dashT <= 0 && !airborne && e.t.dmg > 0) {
        if (e.type === 'thief') thiefTouch(e, s);
        hurt(s, enemyDmg(e.t.dmg));
        if (!e.t.heavy) { e.kx -= sx / sd * 10; e.kz -= sz / sd * 10; }
      }
      if (s.dashT > 0 && s.upg.dash && sd < e.r + 1 && e.dashHit[s.id] !== s.dashId) {
        e.dashHit[s.id] = s.dashId; hitBy(e, s, s.S.dmg * 3, true);
      }
      if (s.blades.length && e.orbitCd <= 0 && !e.dead) {
        for (const b of s.blades) {
          const bx = b.position.x - m.position.x, bz = b.position.z - m.position.z;
          if (bx * bx + bz * bz < (e.r + 0.6) * (e.r + 0.6)) {
            hitBy(e, s, s.S.dmg * 0.9, false); e.orbitCd = 0.3;
            if (!e.t.heavy) { e.kx -= ax * 5; e.kz -= az * 5; }
            break;
          }
        }
      }
    }
    e.orbitCd -= dt;
  }

  /* Nổ dây chuyền */
  const booms = pendingBoom.splice(0, 30);
  for (const bm of booms) {
    ring(bm.x, bm.z, 0xff9a3d, bm.r, 0.35);
    emit(bm.x, 0.5, bm.z, 0xff9a3d, 14, bm.r * 3, 0.45);
    for (const e of enemies) {
      if (e.dead || e.spawn > 0 || e.t.ghost) continue;
      const dx = e.m.position.x - bm.x, dz = e.m.position.z - bm.z;
      if (dx * dx + dz * dz < (bm.r + e.r) * (bm.r + e.r)) {
        e.lastBoom = bm.boom; e.lastDmg = bm.src; damage(e, bm.dmg, false);
      }
    }
  }

  /* Dọn quái chết */
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e.dead) { disposeEnemy(e); enemies.splice(i, 1); }
  }

  /* Thanh máu Boss */
  if (G.fight) {
    let hp = 0; let inv = false;
    for (const e of enemies) {
      if (e.dead) continue;
      if (e.t.boss || e.t.bar) { hp += Math.max(0, e.hp); if (e.t.boss && e.inv) inv = true; }
    }
    G.bossR = clamp(hp / G.bossMax, 0, 1); G.bossInv = inv;
    if (G.fight.kind === -1) G.bossInfo = '';
  } else {
    G.bossR = 0; G.bossInv = false;
  }

  /* Tinh thể EXP bay */
  const thief = enemies.find(e => !e.dead && e.type === 'thief' && e.spawn <= 0);
  const hole = enemies.find(e => !e.dead && e.type === 'hole' && e.st === 0 && e.spawn <= 0);
  for (const g of GM.items) {
    if (!g.on) continue;
    g.t += dt;
    const p = g.m.position, s = nearestShip(p.x, p.z);
    let thf = null;
    for (const sink of [thief, hole]) {
      if (!sink) continue;
      const qd = Math.hypot(sink.m.position.x - p.x, sink.m.position.z - p.z);
      if (qd < (sink === hole ? 9 : 12) && (!s || qd < Math.hypot(s.pos.x - p.x, s.pos.z - p.z))) { thf = sink; break; }
    }
    if (thf) {
      const dx = thf.m.position.x - p.x, dz = thf.m.position.z - p.z, d = Math.hypot(dx, dz) || 1;
      g.v.x += (dx / d * 16 - g.v.x) * Math.min(1, dt * 6);
      g.v.z += (dz / d * 16 - g.v.z) * Math.min(1, dt * 6);
      p.x += g.v.x * dt; p.z += g.v.z * dt; g.m.rotation.y += dt * 3;
      if (d < thf.r) {
        GM.free(g); emit(p.x, 0.6, p.z, thf.t.col, 4, 3, 0.3);
        if (thf === thief) { thief.xpStore += g.val; thief.grow += 0.015; thief.hp = Math.min(thief.max, thief.hp + thief.max * 0.004); }
        else { hole.hp = Math.min(hole.max, hole.hp + hole.max * 0.012); }
      }
      continue;
    }
    if (!s) {
      const f = Math.pow(0.05, dt); g.v.x *= f; g.v.z *= f; p.x += g.v.x * dt; p.z += g.v.z * dt; continue;
    }
    const dx = s.pos.x - p.x, dz = s.pos.z - p.z, d = Math.hypot(dx, dz) || 1;
    if (state === 'play' && (d < s.S.magnet || G.vacuum)) {
      const sp = Math.max(10, 28 - d) * (G.vacuum ? 1.6 : 1);
      g.v.x += (dx / d * sp - g.v.x) * Math.min(1, dt * 8); g.v.z += (dz / d * sp - g.v.z) * Math.min(1, dt * 8);
    } else {
      const f = Math.pow(0.05, dt); g.v.x *= f; g.v.z *= f;
    }
    p.x += g.v.x * dt; p.z += g.v.z * dt;
    p.y = 0.45 + Math.sin(g.t * 4) * 0.12; g.m.rotation.y += dt * 3;
    if (state === 'play' && d < 0.9) {
      GM.free(g); gainXp(g.val); snd('pick'); emit(p.x, p.y, p.z, 0x6dffd6, 3, 2.5, 0.25);
    }
  }
}

function guestUpdate(dt) {
  G.time += dt;
  if (state === 'play' && me && !me.dead && !me.downed) controlLocal(dt);
  const k = Math.min(1, dt * 14);
  for (const s of ships.values()) {
    if (s.local || s.dead || s.downed) continue;
    s.pos.x += (s.tx - s.pos.x) * k; s.pos.z += (s.tz - s.pos.z) * k;
    s.g.rotation.y = lerpAngle(s.g.rotation.y, s.tRy, k); s.g.rotation.z += (s.tRz - s.g.rotation.z) * k;
    if (s.boostT > 0) s.boostT -= dt;
  }
  if (typeof updRevive === 'function') updRevive(dt);
  if (typeof updPickups === 'function') updPickups(dt);
  for (const b of PB.items) {
    if (!b.on) continue;
    const pv = pullAt(b.m.position.x, b.m.position.z);
    if (pv.x || pv.z) {
      b.v.x += pv.x * dt * 3; b.v.z += pv.z * dt * 3;
      const l = Math.hypot(b.v.x, b.v.z) || 1; b.v.x *= b.spd / l; b.v.z *= b.spd / l;
    }
    b.life -= dt; b.m.position.addScaledVector(b.v, dt);
    if (b.life <= 0) { PB.free(b); if (b.id) netPB.delete(b.id); continue; }
    if (b.id) continue;
    for (const e of netEn.values()) {
      if (b.hit.has(e) || e.m.scale.x < 0.3 || e.t.ghost) continue;
      const dx = e.m.position.x - b.m.position.x, dz = e.m.position.z - b.m.position.z, rr = e.t.r * Math.max(0.5, e.m.scale.x) + b.r;
      if (dx * dx + dz * dz < rr * rr) {
        b.hit.add(e); if (e.inv || b.pierce-- <= 0) { PB.free(b); break; }
      }
    }
  }
  for (const b of EB.items) {
    if (!b.on) continue;
    b.life -= dt; b.m.position.addScaledVector(b.v, dt);
    if (b.life <= 0) { EB.free(b); netEB.delete(b.id); }
  }
  for (const e of netEn.values()) {
    if (e.tx === undefined) continue;
    e.m.position.x += (e.tx - e.m.position.x) * k; e.m.position.y += (e.ty - e.m.position.y) * k; e.m.position.z += (e.tz - e.m.position.z) * k;
    e.m.rotation.y = lerpAngle(e.m.rotation.y, e.tRy, k); e.m.rotation.x = lerpAngle(e.m.rotation.x, e.tRx, k);
  }
  for (const g of GM.items) {
    if (!g.on) continue;
    g.t += dt; g.m.position.y = 0.45 + Math.sin(g.t * 4) * 0.12; g.m.rotation.y += dt * 3;
  }
}

/* ---------- Khởi chạy Trò chơi (Bootstrap Game Engine) ---------- */
let engine = null;

function initGame() {
  resize();
  menuShip();
  showBest();
  loadKing();

  engine = new GameEngine();
  engine.init();
}

initGame();
