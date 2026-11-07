/* ==========================================================================
   ReChoice - js/engine/GameEngine.js
   Game Engine Architecture - Điều phối Toàn bộ Vòng đời Trò chơi (Core Loop)
   ========================================================================== */
'use strict';

class GameEngine {
  constructor() {
    this.cameraCtrl = null;
    this.input = null;
    this.clock = (typeof clock !== 'undefined') ? clock : new THREE.Clock();
    this.running = false;
  }

  init() {
    this.cameraCtrl = new CameraController(cam);
    this.input = new InputManager();

    window.addEventListener('resize', () => this.onResize());
    this.onResize();

    // Khởi chạy render loop
    this.running = true;
    requestAnimationFrame(() => this.tick());
  }

  onResize() {
    if (typeof resize === 'function') resize();
  }

  clearWorld() {
    for (const e of enemies) disposeEnemy(e);
    enemies.length = 0;
    for (const e of netEn.values()) disposeEnemy(e);
    netEn.clear();

    PB.clear();
    EB.clear();
    GM.clear();
    RG.clear();
    DB.clear();
    if (typeof PK !== 'undefined') PK.clear();

    pendingBoom.length = 0;
    netPB.clear();
    netEB.clear();

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

  newRun(list) {
    this.clearWorld();
    clearShips();

    for (const [id, name, slot, shipClass] of list) {
      const isLocal = (id === NET.myId);
      const cls = shipClass || (isLocal ? selectedClass : 'striker');
      const s = new Ship(id, name, slot, isLocal, cls);
      ships.set(id, s);
      if (isLocal) {
        me = s;
        this.cameraCtrl.setTarget(me);
      }

      const [x, z] = spawnPoint(slot, list.length);
      s.pos.set(x, 0, z);
      s.tx = x; s.tz = z; s.lx = x; s.lz = z;
      s.inv = 1.2;
    }

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

  tick() {
    requestAnimationFrame(() => this.tick());

    const rdt = Math.min(this.clock.getDelta(), 0.05);
    tAll += rdt;
    let dt = 0;
    const live = ['play', 'levelup', 'dying', 'pause'].includes(state);

    if (NET.mode === 'guest') {
      if (live && G) {
        dt = rdt;
        guestUpdate(dt);
        NET.sendT -= rdt;
        if (NET.sendT <= 0) { NET.sendT = 0.05; sendInput(); }
      }
    } else if (state === 'play' || state === 'dying') {
      dt = rdt * (G.slow > 0 ? 0.28 : 1);
      if (G.slow > 0) G.slow -= rdt;
      update(dt);
      if (state === 'dying') {
        G.deadT -= rdt;
        if (G.deadT <= 0) gameOver();
      }
    }
    if (typeof music === 'function') music(rdt);

    if (NET.mode === 'host' && NET.running && G) {
      if (state === 'levelup') { G.lvlT -= rdt; if (G.lvlT <= 0) autoPicks(); }
      NET.sendT -= rdt;
      if (NET.sendT <= 0 && NET.running) { NET.sendT = 0.05; snapshot(); }
    }

    const frozen = state === 'pause' || (state === 'levelup' && !online());
    const pdt = frozen ? 0 : (dt || rdt);

    updParticles(pdt);
    updRings(pdt);
    updDebris(pdt);
    updFlashes(pdt);
    updBolts(pdt);
    updBeams(pdt);
    updMarks(pdt);
    updDmg(rdt);

    for (const e of enemyList()) if (!e.dead) animEnemy(e, pdt);
    shipsVisual(frozen ? 0 : rdt, live);

    for (const b of PB.items) if (b.on) b.gl.material.opacity = 0.45 + 0.15 * Math.sin(tAll * 30 + b.id);

    // Cập nhật Sân đấu & Tường năng lượng
    floorMat.uniforms.uT.value = tAll;
    floorMat.uniforms.uR.value = RA;
    wallMat.uniforms.uT.value = tAll;
    dustMat.uniforms.uT.value = tAll;
    wall.scale.set(RA / R, 1, RA / R);

    const bossOn = G && G.bossR > 0 ? 1 : 0;
    floorMat.uniforms.uBoss.value += (bossOn - floorMat.uniforms.uBoss.value) * Math.min(1, rdt * 2);
    wallMat.uniforms.uC.value.setHex(bossOn ? 0xff2a5a : 0xff3f8f);

    let pi = 0;
    for (const s of ships.values()) {
      if (pi < 4 && !s.dead) { floorMat.uniforms.uPl.value[pi].set(s.pos.x, s.pos.z); pi++; }
    }
    for (; pi < 4; pi++) floorMat.uniforms.uPl.value[pi].set(999, 999);

    if (Q && !Q.simpleFloor) {
      for (const s of shards) {
        s.m.rotation.y += rdt * s.s;
        s.m.rotation.x += rdt * s.s * 0.6;
        s.m.position.y = s.y + Math.sin(tAll * 0.6 + s.ph) * 0.6;
      }
    }
    for (const p of pillars) {
      p.cap.scale.setScalar(1.2 + 0.8 * Math.max(0, Math.sin(tAll * 2 + p.ph)));
    }

    reticle.visible = !!me && !me.dead && !isTouch && (state === 'play' || state === 'levelup' || state === 'pause');
    reticle.rotation.y += rdt * 1.5;
    if (me) plight.position.set(me.pos.x, 2.2, me.pos.z);

    // Camera Cập nhật
    if (this.cameraCtrl) {
      this.cameraCtrl.update(rdt, live, bossOn);
      hudT -= rdt;
      if (hudT <= 0 && G && live) { hudT = 0.05; hud(); }
    }

    // Tự động kiểm soát hiệu năng theo thời gian thực (Dynamic FPS Governor)
    if (live && state === 'play') {
      this.fpsFrames = (this.fpsFrames || 0) + 1;
      this.fpsAccum = (this.fpsAccum || 0) + rdt;
      if (this.fpsAccum >= 2.0) {
        const curFps = this.fpsFrames / this.fpsAccum;
        this.fpsFrames = 0;
        this.fpsAccum = 0;

        if (curFps < 42 && !this.downscaled) {
          if (SET.quality === 'high') {
            SET.quality = 'mid';
            if (typeof applyQuality === 'function') applyQuality();
            if (typeof renderSettings === 'function') renderSettings();
            if (typeof rawToast === 'function') rawToast('⚡ Đã tự chuyển về Đồ họa Vừa để ổn định 60 FPS');
          } else if (SET.quality === 'mid') {
            SET.quality = 'low';
            if (typeof applyQuality === 'function') applyQuality();
            if (typeof renderSettings === 'function') renderSettings();
            if (typeof rawToast === 'function') rawToast('⚡ Đã kích hoạt Chế độ Siêu Mượt cho Card Onboard');
          } else if (SET.quality === 'low' && renderer.getPixelRatio() > 0.85) {
            renderer.setPixelRatio(0.85);
            resize();
            this.downscaled = true;
            if (typeof rawToast === 'function') rawToast('⚡ Tự động tối ưu tỷ lệ khung hình để chống giật lag');
          }
        }
      }
    }

    // Hậu kỳ (Post-processing) - Bỏ qua hoàn toàn trên Card Onboard (iGPU)
    hurtFx = Math.max(0, hurtFx - rdt * 2.5);
    caFx = Math.max(0, caFx - rdt * 2.5);
    screenFlash = Math.max(0, screenFlash - rdt * 2.2);
    $('flash').style.opacity = screenFlash * 0.6;

    const useComposer = composer && Q && (Q.bloom || Q.post);
    if (useComposer && postPass) {
      const u = postPass.uniforms;
      u.uT.value = tAll % 10;
      u.uHurt.value = hurtFx;
      u.uCA.value = caFx + hurtFx * 0.6 + (G && G.shake > 0.5 ? 0.2 : 0);
      u.uSat.value = state === 'over' ? 0.35 : 1;
    }

    if (useComposer) composer.render();
    else renderer.render(scene, cam);
  }
}
