/* ==========================================================================
   ReChoice - js/engine/CameraController.js
   Camera Controller Class - Điều khiển Camera 3D, Lerp Mượt & Rung Chấn Động
   ========================================================================== */
'use strict';

class CameraController {
  constructor(camera) {
    this.cam = camera;
    this.camPos = new V3(0, 30, 24);
    this.target = null;
    this.shakeIntensity = 0;
  }

  setTarget(ship) {
    this.target = ship;
  }

  shake(amount) {
    this.shakeIntensity = Math.min(2.5, this.shakeIntensity + amount);
  }

  update(dt, isLive, bossActive = false) {
    const portrait = this.cam.aspect < 0.85;

    if (!isLive) {
      // Menu / Lobby Camera lơ lửng xoay nhẹ
      const a = tAll * 0.08;
      this.cam.position.set(Math.sin(a) * 34, 24, Math.cos(a) * 34);
      this.cam.lookAt(0, 0, 0);
      return;
    }

    let f = this.target;
    if (!f || f.dead) {
      const alive = aliveShips();
      f = alive.length > 0 ? alive[0] : me;
    }
    const pp = f ? f.pos : tmp.set(0, 0, 0);
    const k = (portrait ? 1.45 : 1) * (bossActive ? 1.15 : 1);

    this.camPos.set(pp.x, 24 * k, pp.z + 13 * k);
    this.cam.position.lerp(this.camPos, Math.min(1, dt * 5));

    // Xử lý Rung màn hình (Screen Shake)
    if (G && G.shake > 0) {
      G.shake = Math.max(0, G.shake - dt * 2.2);
      const s = G.shake * 0.6 * SET.shake;
      this.cam.position.x += rnd(-s, s);
      this.cam.position.y += rnd(-s, s) * 0.5;
      this.cam.position.z += rnd(-s, s);
    }

    this.cam.lookAt(pp.x, 0, pp.z - 1);
  }
}
