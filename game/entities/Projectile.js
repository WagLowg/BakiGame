/* ==========================================================================
   ReChoice - js/entities/Projectile.js
   Projectile Classes - Đóng gói Đạn người chơi & Đạn kẻ địch
   ========================================================================== */
'use strict';

class Projectile extends Entity {
  constructor(mesh) {
    super(mesh);
    this.v = new V3();
    this.spd = 30;
    this.life = 0;
    this.pierce = 0;
    this.hit = new Set();
    this.owner = null;
    this.id = 0;
    this.r = 0.22;
  }

  reset(x, y, z, vx, vz, life, spd) {
    this.pos.set(x, y, z);
    this.v.set(vx, 0, vz);
    this.life = life;
    this.spd = spd;
    this.hit.clear();
    this.on = true;
    this.m.visible = true;
  }

  update(dt) {
    this.life -= dt;
    this.pos.addScaledVector(this.v, dt);
    return this.life > 0;
  }
}

class PlayerBullet extends Projectile {
  constructor(group, core, gl) {
    super(group);
    this.core = core;
    this.gl = gl;
  }
}

class EnemyBullet extends Projectile {
  constructor(group, core, gl) {
    super(group);
    this.core = core;
    this.gl = gl;
    this.r = 0.32;
  }
}
