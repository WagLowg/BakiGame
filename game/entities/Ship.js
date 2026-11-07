/* ==========================================================================
   ReChoice - js/entities/Ship.js
   Player Ship Class - Đóng gói toàn diện Phi thuyền, 4 Lớp, Drone, Ult & Revive
   ========================================================================== */
'use strict';

class Ship extends Entity {
  constructor(id, name, slot, local = false, shipClass = selectedClass) {
    const colPair = typeof getShipColor === 'function' ? getShipColor(slot, local) : SHIP_COLORS[slot % 4];
    const vis = buildShip(slot, shipClass, colPair);
    super(vis.g);

    this.id = id;
    this.name = name;
    this.slot = slot;
    this.local = local;
    this.shipClass = shipClass;
    this.colorHex = colPair[0];

    // Gán các visual components từ buildShip
    this.g = vis.g;
    this.hull = vis.hull;
    this.shield = vis.shield;
    this.flames = vis.flames;
    this.tips = vis.tips;
    this.coreM = vis.coreM;
    this.revRing = vis.revRing;
    this.ultWings = vis.ultWings;
    this.mats = vis.mats;

    // Tạo các thông số gốc theo Class Archetype
    this.S = baseStats(shipClass);
    this.upg = {};

    // Vector điều hướng & Vận tốc
    this.aim = new V3(0, 0, -1);
    this.firing = false;
    this.fireCd = 0;
    this.recoil = 0;

    // Cơ chế Lướt né (Dash)
    this.dashT = 0;
    this.dashCool = 0;
    this.dashDir = new V3();
    this.dashId = 0;

    // Mạng & Nội suy máy khách (Client interpolation)
    this.tx = 0; this.tz = 0;
    this.tRy = 0; this.tRz = 0;
    this.lx = 0; this.lz = 0;
    this.netInv = false;

    // Chiêu cuối (Ultimate Ability)
    this.ult = 0;
    this.maxUlt = 100;
    this.ultActive = 0;
    this.ultDuration = 5.0;
    this.ultTimer = 0;
    this.ultCooldown = 0;
    this.wantUlt = false;

    // Cơ chế Cứu sống đồng đội tại chỗ (In-Combat Revive)
    this.downed = false;
    this.reviveProgress = 0;
    this.reviveNear = false;
    this.revTick = 0;

    // Buffs (Overcharge x2 Sát thương)
    this.boostT = 0;

    // Khởi tạo Drone nếu là Dronemaster
    this.drones = [];
    if (this.shipClass === 'dronemaster') {
      this.drones.push(new Drone(this, 0));
      this.drones.push(new Drone(this, 1));
    }

    // Kiếm quay quanh tàu (nâng cấp Blade Orbit)
    this.blades = [];

    // Vệt sáng động cơ
    this.trail = makeTrail(this.colorHex);

    // Gắn thẻ tên (Name Tag) trên đầu nếu là đồng đội
    this.tag = null;
    if (!local) this.createNameTag();

    scene.add(this.g);
  }

  createNameTag() {
    const t = document.createElement('div');
    t.className = 'ntag';
    const n = document.createElement('span');
    n.textContent = this.name;
    t.appendChild(n);
    const bar = document.createElement('i');
    bar.appendChild(document.createElement('b'));
    t.appendChild(bar);
    t.style.setProperty('--c', CSS_COLORS[this.slot % 4]);
    t.hidden = true;
    const tagContainer = $('tags');
    if (tagContainer) tagContainer.appendChild(t);
    this.tag = t;
  }

