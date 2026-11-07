/* ==========================================================================
   ReChoice - js/ui/hud.js
   Giao diện Trận đấu (HUD): Máu, Kinh nghiệm, Thanh Boss, Combo & Tên đồng đội
   ========================================================================== */
'use strict';

const camPos = new V3(0, 30, 24);
let hudT = 0, lastBossR = -1;

function hud() {
  if (!me || !G) return;
  const sc = Math.floor(G.score).toLocaleString('vi-VN');
  if ($('score').textContent !== sc) $('score').textContent = sc;
  $('wave').textContent = G.wave;
  $('lv').textContent = G.level;
  $('hpFill').style.width = Math.max(0, me.S.hp / me.S.maxHp * 100) + '%';
  $('hpTxt').textContent = Math.max(0, Math.ceil(me.S.hp)) + ' / ' + me.S.maxHp;
  $('xpFill').style.width = Math.min(100, G.xp / G.xpNext * 100) + '%';
  $('dashFill').style.width = (1 - Math.max(0, me.dashCool) / me.S.dashCd) * 100 + '%';

  /* Thanh Năng lượng Chiêu cuối (Ultimate Bar) */
  const ultBar = $('ultFill');
  const ultBtn = $('ultBtn');
  const ultTxt = $('ultTxt');
  if (ultBar) {
    if (me.ultActive > 0) {
      const activePct = Math.min(100, (me.ultActive / (me.ultDuration || 6)) * 100);
      ultBar.style.width = activePct + '%';
      if (ultBar.parentElement) ultBar.parentElement.classList.add('ready');
      if (ultBtn) {
        ultBtn.classList.add('ready');
        ultBtn.textContent = `${me.ultActive.toFixed(1)}s`;
      }
      const cls = (typeof SHIP_CLASSES !== 'undefined' && SHIP_CLASSES[me.shipClass]) || {};
      const uName = cls.ultName || 'OVERDRIVE';
      if (ultTxt) ultTxt.textContent = `🔥 ${uName}: ${me.ultActive.toFixed(1)}s`;
    } else {
      const pct = Math.min(100, (me.ult / me.maxUlt) * 100);
      ultBar.style.width = pct + '%';
      const onCd = me.ultCooldown > 0;
      const isReady = !onCd && me.ult >= me.maxUlt;
      if (ultBar.parentElement) ultBar.parentElement.classList.toggle('ready', isReady);
      if (ultBtn) {
        ultBtn.classList.toggle('ready', isReady);
        ultBtn.textContent = onCd ? `${Math.ceil(me.ultCooldown)}s` : (isReady ? 'ULTI' : `${Math.floor(pct)}%`);
      }
      if (ultTxt) {
        ultTxt.textContent = onCd ? `HỒI CHIÊU: ${me.ultCooldown.toFixed(1)}s` : (isReady ? 'ULTI SẴN SÀNG [Q/E]' : `ULT ${Math.floor(pct)}%`);
      }
    }
  }

  /* Badge Hiệu ứng Siêu nạp (Overcharge x2 Dmg) */
  const buffBadge = $('buffBadge');
  if (buffBadge) {
    if (me.boostT > 0) {
      buffBadge.hidden = false;
      buffBadge.textContent = `⚡ X2 DMG · ${me.boostT.toFixed(1)}s`;
    } else {
      buffBadge.hidden = true;
    }
  }

  /* Trạng thái Gục ngã / Cứu hộ */
  const revStatus = $('revStatus');
  if (revStatus) {
    if (me.downed) {
      revStatus.hidden = false;
      revStatus.textContent = me.reviveNear
        ? `ĐANG ĐƯỢC CỨU HỘ: ${Math.floor(me.reviveProgress * 100)}%`
        : 'GỤC NGÃ · CHỜ ĐỒNG ĐỘI ĐẾN CỨU!';
    } else {
      revStatus.hidden = true;
    }
  }

  const c = $('combo');
  if (G.combo >= 5) {
    c.hidden = false;
    c.textContent = `COMBO ${G.combo} · x${Math.min(4, 1 + Math.floor(G.combo / 10) * 0.5).toFixed(1)}`;
    c.classList.toggle('hot', G.combo >= 20);
  } else {
    c.hidden = true;
  }

  if (G.bossR > 0) {
    $('boss').hidden = false;
    $('boss').classList.toggle('inv', !!G.bossInv);
    $('bossName').textContent = G.bossKind >= 0 ? BOSSES[G.bossKind].name : 'LÕI HƯ KHÔNG';
    $('bossInfo').textContent = G.bossInfo || '';
    const w = G.bossR * 100 + '%';
    $('bossFill').style.width = w;
    $('bossGhost').style.width = w;
    lastBossR = G.bossR;
  } else {
    $('boss').hidden = true;
    lastBossR = -1;
  }
}

