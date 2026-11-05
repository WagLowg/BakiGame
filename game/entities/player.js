/* ==========================================================================
   ReChoice - js/entities/player.js
   Mô hình 4 Lớp Phi Thuyền 3D, Drone Hộ Vệ, Chiêu Cuối & Cơ Chế Hồi Sinh Co-op
   ========================================================================== */
'use strict';

const SG = {};
(() => {
  // 1. Dáng tàu Tiên Phong (Striker - Khí động học mũi nhọn)
  const body = new THREE.Shape();
  body.moveTo(0, 1.25);
  body.bezierCurveTo(0.15, 1.0, 0.27, 0.52, 0.31, -0.08);
  body.lineTo(0.25, -0.72);
  body.lineTo(-0.25, -0.72);
  body.lineTo(-0.31, -0.08);
  body.bezierCurveTo(-0.27, 0.52, -0.15, 1.0, 0, 1.25);

  SG.body = new THREE.ExtrudeGeometry(body, { depth: 0.24, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 2, curveSegments: 12 });
  SG.body.translate(0, 0, -0.12);
  SG.body.rotateX(-Math.PI / 2);

  const wing = new THREE.Shape();
  wing.moveTo(0.2, 0.42);
  wing.lineTo(1.28, -0.32);
  wing.lineTo(1.36, -0.6);
  wing.lineTo(1.05, -0.66);
  wing.lineTo(0.24, -0.46);
  wing.lineTo(0.2, 0.42);

  SG.wingR = new THREE.ExtrudeGeometry(wing, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 1 });
  SG.wingR.translate(0, 0, -0.03);
  SG.wingR.rotateX(-Math.PI / 2);

  SG.wingL = SG.wingR.clone();
  SG.wingL.scale(-1, 1, 1);

  const fin = new THREE.Shape();
  fin.moveTo(0, 0); fin.lineTo(0.5, 0); fin.lineTo(0.62, 0.36); fin.lineTo(0.32, 0.36); fin.lineTo(0, 0);
  SG.fin = new THREE.ExtrudeGeometry(fin, { depth: 0.04, bevelEnabled: false });
  SG.fin.translate(0, 0, -0.02);
  SG.fin.rotateY(-Math.PI / 2);

  SG.cockpit = new THREE.SphereGeometry(0.17, 20, 14);
  SG.cockpit.scale(1, 0.72, 2.2);

  SG.engine = new THREE.CylinderGeometry(0.11, 0.14, 0.46, 16);
  SG.engine.rotateX(Math.PI / 2);

  SG.nozzle = new THREE.TorusGeometry(0.11, 0.035, 8, 20);

  SG.flame = new THREE.ConeGeometry(0.1, 1, 14, 1, true);
  SG.flame.rotateX(Math.PI / 2);
  SG.flame.translate(0, 0, 0.5);

  SG.tip = new THREE.SphereGeometry(0.06, 10, 8);
  SG.spine = new THREE.BoxGeometry(0.05, 0.05, 1.25);
  SG.shield = new THREE.SphereGeometry(1.45, 28, 18);
  SG.winglet = new THREE.BoxGeometry(0.04, 0.24, 0.38);
  SG.nozzleRing = new THREE.TorusGeometry(0.12, 0.03, 8, 16);

  // 2. Dáng tàu Thiết Giáp (Colossus - Bọc thép hạng nặng)
  SG.tankHull = new THREE.BoxGeometry(1.3, 0.45, 1.8);
  SG.tankPlate = new THREE.BoxGeometry(0.35, 0.3, 1.5);
  SG.tankCannon = new THREE.CylinderGeometry(0.09, 0.12, 1.4, 12);
  SG.tankCannon.rotateX(-Math.PI / 2);
  SG.tankVent = new THREE.BoxGeometry(0.12, 0.08, 0.55);
  SG.tankShieldGen = new THREE.OctahedronGeometry(0.24, 0);

  // 3. Dáng tàu Bóng Ma (Phantom - Phi tiêu cánh ngược tàng hình)
  const phantomShape = new THREE.Shape();
  phantomShape.moveTo(0, 1.6);
  phantomShape.lineTo(1.5, -0.8);
  phantomShape.lineTo(0.6, -0.4);
  phantomShape.lineTo(0, -0.6);
  phantomShape.lineTo(-0.6, -0.4);
  phantomShape.lineTo(-1.5, -0.8);
  phantomShape.lineTo(0, 1.6);
  SG.phantomBody = new THREE.ExtrudeGeometry(phantomShape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 1 });
  SG.phantomBody.translate(0, 0, -0.06);
  SG.phantomBody.rotateX(-Math.PI / 2);
  SG.phantomFin = new THREE.BoxGeometry(0.04, 0.36, 0.48);
  SG.phantomIntake = new THREE.BoxGeometry(0.18, 0.1, 0.52);

  // 4. Dáng tàu Chỉ Huy Drone (Drone Master - Lục giác công nghệ cao & Drone mini)
  SG.droneHull = new THREE.CylinderGeometry(0.85, 0.95, 0.32, 6);
  SG.droneCore = new THREE.SphereGeometry(0.35, 16, 12);
  SG.miniDrone = new THREE.OctahedronGeometry(0.24, 0);
  SG.droneRing = new THREE.TorusGeometry(1.08, 0.04, 6, 24);
  SG.droneAntenna = new THREE.CylinderGeometry(0.02, 0.03, 0.42, 6);
  SG.droneAntenna.rotateX(-Math.PI / 3);
  SG.dronePod = new THREE.CylinderGeometry(0.14, 0.18, 0.32, 6);
  SG.reviveRing = new THREE.RingGeometry(2.8, 3.1, 32);
  SG.reviveRing.rotateX(-Math.PI / 2);

  // 5. Bộ Cánh Thiên Thần Pha Lê Đa Tầng 3D (Băng Phong S - Crystal Feather Wings)
  // Phiến lông vũ pha lê chính (Primary Crystal Blade)
  const fPrim = new THREE.Shape();
  fPrim.moveTo(0, 0);
  fPrim.lineTo(0.13, 0.22);
  fPrim.lineTo(0.10, 1.05);
  fPrim.lineTo(0, 1.52);
  fPrim.lineTo(-0.08, 1.02);
  fPrim.lineTo(-0.11, 0.18);
  fPrim.closePath();
  SG.featherPrimary = new THREE.ExtrudeGeometry(fPrim, {
    depth: 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1
  });
  SG.featherPrimary.translate(0, 0, -0.02);
  SG.featherPrimary.rotateX(-Math.PI / 2);

  // Phiến lông vũ giáp cơ khí trắng bạc lớp trên (Secondary Mecha Covert)
  const fSec = new THREE.Shape();
  fSec.moveTo(0, 0);
  fSec.lineTo(0.15, 0.16);
  fSec.lineTo(0.11, 0.72);
  fSec.lineTo(0, 0.98);
  fSec.lineTo(-0.09, 0.68);
  fSec.lineTo(-0.12, 0.14);
  fSec.closePath();
  SG.featherSecondary = new THREE.ExtrudeGeometry(fSec, {
    depth: 0.055, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 1
  });
  SG.featherSecondary.translate(0, 0, -0.0275);
  SG.featherSecondary.rotateX(-Math.PI / 2);

  // Khớp vai cơ khí gắn gốc cánh (Shoulder Pauldron Mount)
  const shShape = new THREE.Shape();
  shShape.moveTo(0, 0.36);
  shShape.lineTo(0.28, 0.08);
  shShape.lineTo(0.18, -0.34);
  shShape.lineTo(-0.14, -0.22);
  shShape.lineTo(-0.18, 0.15);
  shShape.closePath();
  SG.wingShoulder = new THREE.ExtrudeGeometry(shShape, {
    depth: 0.09, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1
  });
  SG.wingShoulder.translate(0, 0, -0.045);
  SG.wingShoulder.rotateX(-Math.PI / 2);

  // Ngọc năng lượng tâm khớp vai & Hào quang lưng
  SG.wingGem = new THREE.OctahedronGeometry(0.13, 0);
  SG.wingHalo = new THREE.RingGeometry(0.32, 0.46, 6);
  SG.wingHalo.rotateX(-Math.PI / 2);

  // 6. Cánh Giáp Titan Hạng Nặng cho Thiết Giáp (Colossus Heavy Aegis Wings)
  const tkShape = new THREE.Shape();
  tkShape.moveTo(0, 0.35);
  tkShape.lineTo(0.48, 0.28);
  tkShape.lineTo(0.92, -0.15);
  tkShape.lineTo(0.85, -0.85);
  tkShape.lineTo(0.28, -0.92);
  tkShape.lineTo(0, -0.45);
  tkShape.closePath();
  SG.tankWingPlate = new THREE.ExtrudeGeometry(tkShape, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.035, bevelSegments: 1 });
  SG.tankWingPlate.translate(0, 0, -0.07);
  SG.tankWingPlate.rotateX(-Math.PI / 2);
  SG.tankWingBooster = new THREE.CylinderGeometry(0.12, 0.16, 0.75, 12);
  SG.tankWingBooster.rotateX(Math.PI / 2);
  SG.tankWingVent = new THREE.BoxGeometry(0.25, 0.08, 0.55);

  // 7. Cánh Dao Cạo Hư Không Tàng Hình cho Bóng Ma (Phantom Void Razor Wings)
  const vShape = new THREE.Shape();
  vShape.moveTo(0, 0.15);
  vShape.lineTo(0.22, 0.25);
  vShape.lineTo(1.65, -0.45);
  vShape.lineTo(1.85, -0.72);
  vShape.lineTo(0.75, -0.62);
  vShape.lineTo(0, -0.22);
  vShape.closePath();
  SG.voidRazorLong = new THREE.ExtrudeGeometry(vShape, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 });
  SG.voidRazorLong.translate(0, 0, -0.02);
  SG.voidRazorLong.rotateX(-Math.PI / 2);

  const vShape2 = new THREE.Shape();
  vShape2.moveTo(0, 0.1);
  vShape2.lineTo(0.18, 0.18);
  vShape2.lineTo(1.25, -0.32);
  vShape2.lineTo(1.38, -0.52);
  vShape2.lineTo(0.55, -0.45);
  vShape2.lineTo(0, -0.15);
  vShape2.closePath();
  SG.voidRazorShort = new THREE.ExtrudeGeometry(vShape2, { depth: 0.045, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 });
  SG.voidRazorShort.translate(0, 0, -0.0225);
  SG.voidRazorShort.rotateX(-Math.PI / 2);

  // 8. Cánh Ma Trận Trạm Lượng Tử cho Chỉ Huy (Dronemaster Quantum Pylon Wings)
  SG.pylonArm = new THREE.BoxGeometry(0.12, 0.08, 1.35);
  SG.gyroRing = new THREE.TorusGeometry(0.28, 0.035, 8, 20);
  SG.subDish = new THREE.CylinderGeometry(0.18, 0.24, 0.08, 8);
})();