  /**
   * Điều khiển cục bộ người chơi (Local Player Control)
   */
  control(dt, mv, aimPt) {
    if (this.dead || this.downed || ovl) return;

    const S = this.S;
    const slow = slowAt(this.pos.x, this.pos.z);

    // Xử lý di chuyển & Lướt né
    if (this.dashT > 0) {
      this.dashT -= dt;
      this.vx = this.dashDir.x * 38;
      this.vz = this.dashDir.z * 38;
    } else {
      const k = Math.min(1, dt * 12);
      this.vx += (mv.x * S.speed * slow - this.vx) * k;
      this.vz += (mv.z * S.speed * slow - this.vz) * k;
    }

    // Lực hút từ trường đấu trường (nếu có hố đen/kẻ địch)
    const pull = pullAt(this.pos.x, this.pos.z);
    this.pos.x += (this.vx + pull.x) * dt;
    this.pos.z += (this.vz + pull.z) * dt;

    // Giới hạn trong sàn đấu
    const pl = Math.hypot(this.pos.x, this.pos.z);
    if (pl > RA - 0.8) {
      this.pos.x *= (RA - 0.8) / pl;
      this.pos.z *= (RA - 0.8) / pl;
    }

    // Xử lý góc ngắm
    if (aimPt) {
      tmp.set(aimPt.x - this.pos.x, 0, aimPt.z - this.pos.z);
      if (tmp.lengthSq() > 0.04) this.aim.copy(tmp.normalize());
    }

    // Xoay tàu mượt mà theo hướng ngắm
    const targetAngle = Math.atan2(-this.aim.x, -this.aim.z);
    let dr = targetAngle - this.g.rotation.y;
    dr = Math.atan2(Math.sin(dr), Math.cos(dr));
    this.g.rotation.y += dr * Math.min(1, dt * 20);

    // Nghiêng tàu theo chuyển động ngang (Banking tilt)
    this.g.rotation.z = -this.vx * 0.014 * Math.cos(this.g.rotation.y) + this.vz * 0.014 * Math.sin(this.g.rotation.y);

    this.dashCool -= dt;
  }

  /**
   * Bắn đạn chính
   */
  shoot(visOnly = false) {
    if (this.dead || this.downed) return;
    const S = this.S;
    const n = S.multi;
    const base = Math.atan2(this.aim.x, this.aim.z);
    const step = n > 1 ? Math.min(0.15, 0.85 / (n - 1)) : 0;
    const px = this.pos.x, pz = this.pos.z;

    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * step + rnd(-0.025, 0.025);
      const b = PB.get();
      b.m.position.set(px + Math.sin(a) * 0.9, 0.65, pz + Math.cos(a) * 0.9);
      b.v.set(Math.sin(a) * S.bspd, 0, Math.cos(a) * S.bspd);
      b.spd = S.bspd;
      b.life = 1.1;
      b.pierce = S.pierce;
      b.hit.clear();
      b.r = 0.22 * S.bsize;
      b.owner = this.id;
      b.id = visOnly ? 0 : ++bSeq;

      const vs = Math.pow(S.bsize, 0.6);
      b.core.scale.set(vs * 0.8, vs * 0.8, vs * 2.6);
      b.m.rotation.y = a;
      b.gl.material.color.setHex(this.colorHex);
      b.gl.scale.setScalar(1.05 * vs);
      b.core.material.color.copy(lighten(this.colorHex, 0.3));

      if (!visOnly && typeof q === 'function') {
        q(['pb', b.id, this.id, r2(b.m.position.x), r2(b.m.position.z), r2(b.v.x), r2(b.v.z), r2(S.bsize)]);
      }
    }

