/* ==========================================================================
   ReChoice - js/entities/Entity.js
   Base Entity Class - Lớp cơ sở cho toàn bộ thực thể 3D trong game
   ========================================================================== */
'use strict';

class Entity {
  constructor(mesh) {
    this.m = mesh || new THREE.Group();
    this.pos = this.m.position;
    this.rot = this.m.rotation;
    this.scale = this.m.scale;
    this.dead = false;
    this.inv = 0;       // Thời gian miễn sát thương (invulnerability)
    this.vx = 0;        // Vận tốc X
    this.vz = 0;        // Vận tốc Z
    this.radius = 0.5;  // Bán kính va chạm vật lý
  }

  /**
   * Đặt vị trí không gian 3D
   */
  setPosition(x, y, z) {
    this.pos.set(x, y, z);
    return this;
  }

  /**
   * Khoảng cách 2D (mặt phẳng XZ) tới một thực thể khác hoặc tọa độ
   */
  distSqTo(x, z) {
    const dx = this.pos.x - x;
    const dz = this.pos.z - z;
    return dx * dx + dz * dz;
  }

  distTo(x, z) {
    return Math.sqrt(this.distSqTo(x, z));
  }

  /**
   * Vòng đời cập nhật frame logic
   * @param {number} dt Delta time
   */
  update(dt) {
    if (this.inv > 0) this.inv -= dt;
  }

  /**
   * Tiêu hủy thực thể và dọn dẹp khỏi Three.js Scene
   */
  destroy() {
    this.dead = true;
    if (this.m && this.m.parent) {
      this.m.parent.remove(this.m);
    }
  }
}