const ships = new Map();
let me = null;

function baseStats(classId = selectedClass) {
  const cls = SHIP_CLASSES[classId] || SHIP_CLASSES.striker;
  return Object.assign({
    hp: 100, maxHp: 100, speed: 9, dmg: 10, rate: 5.5,
    multi: 1, pierce: 0, bspd: 30, bsize: 1, crit: 0.05,
    chain: 0, boom: 0, regen: 0, magnet: 4.5, dashCd: 1.5,
    drones: 0, ultCharge: 0, maxUlt: 100, ultActiveT: 0,
    downed: false, reviveTime: 0
  }, cls.stats);
}

function buildShip(slot, classId = selectedClass, customCol = null) {
  const [c, em] = customCol || (typeof getShipColor === 'function' ? getShipColor(slot, slot === 0) : SHIP_COLORS[slot % 4]);
  const g = new THREE.Group(), model = new THREE.Group();
  model.position.y = 0.62;
  model.scale.setScalar(1.18);
  g.add(model);

  const mats = [];
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x221c38, metalness: 0.85, roughness: 0.22, emissive: em, emissiveIntensity: 0.08 });
  mats.push(hullMat);
  const accMat = new THREE.MeshStandardMaterial({ color: c, metalness: 0.6, roughness: 0.25, emissive: em, emissiveIntensity: 0.55, side: THREE.DoubleSide });
  mats.push(accMat);
  const cockMat = new THREE.MeshStandardMaterial({ color: 0x9ef2ff, emissive: 0x29c6ff, emissiveIntensity: 1.2, metalness: 0.1, roughness: 0.04 });
  mats.push(cockMat);

  const flames = [];
  const tips = [];
  let coreM = null;

  // Dựng hình theo Class
  if (classId === 'colossus') {
    // THIẾT GIÁP (Colossus) - Xe tăng bay hạng nặng bọc giáp phản ứng
    const body = new THREE.Mesh(SG.tankHull, hullMat);
    model.add(body);
    body.add(edgeLines(SG.tankHull, lighten(c, 0.45), 0.9));

    // Lõi tháp phát khiên bát diện phát quang trên nóc
    const shieldGen = new THREE.Mesh(SG.tankShieldGen, basicGlow(lighten(c, 0.5), 1.0));
    shieldGen.position.set(0, 0.35, -0.2);
    model.add(shieldGen);

    for (const sx of [-0.75, 0.75]) {
      const pl = new THREE.Mesh(SG.tankPlate, accMat);
      pl.position.set(sx, 0.05, 0.1);
      model.add(pl);
      pl.add(edgeLines(SG.tankPlate, lighten(c, 0.7), 0.95));

      const cn = new THREE.Mesh(SG.tankCannon, hullMat);
      cn.position.set(sx * 0.7, -0.05, -0.7);
      model.add(cn);
    }

    // Rãnh tản nhiệt năng lượng neon 2 bên
    for (const sx of [-0.38, 0.38]) {
      const vent = new THREE.Mesh(SG.tankVent, basicGlow(c, 0.9));
      vent.position.set(sx, 0.25, 0.32);
      model.add(vent);
    }

    coreM = new THREE.Mesh(SG.cockpit, cockMat);
    coreM.position.set(0, 0.24, -0.1);
    model.add(coreM);

    for (const sx of [-0.42, 0.42, -0.16, 0.16]) {
      const nz = new THREE.Mesh(SG.nozzleRing, hullMat);
      nz.position.set(sx, 0, 0.9);
      model.add(nz);

      const fl = new THREE.Mesh(SG.flame, basicGlow(lighten(c, 0.55), 0.9));
      fl.position.set(sx, 0, 0.95);
      fl.scale.set(0.65, 0.65, 0.7);
      model.add(fl);
      flames.push(fl);
    }
  } else if (classId === 'phantom') {
    // BÓNG MA (Phantom) - Phi cơ tàng hình cánh ngược siêu âm
    const body = new THREE.Mesh(SG.phantomBody, accMat);
    model.add(body);
    body.add(edgeLines(SG.phantomBody, lighten(c, 0.8), 0.95));

    // Cặp cánh đuôi vát nghiêng chữ V tàng hình
    for (const sx of [-0.48, 0.48]) {
      const fin = new THREE.Mesh(SG.phantomFin, accMat);
      fin.position.set(sx, 0.22, 0.22);
      fin.rotation.z = sx > 0 ? -0.32 : 0.32;
      model.add(fin);
      fin.add(edgeLines(SG.phantomFin, lighten(c, 0.75), 0.95));
    }

    // Khe hút luồng khí ion plasma
    for (const sx of [-0.28, 0.28]) {
      const intake = new THREE.Mesh(SG.phantomIntake, hullMat);
      intake.position.set(sx, 0.08, -0.15);
      model.add(intake);
    }

    coreM = new THREE.Mesh(SG.cockpit, cockMat);
    coreM.scale.set(0.8, 0.5, 1.8);
    coreM.position.set(0, 0.12, 0.1);
    model.add(coreM);

    for (const sx of [-0.18, 0.18]) {
      const fl = new THREE.Mesh(SG.flame, basicGlow(lighten(c, 0.5), 0.95));
      fl.position.set(sx, 0, 0.7);
      fl.scale.set(0.6, 0.6, 1.15);
      model.add(fl);
      flames.push(fl);
    }
  } else if (classId === 'dronemaster') {
    // CHỈ HUY DRONE (Drone Master) - Trạm không gian di động lục giác
    const body = new THREE.Mesh(SG.droneHull, hullMat);
    model.add(body);
    body.add(edgeLines(SG.droneHull, lighten(c, 0.55), 0.9));

    // Vành từ trường công nghệ cao bao quanh thân
    const statorRing = new THREE.Mesh(SG.droneRing, basicGlow(lighten(c, 0.35), 0.85));
    statorRing.rotation.x = Math.PI / 2;
    model.add(statorRing);

    // 3 cột ăng-ten radar lượng tử 3 hướng
    for (let i = 0; i < 3; i++) {
      const ang = (i / 3) * Math.PI * 2;
      const ant = new THREE.Mesh(SG.droneAntenna, accMat);
      ant.position.set(Math.cos(ang) * 0.72, 0.14, Math.sin(ang) * 0.72);
      ant.rotation.y = -ang;
      model.add(ant);
    }

    // 2 pod chứa drone phóng trinh sát 2 bên hông
    for (const sx of [-0.68, 0.68]) {
      const pod = new THREE.Mesh(SG.dronePod, hullMat);
      pod.position.set(sx, 0, 0);
      pod.rotation.z = Math.PI / 2;
      model.add(pod);
      pod.add(edgeLines(SG.dronePod, lighten(c, 0.7), 0.9));
    }

    coreM = new THREE.Mesh(SG.droneCore, basicGlow(c, 0.95));
    coreM.position.set(0, 0.18, 0);
    model.add(coreM);

    for (const sx of [-0.35, 0.35]) {
      const fl = new THREE.Mesh(SG.flame, basicGlow(lighten(c, 0.45), 0.9));
      fl.position.set(sx, 0, 0.65);
      fl.scale.set(0.6, 0.6, 0.85);
      model.add(fl);
      flames.push(fl);
    }
  } else {
    // TIÊN PHONG (Striker) - Tiêm kích đánh chặn tốc độ cao
    const lineCol = lighten(c, 0.35);
    const body = new THREE.Mesh(SG.body, hullMat);
    model.add(body);
    body.add(edgeLines(SG.body, lineCol, 0.85));

    for (const wg of [SG.wingL, SG.wingR]) {
      const w = new THREE.Mesh(wg, accMat);
      model.add(w);
      w.add(edgeLines(wg, lighten(c, 0.6), 0.9));
    }

    // Winglet chóp cánh khí động học
    for (const sx of [-1.22, 1.22]) {
      const wl = new THREE.Mesh(SG.winglet, accMat);
      wl.position.set(sx, 0.1, -0.38);
      wl.rotation.z = sx > 0 ? -0.25 : 0.25;
      model.add(wl);
      wl.add(edgeLines(SG.winglet, lighten(c, 0.75), 0.95));
    }

    for (const sx of [-0.24, 0.24]) {
      const f = new THREE.Mesh(SG.fin, accMat);
      f.position.set(sx, 0.12, 0.25);
      f.rotation.z = sx > 0 ? -0.25 : 0.25;
      model.add(f);
    }
    const spine = new THREE.Mesh(SG.spine, basicGlow(c, 0.95));
    spine.position.set(0, 0.2, 0.05);
    model.add(spine);

    coreM = new THREE.Mesh(SG.cockpit, cockMat);
    coreM.position.set(0, 0.2, -0.3);
    model.add(coreM);

    for (const sx of [-0.2, 0.2]) {
      const en = new THREE.Mesh(SG.engine, hullMat);
      en.position.set(sx, 0, 0.66);
      model.add(en);

      const nz = new THREE.Mesh(SG.nozzleRing, hullMat);
      nz.position.set(sx, 0, 0.86);
      model.add(nz);

      const fl = new THREE.Mesh(SG.flame, basicGlow(lighten(c, 0.45), 0.85));
      fl.position.set(sx, 0, 0.92);
      fl.scale.set(0.65, 0.65, 0.85);
      model.add(fl);
      flames.push(fl);
    }
  }

  for (const sx of [-1.2, 1.2]) {
    const tp = new THREE.Mesh(SG.tip, basicGlow(sx < 0 ? 0xff4f6d : 0x6dffb0, 1));
    tp.position.set(sx, 0.02, 0.5);
    model.add(tp);
    tips.push(tp);
  }

  const shield = new THREE.Mesh(SG.shield, fresnelMat(0x4ff0ff, 2.4, 0.9));
  shield.position.y = 0.62;
  g.add(shield);
  mats.push(shield.material);

  // Vòng cứu hộ đồng đội (In-combat Revive Zone)
  const revRing = new THREE.Mesh(SG.reviveRing, basicGlow(0x2fe0b5, 0.85));
  revRing.position.y = 0.08;
  revRing.visible = false;
  g.add(revRing);

  // Cụm Cánh Đặc Trưng Riêng Biệt Cho Từng Lớp Tàu (Unique Wings per Ship Class)
  const ultWings = new THREE.Group();
  ultWings.position.set(0, 0.14, 0.06);
  ultWings.scale.setScalar(0.82);
  ultWings.visible = true;

  const silverArmorMat = new THREE.MeshStandardMaterial({
    color: 0xd8e6f4, metalness: 0.85, roughness: 0.28, emissive: c, emissiveIntensity: 0.12
  });
  const crystalFeatherMat = new THREE.MeshStandardMaterial({
    color: lighten(c, 0.25),
    metalness: 0.22,
    roughness: 0.12,
    emissive: c,
    emissiveIntensity: 0.32,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide
  });
  const coreGemMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: lighten(c, 0.5),
    emissiveIntensity: 0.55,
    metalness: 0.1,
    roughness: 0.1
  });
  const haloMat = new THREE.MeshBasicMaterial({
    color: lighten(c, 0.3),
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide
  });
  mats.push(silverArmorMat, crystalFeatherMat, coreGemMat, haloMat);

  const pivots = [];
  const gyros = [];
  let halo = null;

  if (classId === 'colossus') {
    // 2. THIẾT GIÁP: Cánh Giáp Titan Hạng Nặng & Phản Lực Siêu Áp (Heavy Aegis Bulwark)
    const titanMat = new THREE.MeshStandardMaterial({ color: 0x221d30, metalness: 0.88, roughness: 0.32, emissive: c, emissiveIntensity: 0.15 });
    const ventMat = basicGlow(0xff5511, 0.75);
    mats.push(titanMat, ventMat);

    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.45, 0.05, 0.05);

      // Tấm giáp phản ứng Titan tầng 1
      const p1 = new THREE.Mesh(SG.tankWingPlate, titanMat);
      p1.scale.x = side;
      p1.position.set(side * 0.1, 0, 0);
      p1.add(edgeLines(SG.tankWingPlate, lighten(c, 0.6), 0.55));
      pivot.add(p1);

      // Tấm giáp Titan tầng 2 vát góc ngoài
      const p2 = new THREE.Mesh(SG.tankWingPlate, silverArmorMat);
      p2.scale.set(side * 0.78, 0.78, 0.78);
      p2.position.set(side * 0.38, 0.04, -0.05);
      p2.add(edgeLines(SG.tankWingPlate, 0xffffff, 0.45));
      pivot.add(p2);

      // Cụm ống xả phản lực siêu áp (Heavy Thruster)
      const bst = new THREE.Mesh(SG.tankWingBooster, titanMat);
      bst.position.set(side * 0.22, -0.02, 0.42);
      bst.add(edgeLines(SG.tankWingBooster, lighten(c, 0.5), 0.4));
      pivot.add(bst);

      // Rãnh tản nhiệt cam neon
      const vnt = new THREE.Mesh(SG.tankWingVent, ventMat);
      vnt.position.set(side * 0.28, 0.06, 0.1);
      pivot.add(vnt);

      ultWings.add(pivot);
      pivots.push(pivot);
    }
  } else if (classId === 'phantom') {
    // 3. BÓNG MA: Cánh Dao Cạo Hư Không Tàng Hình (Void Crescent Razor Wings)
    const voidMat = new THREE.MeshStandardMaterial({
      color: 0x7c4dff, metalness: 0.4, roughness: 0.15,
      emissive: c, emissiveIntensity: 0.38,
      transparent: true, opacity: 0.8, side: THREE.DoubleSide
    });
    mats.push(voidMat);

    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.3, 0.06, -0.05);

      // Lưỡi dao hư không dài quét về sau
      const r1 = new THREE.Mesh(SG.voidRazorLong, voidMat);
      r1.scale.x = side;
      r1.position.set(side * 0.08, 0.02, 0);
      r1.add(edgeLines(SG.voidRazorLong, 0xdfccff, 0.5));
      pivot.add(r1);

      // Lưỡi dao hư không phụ tầng trên
      const r2 = new THREE.Mesh(SG.voidRazorShort, silverArmorMat);
      r2.scale.set(side * 0.9, 0.9, 0.9);
      r2.position.set(side * 0.05, 0.06, 0.08);
      r2.add(edgeLines(SG.voidRazorShort, lighten(c, 0.6), 0.45));
      pivot.add(r2);

      // Ngọc tâm hư không
      const gem = new THREE.Mesh(SG.wingGem, coreGemMat);
      gem.position.set(side * 0.06, 0.08, 0);
      pivot.add(gem);

      ultWings.add(pivot);
      pivots.push(pivot);
    }
  } else if (classId === 'dronemaster') {
    // 4. CHỈ HUY DRONE: Cánh Ma Trận Trạm Lượng Tử & Anten Viễn Thám (Quantum Array Wings)
    const arrayMat = new THREE.MeshStandardMaterial({ color: 0x1f2738, metalness: 0.85, roughness: 0.25, emissive: c, emissiveIntensity: 0.2 });
    const gyroMat = basicGlow(lighten(c, 0.4), 0.65);
    mats.push(arrayMat, gyroMat);

    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.38, 0.08, 0);

      // Cột giá đỡ anten lượng tử
      const arm = new THREE.Mesh(SG.pylonArm, arrayMat);
      arm.position.set(side * 0.45, 0, 0);
      arm.rotation.y = side * 0.22;
      arm.add(edgeLines(SG.pylonArm, lighten(c, 0.7), 0.45));
      pivot.add(arm);

      // Vòng từ trường Gyro xoay tròn
      const gyro = new THREE.Mesh(SG.gyroRing, gyroMat);
      gyro.position.set(side * 0.85, 0.04, 0.2);
      pivot.add(gyro);
      gyros.push(gyro);

      // Đĩa phát sóng viễn thám mini
      const dish = new THREE.Mesh(SG.subDish, silverArmorMat);
      dish.position.set(side * 0.55, 0.1, -0.3);
      dish.rotation.z = side * 0.35;
      pivot.add(dish);

      ultWings.add(pivot);
      pivots.push(pivot);
    }
  } else {
    // 1. TIÊN PHONG: Cánh Thiên Thần Pha Lê Đa Tầng (Crystal Feather Wings - Băng Phong S)
    halo = new THREE.Mesh(SG.wingHalo, haloMat);
    halo.position.set(0, 0.12, 0.15);
    ultWings.add(halo);

    const primSpecs = [
      { ang: 1.38, len: 1.15, y: 0.06, rz: 0.12 },
      { ang: 1.56, len: 1.45, y: 0.04, rz: 0.08 },
      { ang: 1.76, len: 1.32, y: 0.02, rz: 0.04 },
      { ang: 1.96, len: 1.16, y: 0.00, rz: 0.00 },
      { ang: 2.16, len: 0.98, y: -0.02, rz: -0.04 },
      { ang: 2.36, len: 0.82, y: -0.04, rz: -0.06 }
    ];

    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.34, 0.04, 0.02);

      // Khớp vai cơ khí trắng bạc & Ngọc tâm năng lượng
      const shoulder = new THREE.Mesh(SG.wingShoulder, silverArmorMat);
      shoulder.scale.x = side;
      shoulder.position.set(side * 0.08, 0.06, 0);
      shoulder.add(edgeLines(SG.wingShoulder, lighten(c, 0.5), 0.5));
      pivot.add(shoulder);

      const gem = new THREE.Mesh(SG.wingGem, coreGemMat);
      gem.position.set(side * 0.12, 0.13, -0.02);
      pivot.add(gem);

      // Tầng 1: 6 Phiến Lông Vũ Pha Lê Bán Trong Suốt
      for (let i = 0; i < primSpecs.length; i++) {
        const sp = primSpecs[i];
        const f = new THREE.Mesh(SG.featherPrimary, crystalFeatherMat);
        f.position.set(side * 0.06, sp.y, i * 0.04);
        f.rotation.y = -side * sp.ang;
        f.rotation.z = side * sp.rz;
        f.scale.set(1.0, 1.0, sp.len);
        f.add(edgeLines(SG.featherPrimary, lighten(c, 0.7), 0.42));
        pivot.add(f);
      }

      // Tầng 2: 4 Phiến Giáp Vũ Trắng Bạc Đè Lên Gốc Cánh
      for (let j = 0; j < 4; j++) {
        const ang = 1.48 + j * 0.23;
        const len = 0.92 - j * 0.09;
        const cov = new THREE.Mesh(SG.featherSecondary, silverArmorMat);
        cov.position.set(side * 0.05, 0.075 - j * 0.01, j * 0.035);
        cov.rotation.y = -side * ang;
        cov.rotation.z = side * (0.14 - j * 0.03);
        cov.scale.set(1.05, 1.0, len);
        cov.add(edgeLines(SG.featherSecondary, lighten(c, 0.4), 0.45));
        pivot.add(cov);
      }

      // Tầng 3: Đuôi Phượng Hoàng Pha Lê Phía Sau
      const tail = new THREE.Mesh(SG.featherPrimary, crystalFeatherMat);
      tail.position.set(side * 0.02, -0.03, 0.36);
      tail.rotation.y = -side * 2.76;
      tail.scale.set(0.85, 1.0, 1.05);
      tail.add(edgeLines(SG.featherPrimary, lighten(c, 0.6), 0.38));
      pivot.add(tail);

      ultWings.add(pivot);
      pivots.push(pivot);
    }
  }

  ultWings.userData = { pivotL: pivots[0], pivotR: pivots[1], halo, gyros, classId };
  model.add(ultWings);

  return { g, hull: model, coreM, shield, flames, tips, mats, accMat, hullMat, revRing, classId, ultWings };
}

