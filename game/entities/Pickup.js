/* ==========================================================================
   ReChoice - js/entities/Pickup.js
   Battlefield Pickup Class - Đóng gói Vật phẩm Rơi Chiến Trường 3D
   ========================================================================== */
'use strict';

class PickupItem extends Entity {
  constructor(mesh, inner, gl, floorRing, meshes) {
    super(mesh);
    this.inner = inner;
    this.gl = gl;
    this.floorRing = floorRing;
    this.meshes = meshes; // { heal, magnet, nuke, boost }
    this.type = 'heal';
    this.life = 0;
    this.t = 0;
  }

  spawn(type, x, z) {
    const def = PK_TYPES[type];
    if (!def) return;
    this.type = type;
    this.life = 18;
    this.t = Math.random() * 6;
    this.pos.set(x, 0.5, z);
    this.m.visible = true;
    this.on = true;

    this.gl.material.color.setHex(def.col);
    this.floorRing.material.color.setHex(def.col);

    this.meshes.heal.visible = (type === 'heal');
    this.meshes.magnet.visible = (type === 'magnet');
    this.meshes.nuke.visible = (type === 'nuke');
    this.meshes.boost.visible = (type === 'boost');

    spawnFx(x, z, def.col, false);
  }

  update(dt) {
    if (!this.on) return false;
    this.t += dt;
    this.life -= dt;

    if (this.life <= 0) {
      this.on = false;
      this.m.visible = false;
      return false;
    }

    // Nhấp nháy cảnh báo sắp hết hạn
    if (this.life < 4) {
      this.m.visible = (Math.sin(this.life * 16) > -0.2);
    } else {
      this.m.visible = true;
    }

    this.inner.rotation.y += dt * 2.2;
    this.pos.y = 0.5 + Math.sin(this.t * 3.5) * 0.12;
    this.floorRing.rotation.z += dt * 0.8;
    return true;
  }

  collect(ship) {
    const def = PK_TYPES[this.type];
    const px = this.pos.x, pz = this.pos.z;
    rawEmit(px, 0.5, pz, def.col, 18, 5, 0.45);
    rawRing(px, pz, def.col, 2.8, 0.3);

    switch (this.type) {
      case 'heal':
        ship.heal(40);
        sfx.pickupHeal();
        rawBanner(def.label, def.msg);
        break;

      case 'magnet':
        sfx.pickupMagnet();
        if (G) {
          G.vacuum = true;
          setTimeout(() => { if (G) G.vacuum = false; }, 3500);
        }
        rawBanner(def.label, def.msg);
        break;

      case 'nuke':
        sfx.pickupNuke();
        if (G) G.shake = 1.6;
        rawBanner(def.label, def.msg);
        for (const b of EB.items) if (b.on) EB.free(b);
        for (const e of enemies) {
          if (!e.dead && e.spawn <= 0) {
            damage(e, e.t && e.t.boss ? 180 : 350, true);
          }
        }
        break;

      case 'boost':
        ship.boostT = 10;
        sfx.pickupBuff();
        rawBanner(def.label, def.msg);
        break;
    }

    this.on = false;
    this.m.visible = false;
  }
}
