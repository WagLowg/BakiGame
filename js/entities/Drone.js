/* ==========================================================================
   ReChoice - js/entities/Drone.js
   Autonomous Support Drone Class - Drone Hộ Vệ Tự Hành
   ========================================================================== */
'use strict';

class Drone extends Entity {
  constructor(owner, index = 0) {
    const group = new THREE.Group();
    super(group);

    this.owner = owner;
    this.index = index;
    this.orbitRadius = 1.85;
    this.orbitSpeed = 2.4;
    this.angle = (index / 2) * Math.PI * 2;
    this.fireCd = 0.5 + index * 0.35;
    this.target = null;

    // Dựng hình Drone 3D Procedural
    const droneMat = new THREE.MeshStandardMaterial({
      color: 0x2fe0b5,
      emissive: 0x10d0a0,
      emissiveIntensity: 1.2,
      metalness: 0.6,
      roughness: 0.2,
      flatShading: true
    });
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), droneMat);
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.035, 6, 16), droneMat);
    this.ring.rotation.x = Math.PI / 2;

    this.glow = glow(0x2fe0b5, 1.2, 0.6);
    this.m.add(core, this.ring, this.glow);
    scene.add(this.m);
  }

  update(dt) {
    if (!this.owner || this.owner.dead || this.owner.downed) {
      this.m.visible = false;
      return;
    }
    this.m.visible = true;

    // Quỹ đạo xoay quanh tàu
    this.angle += dt * this.orbitSpeed;
    const ox = this.owner.pos.x;
    const oz = this.owner.pos.z;
    const tx = ox + Math.cos(this.angle) * this.orbitRadius;
    const tz = oz + Math.sin(this.angle) * this.orbitRadius;

    this.pos.x += (tx - this.pos.x) * Math.min(1, dt * 12);
    this.pos.z += (tz - this.pos.z) * Math.min(1, dt * 12);
    this.pos.y = 0.75 + Math.sin(this.angle * 2) * 0.12;

    this.ring.rotation.z += dt * 3.5;
    this.m.rotation.y += dt * 2.0;

    // Logic Tự động Tìm quái và Bắn tỉa
    this.fireCd -= dt;
    if (this.fireCd <= 0 && state === 'play') {
      const target = this.findNearestEnemy(16);
      if (target) {
        this.fireCd = 0.75;
        this.shootAt(target);
      }
    }
  }

  findNearestEnemy(maxRange) {
    let nearest = null;
    let minD2 = maxRange * maxRange;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.dead || e.spawn > 0 || (e.t && e.t.ghost)) continue;
      const d2 = this.distSqTo(e.m.position.x, e.m.position.z);
      if (d2 < minD2) {
        minD2 = d2;
        nearest = e;
      }
    }
    return nearest;
  }

  shootAt(enemy) {
    const dx = enemy.m.position.x - this.pos.x;
    const dz = enemy.m.position.z - this.pos.z;
    const ang = Math.atan2(dx, dz);
    const spd = 28;

    const b = PB.get();
    b.m.position.set(this.pos.x, 0.7, this.pos.z);
    b.v.set(Math.sin(ang) * spd, 0, Math.cos(ang) * spd);
    b.spd = spd;
    b.life = 0.85;
    b.pierce = 0;
    b.hit.clear();
    b.r = 0.18;
    b.owner = this.owner.id;
    b.id = ++bSeq;

    b.core.scale.set(0.65, 0.65, 1.8);
    b.m.rotation.y = ang;
    b.gl.material.color.setHex(0x2fe0b5);
    b.core.material.color.setHex(0xd0fff4);

    rawEmit(this.pos.x, 0.7, this.pos.z, 0x2fe0b5, 2, 1.8, 0.12);
  }

  destroy() {
    super.destroy();
    if (this.glow && this.glow.material) this.glow.material.dispose();
  }
}