// Vệt sáng động cơ (Engine Trail)
const TRAILN = 26;
function makeTrail(col) {
  const pos = new Float32Array(TRAILN * 2 * 3), al = new Float32Array(TRAILN * 2), idx = [];
  for (let i = 0; i < TRAILN - 1; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    idx.push(a, b, c, b, d, c);
  }
  for (let i = 0; i < TRAILN; i++) {
    al[i * 2] = al[i * 2 + 1] = 1 - i / (TRAILN - 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aA', new THREE.BufferAttribute(al, 1));
  geo.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uC: { value: new THREE.Color(col) }, uO: { value: 1 } },
    vertexShader: `attribute float aA;varying float vA;void main(){vA=aA;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform vec3 uC;uniform float uO;varying float vA;void main(){gl_FragColor=vec4(uC*(.6+vA*.8),vA*vA*.55*uO);}`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  });
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false;
  scene.add(m);
  return { m, pts: [], geo };
}

function updTrail(tr, x, z, show) {
  tr.m.visible = show && Q.trail;
  if (!tr.m.visible) { tr.pts.length = 0; return; }
  const last = tr.pts[0];
  if (!last || Math.hypot(last[0] - x, last[1] - z) > 0.16) {
    tr.pts.unshift([x, z]);
    if (tr.pts.length > TRAILN) tr.pts.pop();
  } else {
    last[0] = x; last[1] = z;
    if (tr.pts.length > 1) tr.pts.pop();
  }
  const p = tr.geo.attributes.position.array, n = tr.pts.length;
  for (let i = 0; i < TRAILN; i++) {
    const a = tr.pts[Math.min(i, n - 1)] || [x, z], b = tr.pts[Math.min(i + 1, n - 1)] || a;
    let dx = a[0] - b[0], dz = a[1] - b[1];
    const l = Math.hypot(dx, dz) || 1;
    dx /= l; dz /= l;
    const w = 0.26 * (1 - i / TRAILN);
    p[i * 6] = a[0] - dz * w; p[i * 6 + 1] = 0.6; p[i * 6 + 2] = a[1] + dx * w;
    p[i * 6 + 3] = a[0] + dz * w; p[i * 6 + 4] = 0.6; p[i * 6 + 5] = a[1] - dx * w;
  }
  tr.geo.attributes.position.needsUpdate = true;
}