const tagV = new V3();
function shipsVisual(rdt, live) {
  const t = G ? G.time : tAll;
  for (const s of ships.values()) {
    const sp = rdt > 0 ? Math.hypot(s.pos.x - s.lx, s.pos.z - s.lz) / rdt : 0;
    s.lx = s.pos.x; s.lz = s.pos.z;
    const show = !s.dead && (live || state === 'menu' || state === 'lobby');
    if (live && !s.dead && rdt > 0) {
      if (sp > 20) rawEmit(s.pos.x, 0.6, s.pos.z, 0x9cf7ff, 3, 1.5, 0.3, 0.2, 0.4, 0);
    }
    const prot = NET.mode === 'guest' ? (s.netInv || (s.local && s.dashT > 0)) : (s.inv > 0 || s.dashT > 0);
    s.shield.visible = !s.dead && live && prot;
    if (s.shield.visible) {
      s.shield.material.uniforms.uO.value = 0.7 + 0.3 * Math.sin(tAll * 20);
      s.shield.rotation.y += rdt * 2;
    }
    s.recoil = Math.max(0, (s.recoil || 0) - rdt * 12);
    s.hull.position.z = s.recoil * 0.12;
    if (s.downed) {
      s.hull.position.y = 0.28;
      s.g.rotation.z = Math.PI / 3;
      if (Math.random() < 0.25) rawEmit(s.pos.x, 0.4, s.pos.z, 0x444444, 1, 0.4, 0.4);
    } else {
      s.hull.position.y = 0.62 + Math.sin(tAll * 3 + s.slot) * 0.06;
    }
    // Cập nhật Cánh Đặc Trưng Riêng Biệt Cho Từng Lớp Tàu (Unique Wings Animation)
    if (s.ultWings) {
      s.ultWings.visible = !s.downed;
      const isUlt = s.ultActive > 0;
      const targetScale = isUlt ? (1.38 + Math.sin(tAll * 10) * 0.08) : (0.82 + Math.sin(tAll * 3 + s.slot) * 0.025);
      const lerpK = Math.min(1, rdt * 10);
      s.ultWings.scale.x += (targetScale - s.ultWings.scale.x) * lerpK;
      s.ultWings.scale.y += (targetScale - s.ultWings.scale.y) * lerpK;
      s.ultWings.scale.z += (targetScale - s.ultWings.scale.z) * lerpK;

      const ud = s.ultWings.userData;
      if (ud) {
        const cls = ud.classId || s.shipClass || 'striker';
        const flap = Math.sin(tAll * (isUlt ? 14 : 3.5) + s.slot) * (isUlt ? 0.16 : 0.07);
        const sweep = isUlt ? -0.18 : 0.04 * Math.cos(tAll * 3 + s.slot);

        if (ud.pivotL) {
          if (cls === 'colossus') {
            ud.pivotL.rotation.z = -flap * 0.35;
            ud.pivotL.rotation.y = sweep * 1.25;
          } else if (cls === 'phantom') {
            ud.pivotL.rotation.z = -flap * 0.5;
            ud.pivotL.rotation.y = -sweep * 1.5;
          } else if (cls === 'dronemaster') {
            ud.pivotL.rotation.z = -flap * 0.25;
            ud.pivotL.rotation.y = sweep * 0.4;
          } else {
            ud.pivotL.rotation.z = -flap;
            ud.pivotL.rotation.y = -sweep;
          }
        }
        if (ud.pivotR) {
          if (cls === 'colossus') {
            ud.pivotR.rotation.z = flap * 0.35;
            ud.pivotR.rotation.y = -sweep * 1.25;
          } else if (cls === 'phantom') {
            ud.pivotR.rotation.z = flap * 0.5;
            ud.pivotR.rotation.y = sweep * 1.5;
          } else if (cls === 'dronemaster') {
            ud.pivotR.rotation.z = flap * 0.25;
            ud.pivotR.rotation.y = -sweep * 0.4;
          } else {
            ud.pivotR.rotation.z = flap;
            ud.pivotR.rotation.y = sweep;
          }
        }
        if (ud.halo) {
          ud.halo.rotation.z = tAll * (isUlt ? 6 : 1.8);
          ud.halo.scale.setScalar(isUlt ? (1.45 + Math.sin(tAll * 16) * 0.15) : 1.0);
        }
        if (ud.gyros && ud.gyros.length) {
          const gSpeed = isUlt ? 9 : 3.2;
          for (let gi = 0; gi < ud.gyros.length; gi++) {
            ud.gyros[gi].rotation.x += rdt * gSpeed;
            ud.gyros[gi].rotation.y += rdt * (gSpeed * 0.7);
          }
        }
      }
    }

    s.coreM.material.emissiveIntensity = s.downed ? 0.2 : (0.9 + Math.sin(tAll * 4) * 0.25);
    const thrust = 0.55 + Math.min(1, sp / 12) * 0.75 + Math.sin(tAll * 40 + s.slot) * 0.08;
    for (let i = 0; i < s.flames.length; i++) {
      const f = s.flames[i];
      f.scale.z = (i % 2 ? 0.55 : 1) * thrust * (sp > 20 ? 1.8 : 1);
    }
    for (let i = 0; i < s.tips.length; i++) s.tips[i].visible = Math.sin(tAll * 6 + i * Math.PI) > -0.2;
    updTrail(s.trail, s.pos.x + Math.sin(s.g.rotation.y) * 0.9, s.pos.z + Math.cos(s.g.rotation.y) * 0.9, show && live);
    s.trail.m.material.uniforms.uO.value = Math.min(1, 0.35 + sp / 10);

    const n = s.blades.length;
    for (let i = 0; i < n; i++) {
      const a = t * 3.2 + i / n * TAU, b = s.blades[i];
      b.position.set(s.pos.x + Math.cos(a) * 2.7, 0.7, s.pos.z + Math.sin(a) * 2.7);
      b.rotation.y = -a;
      b.visible = !s.dead;
    }

    if (s.tag) {
      let showT = live && !s.dead && state !== 'over';
      if (showT) {
        tagV.set(s.pos.x, 1.9, s.pos.z).project(cam);
        if (tagV.z > 1) showT = false;
        else {
          const x = (tagV.x * 0.5 + 0.5) * innerWidth, y = (-tagV.y * 0.5 + 0.5) * innerHeight;
          s.tag.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%)`;
          s.tag.lastChild.firstChild.style.width = Math.max(0, s.S.hp / s.S.maxHp * 100) + '%';
        }
      }
      s.tag.hidden = !showT;
    }
  }
}
