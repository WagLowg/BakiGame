/* ==========================================================================
   ReChoice - js/ui/InputManager.js
   Input Manager Service - Quản lý Trạng thái Thiết bị Đầu vào (Keyboard, Mouse & Touch)
   ========================================================================== */
'use strict';

class InputManager {
  constructor() {
    this.aimPt = aimPt;
    this.aimPlane = aimPlane;
    this.ray = ray;
    this.ndc = ndc;
  }

  getMoveVector() {
    return typeof moveInput === 'function' ? moveInput() : { x: 0, z: 0 };
  }

  getAimPoint(shipPos) {
    if (isTouch) {
      const t = sticks.R;
      if (t.id !== null && Math.hypot(t.x, t.y) > 0.2) {
        return { x: shipPos.x + t.x * 6, z: shipPos.z + t.y * 6 };
      }
      return null;
    }

    this.ndc.set(mouse.x / innerWidth * 2 - 1, -(mouse.y / innerHeight) * 2 + 1);
    this.ray.setFromCamera(this.ndc, cam);
    if (this.ray.ray.intersectPlane(this.aimPlane, this.aimPt)) {
      return this.aimPt;
    }
    return null;
  }

  isFiring() {
    if (ovl) return false;
    if (isTouch) {
      const t = sticks.R;
      return t.id !== null && Math.hypot(t.x, t.y) > 0.2;
    }
    return autoFire || mouse.down;
  }
}