function addShip(id, name, slot, local, classId = selectedClass) {
  const s = new Ship(id, name, slot, local, classId);
  ships.set(id, s);
  if (local) me = s;
  return s;
}

function removeShip(id) {
  const s = ships.get(id);
  if (!s) return;
  s.destroy();
  ships.delete(id);
  if (me === s) me = null;
}

function clearShips() {
  for (const id of [...ships.keys()]) removeShip(id);
}

const bladeGeo = new THREE.OctahedronGeometry(0.5);
const bladeMat = new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffb020, emissiveIntensity: 1.2, metalness: 0.6, roughness: 0.2, flatShading: true });
function syncBlades(s, n) {
  while (s.blades.length < n) {
    const m = new THREE.Mesh(bladeGeo, bladeMat);
    m.scale.set(0.5, 0.22, 1.3);
    scene.add(m);
    s.blades.push(m);
  }
  while (s.blades.length > n) scene.remove(s.blades.pop());
}

function aliveShips() {
  const a = [];
  for (const s of ships.values()) if (!s.dead && !s.downed) a.push(s);
  return a;
}

function nearestShip(x, z) {
  let best = null, bd = 1e18;
  for (const s of ships.values()) {
    if (s.dead || s.downed) continue;
    const d = (s.pos.x - x) ** 2 + (s.pos.z - z) ** 2;
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

/* ---------- Kích hoạt Chiêu Tất Sát (Ultimate Ability) ---------- */
function useUltimate() {
  if (!me || me.dead || me.downed || state !== 'play' || ovl) return;
  if (typeof me.useUltimate === 'function') {
    me.useUltimate();
  }
}

// Chiếu sáng phụ & Tâm ngắm
const plight = new THREE.PointLight(0xffb547, 1.3, 13);
scene.add(plight);

const reticle = new THREE.Group();
{
  const r1 = new THREE.Mesh(new THREE.RingGeometry(0.38, 0.46, 32), basicGlow(0xffc04d, 0.95));
  r1.rotation.x = -Math.PI / 2;
  reticle.add(r1);
  for (let i = 0; i < 4; i++) {
    const t = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.28), basicGlow(0xffc04d, 0.95));
    t.rotation.x = -Math.PI / 2;
    t.rotation.z = i * Math.PI / 2;
    t.position.set(Math.sin(i * Math.PI / 2) * 0.66, 0, Math.cos(i * Math.PI / 2) * 0.66);
    reticle.add(t);
  }
  scene.add(reticle);
}

const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const aimPt = new THREE.Vector3();
const tmp = new THREE.Vector3();