    if (this.local) {
      rawEmit(px + this.aim.x * 1.1, 0.65, pz + this.aim.z * 1.1, 0xffd28a, 3, 3, 0.15, 0.2, 0.35);
      rawGlow(px + this.aim.x * 1.1, 0.65, pz + this.aim.z * 1.1, this.colorHex, 1.4, 0.06);
      sfx.shoot();
    }
    this.recoil = 1;
  }

  /**
   * Kích hoạt Lướt né (Dash)
   */
  dash(inputDir) {
    if (this.dead || this.downed || this.dashCool > 0 || this.dashT > 0 || ovl) return;
    let dx = inputDir ? inputDir.x : this.aim.x;
    let dz = inputDir ? inputDir.z : this.aim.z;
    const l = Math.hypot(dx, dz) || 1;
    this.dashDir.set(dx / l, 0, dz / l);
    this.dashT = 0.18;
    this.dashCool = this.S.dashCd;
    this.dashId++;

    sfx.dash();
    rawRing(this.pos.x, this.pos.z, 0x2fe0d0, 3, 0.3);
    caFx = Math.max(caFx, 0.5);
    rawEmit(this.pos.x, 0.6, this.pos.z, 0x9cf7ff, 14, 6, 0.4, 0.3, 0.4);
  }

  /**
   * Nạp Năng lượng Nộ (Ultimate)
   */
  chargeUlt(amount) {
    if (this.ultActive > 0 || this.ultCooldown > 0 || this.ult >= this.maxUlt) return;
    this.ult = Math.min(this.maxUlt, this.ult + amount);
    if (this.ult >= this.maxUlt && this.local) {
      sfx.ultReady();
      rawToast('CHIÊU CUỐI ĐÃ SẴN SÀNG! [Q/E]');
    }
  }

  /**
   * Kích hoạt Chiêu Tất Sát Diện Rộng (Screen-wide AoE Ultimate Ability)
   */
  useUltimate() {
    if (this.dead || this.downed || state !== 'play') return;
    if (NET.mode === 'guest') {
      if (this.ult >= this.maxUlt && this.ultActive <= 0 && this.ultCooldown <= 0) {
        this.wantUlt = true;
        if (typeof sendInput === 'function') sendInput();
      }
      return;
    }
    if (this.ult < this.maxUlt || this.ultActive > 0 || this.ultCooldown > 0) return;
    this.ult = 0;
    this.ultActive = this.ultDuration;
    this.ultCooldown = this.ultDuration + 3.0;
    this.ultTimer = 0.05;
    this.inv = this.ultDuration;
    if (sfx.ult) sfx.ult();
    rawScreenFlash(0.45);
    G.shake = 1.8;
    caFx = Math.max(caFx, 1.4);

    if (typeof q === 'function') {
      q(['U', this.id, this.shipClass, r2(this.pos.x), r2(this.pos.z), r2(this.aim.x), r2(this.aim.z)]);
    }

    // Sóng xung kích mở màn xóa sạch đạn địch toàn bản đồ
    playerShockwave(this, this.pos.x, this.pos.z, 22, 160, this.colorHex);
    rawEmit(this.pos.x, 0.7, this.pos.z, this.colorHex, 55, 16, 0.85);

    const baseAng = Math.atan2(this.aim.x, this.aim.z);
    const rx = Math.cos(baseAng), rz = -Math.sin(baseAng);

    switch (this.shipClass) {
      case 'striker':
        rawBanner('BÃO TỐ LÔI ĐÌNH', 'Song Lôi Quang Cực Đại & Bão Lông Vũ Điện Từ!');
        for (const sOff of [-0.55, 0.55]) {
          const sx = this.pos.x + rx * sOff, sz = this.pos.z + rz * sOff;
          playerBeam(this, sx, sz, sx + this.aim.x * 36, sz + this.aim.z * 36, 1.15, 0.45, this.colorHex, 240);
        }
        spawnFeatherBarrage(this, 12, 1.35, 34, this.colorHex, 5, 1.65, baseAng);
        const origRate = this.S.rate;
        const origSpd = this.S.speed;
        this.S.rate *= 2.8;
        this.S.speed *= 1.35;
        setTimeout(() => {
          this.S.rate = origRate;
          this.S.speed = origSpd;
        }, this.ultDuration * 1000);
        break;

      case 'colossus':
        rawBanner('TẬN THẾ NHIỆT HẠCH', 'Sóng Supernova Toàn Bản Đồ & Bão Đại Bác 360°!');
        playerShockwave(this, this.pos.x, this.pos.z, 28, 420, 0xff5522);
        spawnFeatherBarrage(this, 18, TAU * 0.95, 26, 0xff6622, 4, 2.0, baseAng);
        break;

      case 'phantom':
        rawBanner('BĂNG PHONG TUYỆT KỸ', 'Song Hàn Băng Laser & Bão Lông Vũ Pha Lê!');
        G.slow = 6.0;
        for (const sOff of [-0.52, 0.52]) {
          const sx = this.pos.x + rx * sOff, sz = this.pos.z + rz * sOff;
          playerBeam(this, sx, sz, sx + this.aim.x * 38, sz + this.aim.z * 38, 1.3, 0.5, 0xb88cff, 260);
        }
        spawnFeatherBarrage(this, 14, 1.5, 36, 0x55f0ff, 6, 1.75, baseAng);
        const origCrit = this.S.crit;
        this.S.crit = 1.0;
        setTimeout(() => { this.S.crit = origCrit; }, this.ultDuration * 1000);
        break;

      case 'dronemaster':
        rawBanner('MA TRẬN HỦY DIỆT', '6 Cột Laser Vệ Tinh Quét Sạch 360° Toàn Sàn Đấu!');
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * TAU;
          const ex = this.pos.x + Math.cos(ang) * 28;
          const ez = this.pos.z + Math.sin(ang) * 28;
          playerBeam(this, this.pos.x, this.pos.z, ex, ez, 0.95, 0.55, 0x2fe0d0, 280);
        }
        spawnFeatherBarrage(this, 12, TAU * 0.92, 30, 0x2fe0d0, 5, 1.6, baseAng);
        break;
    }

    if (this.local && typeof q === 'function') q(['ult', this.id, this.shipClass]);
  }

  /**
   * Hồi máu
   */
  heal(amount) {
    this.S.hp = Math.min(this.S.maxHp, this.S.hp + amount);
  }

  /**
   * Gục ngã (Downed) - Chờ đồng đội đến cứu
   */
  down() {
    this.S.hp = 0;
    this.downed = true;
    this.firing = false;
    this.reviveProgress = 0;
    this.reviveNear = false;
    if (this.revRing) this.revRing.visible = true;
    this.inv = 1.2;
    emit(this.pos.x, 0.7, this.pos.z, 0xffa500, 20, 6, 0.6);
    snd('hit');
    rawBanner('ĐỒNG ĐỘI GỤC', 'Đến gần để cứu sống!');
  }

  /**
   * Hồi sinh tại chỗ thành công
   */
  revive() {
    this.downed = false;
    this.reviveProgress = 0;
    this.reviveNear = false;
    this.S.hp = Math.round(this.S.maxHp * 0.4);
    this.inv = 2.2;
    if (this.revRing) this.revRing.visible = false;
    if (sfx.reviveDone) sfx.reviveDone();
    rawRing(this.pos.x, this.pos.z, 0x2fe0d0, 5, 0.4);
    emit(this.pos.x, 0.7, this.pos.z, 0x2fe0d0, 24, 8, 0.6);
    rawBanner('HỒI SINH!', `${this.name.toUpperCase()} đã trở lại chiến trường`);
  }

  update(dt) {
    super.update(dt);

    if (this.dead) return;

    // Cập nhật Cánh Thiên Thần Pha Lê 3D
    if (this.ultWings) {
      this.ultWings.visible = !this.downed;
      const isUlt = this.ultActive > 0;
      const targetScale = isUlt ? (1.38 + Math.sin(tAll * 10) * 0.08) : 0.82;
      const lerpK = Math.min(1, dt * 10);
      this.ultWings.scale.x += (targetScale - this.ultWings.scale.x) * lerpK;
      this.ultWings.scale.y += (targetScale - this.ultWings.scale.y) * lerpK;
      this.ultWings.scale.z += (targetScale - this.ultWings.scale.z) * lerpK;
    }

    // Cập nhật Drones
    for (let i = 0; i < this.drones.length; i++) {
      this.drones[i].update(dt);
    }

    // Cập nhật Buff
    if (this.boostT > 0) this.boostT -= dt;

    // Hồi máu nội tại (Regen)
    if (!this.downed && this.S.regen > 0) {
      this.heal(this.S.regen * dt);
    }

    // Giảm thời gian hồi bắn
    this.fireCd -= dt * slowAt(this.pos.x, this.pos.z);
    if (state === 'play' && this.firing && this.fireCd <= 0 && !this.downed) {
      this.fireCd = 1 / this.S.rate;
      this.shoot(false);
    }
  }

  destroy() {
    this.dead = true;
    for (const d of this.drones) d.destroy();
    this.drones = [];
    for (const b of this.blades) scene.remove(b);
    this.blades = [];
    if (this.trail) {
      scene.remove(this.trail.m);
      if (this.trail.geo) this.trail.geo.dispose();
      if (this.trail.m && this.trail.m.material) this.trail.m.material.dispose();
    }
    if (this.tag && this.tag.parentElement) {
      this.tag.parentElement.removeChild(this.tag);
    }
    if (this.m && this.m.parent) {
      this.m.parent.remove(this.m);
    }
  }
}
