/* ==========================================================================
   ReChoice - js/entities/Enemy.js
   Enemy Class - Đóng gói Kẻ địch, Thuộc tính, AI Hành vi & Sinh học Procedural
   ========================================================================== */
'use strict';

class Enemy extends Entity {
  constructor(type, vis, options = {}) {
    super(vis.m);
    this.type = type;
    this.t = T[type];
    this.inner = vis.inner;
    this.mat = vis.mats[0];
    this.mats = vis.mats;
    this.P = vis.P;
    this.fade = vis.fade;

    // Tính toán chỉ số máu theo Đợt và Số người chơi (Crew scaling)
    const c = typeof crew === 'function' ? crew() : 1;
    const sc = this.t.boss || this.t.part
      ? (type === 'boss' ? (1 + 0.7 * (G.wave / 5 - 1)) * (1 + 0.35 * (c - 1)) : (typeof bossScale === 'function' ? bossScale() : 1))
      : (1 + 0.14 * (G.wave - 1)) * (1 + 0.35 * (c - 1));

    this.hp = options.hp || this.t.hp * sc;
    this.max = options.max || this.hp;
    this.r = this.t.r;
    this.spd = this.t.spd * (1 + 0.02 * (G ? G.wave : 1));
    this.spawn = options.spawnT !== undefined ? options.spawnT : 0.45;
    this.spawn0 = this.spawn;
    this.flash = 0;
    this.flashV = 0;
    this.cd = rnd(0.5, 1) * (this.t.fire || 1);
    this.orbitCd = 0;
    this.dashHit = {};
    this.ph = Math.random() * TAU;
    this.dir = Math.random() < 0.5 ? 1 : -1;
    this.kx = 0;
    this.kz = 0;
    this.st = 0;
    this.a = 0;
    this.b = 0;
    this.size = 1;
    this.inv = false;
    this.dmgMul = 1;
    this.punch = 0;
    this.lastBoom = 0;
    this.lastDmg = 0;
    this.lastShip = null;

    Object.assign(this, options);

    if (typeof AI !== 'undefined' && AI[type]) {
      this.ai = AI[type];
    }
  }

  updateMovement(dt, target) {
    if (this.dead) return;

    // Animation khi đang sinh ra (Spawn popping)
    if (this.spawn > 0) {
      this.spawn -= dt;
      const s = 1 - Math.max(this.spawn, 0) / (this.spawn0 || 0.45);
      this.m.scale.setScalar(Math.max(0.01, easeBack(Math.min(1, s))) * this.size);
      this.m.rotation.y += dt * 6;
      return;
    }

    this.m.scale.setScalar(this.size);
    const tx = target ? target.pos.x : 0;
    const tz = target ? target.pos.z : 0;
    const dx = tx - this.pos.x;
    const dz = tz - this.pos.z;
    const d = Math.hypot(dx, dz) || 1;

    let ax = dx / d, az = dz / d, spd = this.spd, custom = false;

    // AI chuyên biệt
    if (this.ai) {
      const r = this.ai(this, dt, target, dx, dz, d);
      if (r === false) custom = true;
      else { ax = r[0]; az = r[1]; spd = r[2]; }
    } else if (this.type === 'shooter') {
      const rg = this.t.range;
      if (d < rg * 0.55) { ax = -ax; az = -az; }
      else if (d < rg) { const sx = -az * this.dir, sz = ax * this.dir; ax = sx; az = sz; spd *= 0.7; }
      this.cd -= dt;
      if (target && this.cd <= 0 && d < rg + 4 && state === 'play') {
        this.cd = this.t.fire * rnd(0.8, 1.2);
        fireE(this.pos.x, this.pos.z, Math.atan2(dx, dz), 11);
        this.flash = 0.12;
        snd('enemyShot');
      }
    } else if (this.type === 'boss') {
      const r = bossAI(this, dt, dx, dz, d);
      ax = r[0]; az = r[1]; spd = r[2];
    }

    if (!custom) {
      const k = Math.min(1, dt * 5);
      this.vx += (ax * spd - this.vx) * k;
      this.vz += (az * spd - this.vz) * k;
      this.pos.x += (this.vx + this.kx) * dt;
      this.pos.z += (this.vz + this.kz) * dt;

      const kd = Math.pow(0.02, dt);
      this.kx *= kd;
      this.kz *= kd;

      // Giới hạn trong sàn đấu
      const el = Math.hypot(this.pos.x, this.pos.z);
      if (el > RA - 0.5) {
        this.pos.x *= (RA - 0.5) / el;
        this.pos.z *= (RA - 0.5) / el;
      }

      this.ph += dt;
      if (!this.ai) {
        this.pos.y = this.t.y + Math.sin(this.ph * 3) * 0.15;
        if (this.t.face) {
          const want = Math.atan2(this.vx, this.vz);
          this.m.rotation.y = lerpAngle(this.m.rotation.y, want, Math.min(1, dt * 8));
          this.m.rotation.z = Math.sin(this.ph * 6) * 0.12;
        } else {
          this.m.rotation.y += dt * (this.type === 'tank' ? 0.8 : 2.2);
          this.m.rotation.x += dt * (this.type === 'boss' ? 0.4 : 1.1);
        }
      }
    }

    this.flash -= dt;
    this.flashV = this.flash > 0 ? 1 : 0;
    this.orbitCd -= dt;
  }
}
