/* ==========================================================================
   ReChoice - js/entities/enemies.js
   Định nghĩa Kẻ địch, Boss, Đạn, Tinh thể & Mô hình 3D Sinh học Procedural
   ========================================================================== */
'use strict';

const T = {
  chaser:   { hp: 22,   spd: 5.4, r: 0.75, y: 0.85, col: 0xff4f6d, xp: 1,  sc: 10,   dmg: 12, face: 1 },
  shooter:  { hp: 30,   spd: 3.6, r: 0.8,  y: 0.95, col: 0x9a7bff, xp: 2,  sc: 20,   dmg: 10, range: 13, fire: 2.1, face: 1 },
  splitter: { hp: 50,   spd: 3.3, r: 1.0,  y: 1.05, col: 0x2fe0b5, xp: 3,  sc: 30,   dmg: 14, face: 1 },
  tank:     { hp: 150,  spd: 2.3, r: 1.2,  y: 0.9,  col: 0xff9a3d, xp: 6,  sc: 60,   dmg: 24, face: 1 },
  mini:     { hp: 12,   spd: 6.8, r: 0.5,  y: 0.6,  col: 0x2fe0b5, xp: 1,  sc: 5,    dmg: 8,  face: 1 },
  boss:     { hp: 1100, spd: 2.6, r: 2.7,  y: 2.9,  col: 0xd62828, xp: 40, sc: 1500, dmg: 30, boss: 1, heavy: 1 },
  queen:    { hp: 1500, spd: 0,   r: 2.4,  y: 2.1,  col: 0xffb020, xp: 45, sc: 3000, dmg: 28, boss: 1, heavy: 1 },
  bee:      { hp: 45,   spd: 0,   r: 0.65, y: 1.4,  col: 0xffd23a, xp: 0,  sc: 15,   dmg: 12, part: 1, heavy: 1 },
  egg:      { hp: 30,   spd: 0,   r: 0.7,  y: 0.65, col: 0xfff0b0, xp: 0,  sc: 5,    dmg: 0,  part: 1, heavy: 1 },
  golem:    { hp: 1700, spd: 2.3, r: 1.75, y: 1.7,  col: 0xff7a2a, xp: 16, sc: 1200, dmg: 30, boss: 1, heavy: 1 },
  hole:     { hp: 1600, spd: 1.1, r: 2.2,  y: 1.6,  col: 0x9a4dff, xp: 55, sc: 4000, dmg: 35, boss: 1, heavy: 1 },
  twinA:    { hp: 900,  spd: 0,   r: 1.6,  y: 2.0,  col: 0xe8f4ff, xp: 30, sc: 2500, dmg: 25, boss: 1, heavy: 1 },
  twinB:    { hp: 900,  spd: 0,   r: 1.6,  y: 2.0,  col: 0x7a4dff, xp: 30, sc: 2500, dmg: 25, boss: 1, heavy: 1 },
  maestro:  { hp: 1800, spd: 0,   r: 2.4,  y: 2.2,  col: 0xffd166, xp: 60, sc: 5000, dmg: 30, boss: 1, heavy: 1 },
  note:     { hp: 110,  spd: 0,   r: 1.05, y: 1.5,  col: 0x6ef0ff, xp: 2,  sc: 40,   dmg: 15, part: 1, heavy: 1 },
  ghost:    { hp: 1400, spd: 4.2, r: 1.6,  y: 1.8,  col: 0xb07bff, xp: 60, sc: 5500, dmg: 30, boss: 1, heavy: 1 },
  decoy:    { hp: 1,    spd: 3.4, r: 1.2,  y: 1.6,  col: 0xb07bff, xp: 0,  sc: 5,    dmg: 15, part: 1 },
  thief:    { hp: 1700, spd: 4.4, r: 1.8,  y: 1.6,  col: 0x3dff8a, xp: 70, sc: 6000, dmg: 25, boss: 1, heavy: 1 },
  clock:    { hp: 2200, spd: 0,   r: 3.4,  y: 0.6,  col: 0x7ad7ff, xp: 75, sc: 7000, dmg: 20, boss: 1, heavy: 1 },
  bubble:   { hp: 1,    spd: 0,   r: 4.0,  y: 0.4,  col: 0x8fd8ff, xp: 0,  sc: 0,    dmg: 0,  part: 1, ghost: 1, heavy: 1 },
  dhead:    { hp: 900,  spd: 9.0, r: 1.6,  y: 1.4,  col: 0xff3fd0, xp: 80, sc: 8000, dmg: 35, boss: 1, heavy: 1 },
  dseg:     { hp: 80,   spd: 0,   r: 1.1,  y: 1.1,  col: 0x8a5cff, xp: 1,  sc: 40,   dmg: 22, part: 1, bar: 1, heavy: 1 },
  mine:     { hp: 8,    spd: 0,   r: 0.65, y: 0.5,  col: 0xff3355, xp: 0,  sc: 5,    dmg: 0,  part: 1, heavy: 1 },
  ultimate: { hp: 6000, spd: 2.4, r: 3.6,  y: 3.4,  col: 0xff2a7a, xp: 150,sc: 30000,dmg: 40, boss: 1, heavy: 1 }
};
const TYPES = Object.keys(T);

const BOSSES = [
  { key: 'queen',    name: 'NỮ HOÀNG TỔ ONG',       sub: 'Chỉ mất máu khi mở vỏ đẻ trứng' },
  { key: 'golem',    name: 'CỰ THẠCH PHÂN RÃ',      sub: 'Lướt qua sóng chấn động' },
  { key: 'hole',     name: 'HỐ ĐEN',                sub: 'Chờ lúc nó thở ra' },
  { key: 'twins',    name: 'GƯƠNG SONG SINH',       sub: 'Bắn vào mặt tối · hạ cả hai trong 3 giây' },
  { key: 'maestro',  name: 'NHẠC TRƯỞNG HƯ KHÔNG',  sub: 'Phá nốt nhạc trước' },
  { key: 'ghost',    name: 'BÓNG MA SĂN MỒI',       sub: 'Lướt né khi bị đánh dấu' },
  { key: 'thief',    name: 'KẺ ĐÁNH CẮP',           sub: 'Hạ nó để lấy lại nâng cấp' },
  { key: 'clock',    name: 'ĐỒNG HỒ THỜI GIAN',     sub: 'Đừng ngừng bắn' },
  { key: 'dragon',   name: 'RỒNG PLASMA',           sub: 'Phá từng đốt thân' },
  { key: 'ultimate', name: 'LÕI HƯ KHÔNG TỐI THƯỢNG',sub: 'Trận chiến cuối cùng' }
];

const NOTE_COLS = [0x6ef0ff, 0xff6bd6, 0xffe066, 0x7dff9a];

const EG = {
  // --- Các chi tiết Chiến Hạm Mecha (Thunder Strike Style) ---
  shipHull: new THREE.BoxGeometry(0.8, 0.35, 1.6),
  shipNose: new THREE.ConeGeometry(0.45, 1.4, 4),
  shipWedge: new THREE.ConeGeometry(0.75, 1.8, 3),
  cockpit: new THREE.BoxGeometry(0.3, 0.2, 0.65),
  wingMain: new THREE.BoxGeometry(1.5, 0.05, 0.65),
  finVert: new THREE.BoxGeometry(0.05, 0.45, 0.5),
  finHoriz: new THREE.BoxGeometry(0.6, 0.04, 0.3),
  armorPlate: new THREE.BoxGeometry(0.45, 0.14, 0.95),
  mandible: new THREE.BoxGeometry(0.2, 0.26, 1.3),
  cannon: new THREE.CylinderGeometry(0.06, 0.08, 1.1, 8),
  heavyCannon: new THREE.CylinderGeometry(0.12, 0.15, 1.8, 8),
  nozzle: new THREE.CylinderGeometry(0.16, 0.22, 0.45, 8, 1, true),
  nozzleLarge: new THREE.CylinderGeometry(0.32, 0.44, 0.75, 8, 1, true),
  flame: new THREE.ConeGeometry(0.18, 0.95, 8),
  flameLarge: new THREE.ConeGeometry(0.38, 2.2, 8),
  heavyHull: new THREE.BoxGeometry(1.9, 0.9, 3.2),
  bossWing: new THREE.BoxGeometry(2.4, 0.12, 1.1),
  coreLarge: new THREE.SphereGeometry(0.65, 16, 12),

  // --- Các khối cơ bản kế thừa & Boss ---
  dart: new THREE.OctahedronGeometry(0.55, 0), fin: new THREE.BoxGeometry(0.9, 0.05, 0.3), eye: new THREE.SphereGeometry(0.13, 10, 8),
  ico: new THREE.IcosahedronGeometry(0.5, 0), ring: new THREE.TorusGeometry(0.85, 0.06, 8, 40), spike: new THREE.ConeGeometry(0.12, 0.5, 8),
  blob: new THREE.IcosahedronGeometry(0.48, 1), core: new THREE.SphereGeometry(0.3, 14, 10),
  tankBody: new THREE.BoxGeometry(1.3, 0.8, 1.6), plate: new THREE.BoxGeometry(0.18, 0.7, 1.3), visor: new THREE.BoxGeometry(0.9, 0.18, 0.12), tread: new THREE.BoxGeometry(0.3, 0.35, 1.8),
  dodeca: new THREE.DodecahedronGeometry(1.5, 0), shell: new THREE.IcosahedronGeometry(2.3, 1), sat: new THREE.OctahedronGeometry(0.35, 0), bossRing: new THREE.TorusGeometry(4, 0.09, 8, 96),
  hex: new THREE.CylinderGeometry(1.05, 1.05, 1.7, 6), hplate: new THREE.BoxGeometry(1.05, 1.5, 0.22), crown: new THREE.ConeGeometry(0.16, 0.6, 6),
  beeBody: new THREE.SphereGeometry(0.36, 14, 10), beeBand: new THREE.TorusGeometry(0.33, 0.07, 6, 18), wingP: new THREE.PlaneGeometry(0.55, 0.3),
  egg: new THREE.SphereGeometry(0.55, 18, 14),
  rock: new THREE.DodecahedronGeometry(1.25, 0), chunk: new THREE.DodecahedronGeometry(0.28, 0),
  holeCore: new THREE.SphereGeometry(1.5, 28, 20), disk: new THREE.RingGeometry(1.7, 4.4, 72, 1), photon: new THREE.TorusGeometry(1.62, 0.05, 8, 64),
  crystal: new THREE.OctahedronGeometry(1.05, 0), mirror: new THREE.CylinderGeometry(1.75, 1.75, 2.7, 28, 1, true, -Math.PI / 2, Math.PI),
  staff: new THREE.TorusGeometry(3.4, 0.04, 6, 80),
  noteHead: new THREE.SphereGeometry(0.45, 16, 12), stem: new THREE.BoxGeometry(0.1, 0.08, 1.4), flag: new THREE.BoxGeometry(0.5, 0.06, 0.14),
  hood: new THREE.SphereGeometry(0.95, 20, 14, 0, TAU, 0, Math.PI / 2), cloak: new THREE.ConeGeometry(1, 2.2, 20, 1, true),
  palm: new THREE.BoxGeometry(1.4, 0.4, 1.15), knuckle: new THREE.SphereGeometry(0.16, 10, 8), seg: new THREE.BoxGeometry(0.22, 0.22, 0.55), wrist: new THREE.CylinderGeometry(0.45, 0.55, 0.7, 12),
  disc: new THREE.CylinderGeometry(3.2, 3.2, 0.35, 64), rim: new THREE.TorusGeometry(3.25, 0.13, 10, 96), tick: new THREE.BoxGeometry(0.16, 0.12, 0.6), gem: new THREE.OctahedronGeometry(0.55, 0),
  bubble: new THREE.SphereGeometry(4, 32, 20),
  dhead: new THREE.OctahedronGeometry(1, 0), horn: new THREE.ConeGeometry(0.16, 0.9, 8), dseg: new THREE.SphereGeometry(0.8, 16, 12), dspike: new THREE.ConeGeometry(0.16, 0.55, 6),
  mine: new THREE.IcosahedronGeometry(0.4, 0), mspike: new THREE.ConeGeometry(0.08, 0.35, 6)
};

const clefCurve = new THREE.CatmullRomCurve3([
  [0.15, -2.3], [-0.25, -2.35], [-0.45, -2.05], [-0.25, -1.8], [0.05, -1.95], [0, -1.2], [-0.05, 0], [0.1, 1.2],
  [0.45, 1.9], [0.3, 2.4], [-0.1, 2.1], [-0.2, 1.4], [0.1, 0.6], [0.6, 0], [0.7, -0.6], [0.3, -1], [-0.3, -0.9],
  [-0.55, -0.4], [-0.35, 0.15], [0.1, 0.3], [0.35, 0.05], [0.25, -0.35], [-0.05, -0.4]
].map(([x, y]) => new V3(x * 1.05, 0, -y * 1.05)));
EG.clef = new THREE.TubeGeometry(clefCurve, 200, 0.14, 10, false);

function stdMat(col, ei = 0.55, metal = 0.55, rough = 0.3, base = 0.35, extra) {
  return new THREE.MeshStandardMaterial(Object.assign({ color: darken(col, base), emissive: col, emissiveIntensity: ei, metalness: metal, rough: rough, flatShading: true }, extra || {}));
}

/* ---------- Đạn & Tinh thể (Bullets & Gems) ---------- */
const bulletGeo = new THREE.SphereGeometry(0.2, 12, 8);
const PB = pool(() => {
  const m = new THREE.Group();
  const core = new THREE.Mesh(bulletGeo, new THREE.MeshBasicMaterial({ color: 0xfff6dc }));
  const gl = glow(0xffb547, 1, 0.55, true);
  m.add(core, gl);
  scene.add(m);
  return new PlayerBullet(m, core, gl);
});
const EB = pool(() => {
  const m = new THREE.Group();
  const core = new THREE.Mesh(bulletGeo, new THREE.MeshBasicMaterial({ color: 0xffd6ec }));
  const gl = glow(0xff3fa4, 2.1, 1);
  m.add(core, gl);
  scene.add(m);
  return new EnemyBullet(m, core, gl);
});

const gemGeo = new THREE.OctahedronGeometry(0.24);
const gemMat = new THREE.MeshStandardMaterial({ color: 0x6dffd6, emissive: 0x2fe0b5, emissiveIntensity: 1.3, metalness: 0.3, roughness: 0.1, flatShading: true });
const GM = pool(() => {
  const m = new THREE.Mesh(gemGeo, gemMat);
  m.add(glow(0x6dffd6, 1.4, 0.75));
  scene.add(m);
  return { m, v: new V3(), val: 1, t: 0 };
});

/* ---------- Vật phẩm Chiến trường (Battlefield Pickups Pool) ---------- */
const PK_TYPES = {
  heal:   { col: 0x22ff88, label: 'NANO HEAL',  msg: '+40 GIÁP' },
  magnet: { col: 0x00d4ff, label: 'MAGNET',     msg: 'HÚT SẠCH TINH THỂ' },
  nuke:   { col: 0xff3322, label: 'EMP NUKE',   msg: 'QUÉT SẠCH CHIẾN TRƯỜNG' },
  boost:  { col: 0xffd23a, label: 'SUPERCHARGE',msg: 'X2 SÁT THƯƠNG (10s)' }
};

const pkGeoBox = new THREE.BoxGeometry(0.32, 0.32, 0.32);
const pkGeoCrossH = new THREE.BoxGeometry(0.42, 0.12, 0.14);
const pkGeoCrossV = new THREE.BoxGeometry(0.12, 0.42, 0.14);
const pkGeoSphere = new THREE.SphereGeometry(0.22, 12, 10);
const pkGeoTorus = new THREE.TorusGeometry(0.38, 0.045, 8, 24);
const pkGeoIco = new THREE.IcosahedronGeometry(0.26, 0);
const pkGeoOcta = new THREE.OctahedronGeometry(0.28, 0);

const PK = pool(() => {
  const m = new THREE.Group();
  const inner = new THREE.Group();
  m.add(inner);

  const gl = glow(0x22ff88, 1.8, 0.85);
  m.add(gl);

  const rMat = new THREE.MeshBasicMaterial({ color: 0x22ff88, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
  const floorRing = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.6, 24), rMat);
  floorRing.rotation.x = -Math.PI / 2;
  floorRing.position.y = -0.38;
  m.add(floorRing);

  // Mesh con cho từng loại
  const matHeal = new THREE.MeshStandardMaterial({ color: 0x00aa44, emissive: 0x22ff88, emissiveIntensity: 1.2, flatShading: true });
  const meshHeal = new THREE.Group();
  meshHeal.add(new THREE.Mesh(pkGeoBox, matHeal));
  meshHeal.add(new THREE.Mesh(pkGeoCrossH, matHeal));
  meshHeal.add(new THREE.Mesh(pkGeoCrossV, matHeal));
  inner.add(meshHeal);

  const matMag = new THREE.MeshStandardMaterial({ color: 0x0066cc, emissive: 0x00d4ff, emissiveIntensity: 1.4, flatShading: true });
  const meshMag = new THREE.Group();
  meshMag.add(new THREE.Mesh(pkGeoSphere, matMag));
  const tRing = new THREE.Mesh(pkGeoTorus, matMag);
  tRing.rotation.x = 0.8;
  meshMag.add(tRing);
  inner.add(meshMag);

  const matNuke = new THREE.MeshStandardMaterial({ color: 0xcc2200, emissive: 0xff3322, emissiveIntensity: 1.5, flatShading: true });
  const meshNuke = new THREE.Group();
  meshNuke.add(new THREE.Mesh(pkGeoIco, matNuke));
  inner.add(meshNuke);

  const matBoost = new THREE.MeshStandardMaterial({ color: 0xcc9900, emissive: 0xffd23a, emissiveIntensity: 1.5, flatShading: true });
  const meshBoost = new THREE.Group();
  meshBoost.add(new THREE.Mesh(pkGeoOcta, matBoost));
  inner.add(meshBoost);

  scene.add(m);
  return new PickupItem(m, inner, gl, floorRing, {
    heal: meshHeal,
    magnet: meshMag,
    nuke: meshNuke,
    boost: meshBoost
  });
});

function spawnPickup(type, x, z) {
  const p = PK.get();
  p.spawn(type, x, z);
  return p;
}

function collectPickup(p, s) {
  p.collect(s);
  PK.free(p);
}

function updPickups(dt) {
  for (const p of PK.items) {
    if (!p.on) continue;
    if (!p.update(dt)) {
      PK.free(p);
      continue;
    }
    const pos = p.pos;
    for (const s of ships.values()) {
      if (s.dead || s.downed) continue;
      const dx = s.pos.x - pos.x, dz = s.pos.z - pos.z;
      if (dx * dx + dz * dz < 1.35 * 1.35) {
        collectPickup(p, s);
        break;
      }
    }
  }
}

let bSeq = 0, ebSeq = 0, eSeq = 0;
const netPB = new Map(), netEB = new Map();
const enemies = [];
const netEn = new Map();

function buildEnemy(type) {
  const t = T[type], col = t.col;
  const m = new THREE.Group(), inner = new THREE.Group(); m.add(inner);
  const mats = [], P = {}, fade = [];
  let mat = stdMat(col); mats.push(mat);
  const add = (geo, material, x = 0, y = 0, z = 0, parent = inner) => {
    const o = new THREE.Mesh(geo, material);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };

  switch (type) {
    case 'chaser': case 'mini': {
      // CHIẾN CƠ TIÊM KÍCH CẬN CHIẾN (Dart Raider)
      const s = type === 'mini' ? 0.55 : 1, c = type === 'mini' ? 0x2fe0b5 : col;
      const hullM = stdMat(0x1a1622, 0.12, 0.85, 0.25); mats.push(hullM);
      const armorM = stdMat(c, 0.65, 0.75, 0.2); mats.push(armorM);
      const cockM = basicGlow(0x7af7ff); mats.push(cockM);
      const flameM = basicGlow(lighten(c, 0.55), 0.95); mats.push(flameM);

      // Thân máy bay chính (Fuselage)
      const b = add(EG.shipHull, hullM); b.scale.set(0.7 * s, 0.45 * s, 1.2 * s);
      b.add(edgeLines(EG.shipHull, lighten(c, 0.5), 0.85));

      // Mũi tiêm kích sắc nhọn hướng về phía trước (+Z)
      const nose = add(EG.shipNose, armorM, 0, 0, 0.9 * s);
      nose.rotation.x = Math.PI / 2; nose.scale.set(0.7 * s, 0.85 * s, 0.7 * s);

      // Buồng lái kính năng lượng
      const cock = add(EG.cockpit, cockM, 0, 0.15 * s, 0.2 * s); cock.scale.setScalar(s);

      // Cánh ngược vát nhọn Forward-Swept Wings 2 bên
      for (const sx of [-1, 1]) {
        const w = add(EG.wingMain, armorM, sx * 0.65 * s, 0, 0.1 * s);
        w.rotation.y = sx * -0.3; w.rotation.z = sx * 0.1;
        w.scale.set(0.8 * s, 1, 0.8 * s);
        w.add(edgeLines(EG.wingMain, lighten(c, 0.7), 0.9));

        // Nòng súng ở đầu cánh
        const gun = add(EG.cannon, hullM, sx * 0.95 * s, -0.02 * s, 0.4 * s);
        gun.rotation.x = Math.PI / 2; gun.scale.set(0.6 * s, 0.65 * s, 0.6 * s);

        // Ống xả phản lực phía sau (-Z)
        const nz = add(EG.nozzle, hullM, sx * 0.28 * s, 0, -0.65 * s);
        nz.rotation.x = -Math.PI / 2; nz.scale.setScalar(s);

        // Luồng lửa phản lực phụt ra phía sau (-Z)
        const fl = add(EG.flame, flameM, sx * 0.28 * s, 0, -0.85 * s);
        fl.rotation.x = -Math.PI / 2; fl.scale.setScalar(s);
        if (!P.flames) P.flames = [];
        P.flames.push(fl);
      }

      // Cánh đuôi đứng
      const tail = add(EG.finVert, armorM, 0, 0.28 * s, -0.45 * s);
      tail.scale.setScalar(s);

      inner.add(glow(c, 2.5 * s, 0.45)); break;
    }
    case 'shooter': {
      // TUẦN DƯƠNG PHÁO KÍCH (Corsair Artillery Gunboat)
      const hullM = stdMat(0x181228, 0.15, 0.85, 0.25); mats.push(hullM);
      const armorM = stdMat(col, 0.7, 0.7, 0.2); mats.push(armorM);
      const glowM = basicGlow(lighten(col, 0.5), 0.95); mats.push(glowM);

      // Thân tàu góc cạnh dạng tam giác Delta
      const b = add(EG.shipHull, hullM); b.scale.set(1.1, 0.5, 1.4);
      b.add(edgeLines(EG.shipHull, lighten(col, 0.6), 0.9));

      // Buồng lái kính năng lượng
      add(EG.cockpit, basicGlow(0xffffff), 0, 0.2, 0.3).scale.set(1.1, 0.8, 1);

      // Vòng năng lượng gia tốc nạp đạn xoay trên lưng
      P.ring = add(EG.ring, glowM, 0, 0.25, -0.1);
      P.ring.rotation.x = Math.PI / 2.3; P.ring.scale.setScalar(0.75);

      // 2 Tháp pháo đại bác vươn dài phía trước (+Z)
      P.sp = new THREE.Group(); inner.add(P.sp);
      for (const sx of [-0.65, 0.65]) {
        const pod = add(EG.armorPlate, armorM, sx, 0, 0.2); pod.scale.set(0.8, 1.2, 0.9);
        const barrel = add(EG.heavyCannon, glowM, sx, 0.05, 0.95);
        barrel.rotation.x = Math.PI / 2; barrel.scale.set(0.85, 1.1, 0.85);

        // Động cơ phản lực phía sau
        const nz = add(EG.nozzle, hullM, sx * 0.7, 0, -0.75);
        nz.rotation.x = -Math.PI / 2;
        const fl = add(EG.flame, glowM, sx * 0.7, 0, -1.05);
        fl.rotation.x = -Math.PI / 2;
        if (!P.flames) P.flames = [];
        P.flames.push(fl);
      }

      // Lõi năng lượng trung tâm
      const core = add(EG.core, basicGlow(0xffffff), 0, 0, 0); core.scale.setScalar(0.65);
      inner.add(glow(col, 3.2, 0.5)); break;
    }
    case 'splitter': {
      // CHIẾN HẠM PHÂN TÁCH (Trident Carrier)
      const hullM = stdMat(0x102528, 0.15, 0.85, 0.22); mats.push(hullM);
      const armorM = stdMat(col, 0.7, 0.7, 0.2); mats.push(armorM);
      const glowM = basicGlow(lighten(col, 0.4), 0.95); mats.push(glowM);

      P.blobs = [];
      // Module trung tâm
      const mid = add(EG.shipHull, hullM, 0, 0, 0.2); mid.scale.set(0.65, 0.5, 1.5);
      mid.add(edgeLines(EG.shipHull, lighten(col, 0.6), 0.9));
      const midNose = add(EG.shipNose, armorM, 0, 0, 1.1);
      midNose.rotation.x = Math.PI / 2; midNose.scale.set(0.6, 0.7, 0.6);
      P.blobs.push(mid);

      // 2 Module hộ tống 2 bên sườn
      for (const sx of [-0.75, 0.75]) {
        const wingPod = add(EG.shipHull, armorM, sx, 0, -0.15);
        wingPod.scale.set(0.55, 0.4, 1.2);
        wingPod.add(edgeLines(EG.shipHull, 0xffffff, 0.75));

        const pNose = add(EG.shipNose, glowM, sx, 0, 0.55);
        pNose.rotation.x = Math.PI / 2; pNose.scale.set(0.45, 0.55, 0.45);

        // Cầu năng lượng liên kết với thân chính
        const pylon = add(EG.finHoriz, glowM, sx * 0.5, 0, 0);
        pylon.scale.set(0.7, 1, 0.7);

        // Động cơ
        const fl = add(EG.flame, glowM, sx, 0, -0.85);
        fl.rotation.x = -Math.PI / 2; fl.scale.setScalar(0.75);
        if (!P.flames) P.flames = [];
        P.flames.push(fl);
        P.blobs.push(wingPod);
      }

      // Động cơ thân chính
      const mainFl = add(EG.flame, glowM, 0, 0, -0.65);
      mainFl.rotation.x = -Math.PI / 2;
      if (!P.flames) P.flames = [];
      P.flames.push(mainFl);

      const core = add(EG.core, basicGlow(0xd8fff6), 0, 0.15, 0.1);
      core.scale.setScalar(0.7);
      inner.add(glow(col, 3.5, 0.55)); break;
    }
    case 'tank': {
      // THIẾT GIÁP HẠM PHÒNG TUYẾN (Titan Dreadnought)
      const hullM = stdMat(0x281a0e, 0.2, 0.9, 0.22); mats.push(hullM);
      const armorM = stdMat(col, 0.65, 0.8, 0.25); mats.push(armorM);
      const glowM = basicGlow(0xffc247, 1.0); mats.push(glowM);
      const flameM = basicGlow(0xff6622, 0.95); mats.push(flameM);

      // Thân thiết giáp bọc thép đa giác nặng (Heavy Armored Hull)
      const b = add(EG.heavyHull, hullM); b.scale.set(0.85, 0.75, 0.85);
      b.add(edgeLines(EG.heavyHull, lighten(col, 0.5), 0.9));

      // Khiên giáp mũi phía trước (+Z)
      const ram = add(EG.armorPlate, armorM, 0, 0, 1.25);
      ram.scale.set(2.4, 1.5, 0.6); ram.add(edgeLines(EG.armorPlate, 0xffe27a, 0.95));

      // Kính buồng lái bọc giáp viền hẹp
      add(EG.cockpit, glowM, 0, 0.32, 0.5).scale.set(1.4, 0.45, 0.7);

      // 2 Tháp pháo đại bác nòng đôi hạng nặng 2 bên sườn
      for (const sx of [-0.85, 0.85]) {
        const pod = add(EG.armorPlate, armorM, sx, 0.1, 0.1); pod.scale.set(0.9, 1.2, 1.2);
        pod.add(edgeLines(EG.armorPlate, lighten(col, 0.4), 0.8));

        // Nòng pháo đôi
        for (const offY of [-0.08, 0.12]) {
          const gun = add(EG.heavyCannon, hullM, sx, offY, 0.95);
          gun.rotation.x = Math.PI / 2; gun.scale.set(0.8, 1.2, 0.8);
          gun.add(edgeLines(EG.heavyCannon, glowM.color, 0.6));
        }

        // 4 Cụm ống xả phản lực đuôi
        for (const offX of [-0.15, 0.15]) {
          const nz = add(EG.nozzle, hullM, sx + offX * 0.5, 0, -1.25);
          nz.rotation.x = -Math.PI / 2;
          const fl = add(EG.flame, flameM, sx + offX * 0.5, 0, -1.55);
          fl.rotation.x = -Math.PI / 2;
          if (!P.flames) P.flames = [];
          P.flames.push(fl);
        }
      }

      inner.add(glow(col, 4.2, 0.5)); break;
    }
    case 'boss': case 'ultimate': {
      // KỲ HẠM CHỈ HUY (Raptor Sovereign - Chuẩn theo Chiến Cơ Huyền Thoại)
      const k = type === 'ultimate' ? 1.35 : 1;
      const colBase = type === 'ultimate' ? 0xff2a7a : 0xb52222; // Đỏ đồng kim loại như ảnh chụp!
      const hullM = stdMat(0x1a0d10, 0.2, 0.9, 0.2); mats.push(hullM);
      const armorM = stdMat(colBase, 0.75, 0.8, 0.22); mats.push(armorM);
      const coreGlow = basicGlow(0xffb547, 1.2); mats.push(coreGlow);
      const laserGlow = basicGlow(0xff4477, 1.0); mats.push(laserGlow);
      const thrusterFlame = basicGlow(0x33b8ff, 1.1); mats.push(thrusterFlame); // Lửa phản lực xanh như ảnh!

      // 1. Thân chính chiến hạm mẹ khổng lồ (Command Fuselage)
      const hull = add(EG.heavyHull, hullM); hull.scale.set(1.4 * k, 1.1 * k, 1.3 * k);
      hull.add(edgeLines(EG.heavyHull, 0xff7766, 0.9));

      // 2. Hai càng giáp nhọn vươn dài về phía trước ở mũi tàu (+Z) - Y hệt con Boss Raptor trong ảnh!
      for (const sx of [-1, 1]) {
        const mandible = add(EG.mandible, armorM, sx * 0.95 * k, -0.05 * k, 1.45 * k);
        mandible.scale.set(1.4 * k, 1.2 * k, 1.4 * k);
        mandible.rotation.y = sx * -0.08;
        mandible.add(edgeLines(EG.mandible, 0xff9988, 0.95));

        // Mũi nhọn càng trước
        const tip = add(EG.shipNose, armorM, sx * 0.95 * k, -0.05 * k, 2.3 * k);
        tip.rotation.x = Math.PI / 2; tip.scale.set(0.6 * k, 0.9 * k, 0.6 * k);
      }

      // 3. Cánh chiến hạm bọc giáp đa tầng (Heavy Armored Wings)
      for (const sx of [-1, 1]) {
        const wing = add(EG.bossWing, armorM, sx * 1.6 * k, 0.05 * k, -0.15 * k);
        wing.rotation.y = sx * -0.18; wing.rotation.z = sx * 0.08;
        wing.scale.set(0.9 * k, 1.2 * k, 1.1 * k);
        wing.add(edgeLines(EG.bossWing, 0xffaaaa, 0.85));

        // Cánh tà ổn định ở chóp cánh
        const wingFin = add(EG.finVert, armorM, sx * 2.7 * k, 0.3 * k, -0.3 * k);
        wingFin.scale.set(1.5 * k, 1.4 * k, 1.3 * k);

        // Dàn pháo đại bác laser hạng nặng chĩa về phía trước
        const cannon1 = add(EG.heavyCannon, hullM, sx * 1.35 * k, -0.12 * k, 1.1 * k);
        cannon1.rotation.x = Math.PI / 2; cannon1.scale.set(1.1 * k, 1.5 * k, 1.1 * k);
        cannon1.add(edgeLines(EG.heavyCannon, laserGlow.color, 0.8));

        const cannon2 = add(EG.heavyCannon, hullM, sx * 1.85 * k, -0.12 * k, 0.8 * k);
        cannon2.rotation.x = Math.PI / 2; cannon2.scale.set(0.9 * k, 1.3 * k, 0.9 * k);
      }

      // 4. Lõi phản ứng buồng chỉ huy phát sáng ở trung tâm (Lõi vàng cam rực rỡ như ảnh!)
      P.core = add(EG.coreLarge, coreGlow, 0, 0.42 * k, 0.15 * k);
      P.core.scale.set(1.3 * k, 0.9 * k, 1.6 * k);

      // 5. Cụm 4 Động cơ phản lực cỡ đại ở đuôi (-Z) phụt lửa phản lực khổng lồ
      for (const sx of [-0.65, -0.22, 0.22, 0.65]) {
        const nz = add(EG.nozzleLarge, hullM, sx * k, 0, -1.75 * k);
        nz.rotation.x = -Math.PI / 2; nz.scale.setScalar(0.85 * k);

        const fl = add(EG.flameLarge, thrusterFlame, sx * k, 0, -2.65 * k);
        fl.rotation.x = -Math.PI / 2; fl.scale.set(0.9 * k, 1.3 * k, 0.9 * k);
        if (!P.flames) P.flames = [];
        P.flames.push(fl);
      }

      // 6. Vệ tinh chiến thuật & Vòng năng lượng hộ vệ
      P.shell = add(EG.bossRing, new THREE.MeshBasicMaterial({ color: 0xff4477, wireframe: true, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
      P.shell.rotation.x = Math.PI / 2; P.shell.scale.setScalar(0.75 * k); mats.push(P.shell.material);

      P.sats = new THREE.Group(); inner.add(P.sats);
      for (let i = 0; i < (type === 'ultimate' ? 5 : 3); i++) {
        const s = add(EG.sat, basicGlow(0x6eefff), Math.sin(i * TAU / 3) * 3.4 * k, 0.2 * k, Math.cos(i * TAU / 3) * 3.4 * k, P.sats);
        s.add(glow(colBase, 1.6 * k, 0.85));
      }

      P.ringM = new THREE.Mesh(EG.bossRing, basicGlow(lighten(colBase, 0.4), 0.9));
      P.ringM.rotation.x = Math.PI / 2; P.ringM.scale.setScalar(k); scene.add(P.ringM);
      if (type === 'ultimate') {
        P.ring2 = add(EG.bossRing, basicGlow(0xffc04d, 0.85)); P.ring2.scale.setScalar(0.9 * k);
      }

      inner.add(glow(colBase, 10 * k, 0.6)); break;
    }
    case 'queen': {
      const core = add(EG.hex, mat); core.add(edgeLines(EG.hex, lighten(col, 0.6)));
      const pm = stdMat(0xff8a00, 0.35, 0.85, 0.25, 0.55); mats.push(pm);
      P.plates = [];
      for (let i = 0; i < 6; i++) {
        const g = new THREE.Group(); g.rotation.y = i * TAU / 6; inner.add(g);
        const p = add(EG.hplate, pm, 0, 0, 1.35, g); p.add(edgeLines(EG.hplate, 0xffd27a, 0.8)); P.plates.push(p);
      }
      for (let i = 0; i < 6; i++) {
        const c = add(EG.crown, basicGlow(0xffe08a), Math.sin(i * TAU / 6) * 0.7, 1.15, Math.cos(i * TAU / 6) * 0.7);
        c.rotation.z = Math.sin(i * TAU / 6) * 0.3;
      }
      P.core = add(EG.core, basicGlow(0xffffff), 0, 0, 0); P.core.scale.setScalar(1.6); P.core.add(glow(0xffb020, 5, 0.9));
      inner.add(glow(col, 8, 0.4)); break;
    }
    case 'bee': {
      // CHIẾN CƠ TIÊM KÍCH ĐÁNH CHẶN (Interceptor Drone)
      const hullM = stdMat(0x1a1508, 0.2, 0.85, 0.25); mats.push(hullM);
      const armorM = stdMat(col, 0.75, 0.7, 0.2); mats.push(armorM);
      const glowM = basicGlow(0xffe08a); mats.push(glowM);

      const b = add(EG.shipHull, hullM); b.scale.set(0.65, 0.45, 1.0);
      const nose = add(EG.shipNose, armorM, 0, 0, 0.7);
      nose.rotation.x = Math.PI / 2; nose.scale.set(0.5, 0.65, 0.5);

      add(EG.cockpit, glowM, 0, 0.15, 0.1).scale.set(0.7, 0.7, 0.7);

      P.wings = [];
      for (const sx of [-1, 1]) {
        const w = add(EG.wingMain, armorM, sx * 0.4, 0.05, -0.1);
        w.rotation.x = 0; w.rotation.y = sx * -0.25; w.scale.set(0.65, 1, 0.7);
        w.add(edgeLines(EG.wingMain, 0xffe27a, 0.9));
        P.wings.push(w);
      }

      const nz = add(EG.nozzle, hullM, 0, 0, -0.55);
      nz.rotation.x = -Math.PI / 2; nz.scale.setScalar(0.7);
      const fl = add(EG.flame, glowM, 0, 0, -0.85);
      fl.rotation.x = -Math.PI / 2; fl.scale.setScalar(0.7);
      if (!P.flames) P.flames = [];
      P.flames.push(fl);

      inner.add(glow(col, 2.0, 0.6)); break;
    }
    case 'egg': {
      mat.dispose(); mats.length = 0;
      mat = new THREE.MeshStandardMaterial({ color: 0xfff2c8, emissive: 0xffc860, emissiveIntensity: 0.5, roughness: 0.35, metalness: 0.1, transparent: true, opacity: 0.92 });
      mats.push(mat);
      const e = add(EG.egg, mat); e.scale.set(1, 1.2, 1);
      P.glow = glow(0xffb020, 1.6, 0.9, true); inner.add(P.glow); mats.push(P.glow.material); break;
    }
    case 'golem': {
      mat.dispose(); mats.length = 0;
      mat = new THREE.MeshStandardMaterial({ color: 0x3b2a24, emissive: 0xff5a1a, emissiveIntensity: 0.25, roughness: 0.85, metalness: 0.15, flatShading: true });
      mats.push(mat);
      const r = add(EG.rock, mat); r.scale.set(1.15, 1, 1.1); r.add(edgeLines(EG.rock, 0xff7a2a, 0.95));
      P.core = add(EG.core, basicGlow(0xffb060), 0, 0.1, 0); P.core.scale.setScalar(1.3); P.core.add(glow(0xff6a1a, 4.5, 0.8));
      P.chunks = new THREE.Group(); inner.add(P.chunks);
      for (let i = 0; i < 5; i++) {
        const c = add(EG.chunk, mat, Math.sin(i * TAU / 5) * 2, rnd(-0.4, 0.6), Math.cos(i * TAU / 5) * 2, P.chunks);
        c.add(edgeLines(EG.chunk, 0xff7a2a, 0.8));
      }
      break;
    }
    case 'hole': {
      add(EG.holeCore, new THREE.MeshBasicMaterial({ color: 0x000000 }));
      P.diskMat = new THREE.ShaderMaterial({
        uniforms: { uT: { value: 0 }, uS: { value: 0 } },
        vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `varying vec2 vUv;uniform float uT,uS;void main(){vec2 p=vUv-.5;float r=length(p)*2.;float a=atan(p.y,p.x);float sw=.5+.5*sin(a*3.+r*12.-uT*(3.+uS*7.));float fall=smoothstep(1.,.45,r)*smoothstep(.37,.43,r);vec3 c=mix(vec3(.62,.28,1.),vec3(1.,.38,.18),uS);gl_FragColor=vec4(c*(.35+sw*.9)*fall*1.5,fall);}`,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
      });
      mats.push(P.diskMat);
      P.disk = add(EG.disk, P.diskMat); P.disk.rotation.x = -Math.PI / 2 + 0.25;
      P.photon = add(EG.photon, basicGlow(0xe6d0ff)); P.photon.rotation.x = Math.PI / 2;
      P.glow = glow(0x9a4dff, 9, 0.6, true); inner.add(P.glow); mats.push(P.glow.material); break;
    }
    case 'twinA': case 'twinB': {
      const a = type === 'twinA';
      mat.dispose(); mats.length = 0;
      mat = new THREE.MeshStandardMaterial({ color: a ? 0xc8d4ea : 0x2a1650, emissive: a ? 0x9fb8ff : 0x6a3dff, emissiveIntensity: 0.45, metalness: 0.9, roughness: 0.15, flatShading: true, transparent: true, opacity: 1 });
      mats.push(mat); fade.push([mat, 1]);
      const c = add(EG.crystal, mat); c.scale.set(1, 1.65, 1); c.add(edgeLines(EG.crystal, a ? 0xffffff : 0xb69bff));
      P.mirror = add(EG.mirror, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xbfe8ff, emissiveIntensity: 0.55, metalness: 1, roughness: 0.05, transparent: true, opacity: 0.75, side: THREE.DoubleSide }));
      mats.push(P.mirror.material);
      P.mirror.add(edgeLines(EG.mirror, 0xffffff, 0.9));
      P.mglow = glow(0xffffff, 2.6, 0.8); P.mglow.position.set(0, 0, 1.8); inner.add(P.mglow);
      inner.add(glow(a ? 0xbfd8ff : 0x8a5cff, 6, 0.45)); break;
    }
    case 'maestro': {
      mat.dispose(); mats.length = 0;
      mat = new THREE.MeshStandardMaterial({ color: 0x8a5a10, emissive: 0xffb020, emissiveIntensity: 0.55, metalness: 0.7, roughness: 0.2 });
      mats.push(mat);
      P.clef = add(EG.clef, mat); P.clef.scale.setScalar(1.25);
      P.staffs = [];
      for (let i = 0; i < 3; i++) {
        const s = add(EG.staff, basicGlow(0xffe6a8, 0.4)); s.rotation.x = Math.PI / 2; s.scale.setScalar(1 + i * 0.12); P.staffs.push(s);
      }
      P.glow = glow(0xffc040, 7, 0.22, true); inner.add(P.glow); mats.push(P.glow.material); break;
    }
    case 'note': {
      mat.dispose(); mats.length = 0;
      mat = new THREE.MeshStandardMaterial({ color: 0x103040, emissive: 0x6ef0ff, emissiveIntensity: 1.3, metalness: 0.5, roughness: 0.2 });
      mats.push(mat);
      const h = add(EG.noteHead, mat, 0, 0, 0.5); h.scale.set(1.3, 0.55, 1); h.rotation.y = 0.4;
      add(EG.stem, mat, 0.5, 0, -0.15); const f = add(EG.flag, mat, 0.72, 0, -0.78); f.rotation.y = -0.5;
      P.glow = glow(0x6ef0ff, 3.4, 0.7, true); inner.add(P.glow); mats.push(P.glow.material); inner.scale.setScalar(1.35); break;
    }
    case 'ghost': case 'decoy': {
      mat.dispose(); mats.length = 0;
      mat = new THREE.MeshStandardMaterial({ color: 0x2a1650, emissive: 0xb07bff, emissiveIntensity: 0.8, metalness: 0.2, roughness: 0.4, transparent: true, opacity: 1, side: THREE.DoubleSide, depthWrite: false });
      mats.push(mat); fade.push([mat, 0.85]);
      const hd = add(EG.hood, mat, 0, 0.35, 0); hd.scale.set(1, 1.1, 1);
      const cl = add(EG.cloak, mat, 0, -0.75, 0); cl.rotation.x = Math.PI;
      const em = basicGlow(0xff6bd6, 1); mats.push(em); fade.push([em, 1]);
      for (const sx of [-0.32, 0.32]) add(EG.eye, em, sx, 0.45, 0.78).scale.set(1.4, 0.7, 0.7);
      P.aura = glow(0xb07bff, 6, 0.5, true); inner.add(P.aura); mats.push(P.aura.material); fade.push([P.aura.material, 0.5]); break;
    }
    case 'thief': {
      mat.dispose(); mats.length = 0;
      mat = new THREE.MeshStandardMaterial({ color: 0x1d3a2a, emissive: 0x3dff8a, emissiveIntensity: 0.35, metalness: 0.85, roughness: 0.25, flatShading: true });
      mats.push(mat);
      const palm = add(EG.palm, mat); palm.add(edgeLines(EG.palm, 0x7dffb0));
      add(EG.wrist, mat, 0, 0, -0.85).rotation.x = Math.PI / 2;
      const jm = basicGlow(0x7dffb0); mats.push(jm);
      P.fingers = [];
      for (let i = 0; i < 4; i++) {
        const g = new THREE.Group(); g.position.set(-0.5 + i * 0.33, 0, 0.58); inner.add(g);
        add(EG.knuckle, jm, 0, 0, 0, g); const s1 = add(EG.seg, mat, 0, 0, 0.32, g);
        const g2 = new THREE.Group(); g2.position.z = 0.6; g.add(g2);
        add(EG.knuckle, jm, 0, 0, 0, g2).scale.setScalar(0.8); add(EG.seg, mat, 0, 0, 0.28, g2).scale.set(0.9, 0.9, 0.85);
        P.fingers.push([g, g2]);
      }
      const th = new THREE.Group(); th.position.set(0.75, 0, 0.1); th.rotation.y = -1.1; inner.add(th);
      add(EG.knuckle, jm, 0, 0, 0, th); add(EG.seg, mat, 0, 0, 0.32, th); P.thumb = th;
      inner.add(glow(0x3dff8a, 6, 0.45)); break;
    }
    case 'clock': {
      mat.dispose(); mats.length = 0;
      mat = new THREE.MeshStandardMaterial({ color: 0x101a2e, emissive: 0x2a8cff, emissiveIntensity: 0.25, metalness: 0.85, roughness: 0.25 });
      mats.push(mat);
      add(EG.disc, mat);
      add(EG.rim, basicGlow(0x7ad7ff, 0.95), 0, 0.18, 0).rotation.x = Math.PI / 2;
      for (let i = 0; i < 12; i++) {
        const tk = add(EG.tick, basicGlow(i % 3 ? 0x7ad7ff : 0xffffff), Math.sin(i * TAU / 12) * 2.7, 0.22, Math.cos(i * TAU / 12) * 2.7);
        tk.rotation.y = i * TAU / 12;
      }
      P.gem = add(EG.gem, basicGlow(0xffffff), 0, 0.6, 0); P.gem.add(glow(0x7ad7ff, 3.5, 0.9));
      P.hour = new THREE.Mesh(handGeo, beamMat(0xffc04d)); P.hour.position.y = 0.5; P.hour.scale.set(2, 1, R); m.add(P.hour); mats.push(P.hour.material);
      P.min = new THREE.Mesh(handGeo, beamMat(0x6ef0ff)); P.min.position.y = 0.55; P.min.scale.set(0.75, 1, R); m.add(P.min); mats.push(P.min.material);
      P.hour.material.uniforms.uFire.value = 0.85; P.min.material.uniforms.uFire.value = 0.9;
      inner.add(glow(0x7ad7ff, 10, 0.35)); break;
    }
    case 'bubble': {
      mat.dispose(); mats.length = 0; mat = fresnelMat(0x8fd8ff, 2.0, 0.75); mats.push(mat);
      P.b = add(EG.bubble, mat);
      const fill = new THREE.MeshBasicMaterial({ color: 0x6fb8ff, transparent: true, opacity: 0.07, depthWrite: false });
      mats.push(fill); add(EG.bubble, fill).scale.setScalar(0.98); break;
    }
    case 'dhead': {
      const h = add(EG.dhead, mat); h.scale.set(0.9, 0.6, 1.75); h.add(edgeLines(EG.dhead, 0xffb0f0));
      for (const sx of [-0.45, 0.45]) {
        const hn = add(EG.horn, stdMat(0xffffff, 0.6, 0.8, 0.2, 0.8), sx, 0.35, -0.7);
        hn.rotation.x = -Math.PI / 2.6; hn.rotation.z = -sx * 0.6; mats.push(hn.material);
      }
      const em = basicGlow(0xffffff);
      for (const sx of [-0.32, 0.32]) { const e = add(EG.eye, em, sx, 0.22, 0.95); e.add(glow(0xff3fd0, 1.4, 0.9)); }
      P.glow = glow(0xff3fd0, 5.5, 0.55, true); inner.add(P.glow); mats.push(P.glow.material); break;
    }
    case 'dseg': {
      mat.dispose(); mats.length = 0; mat = stdMat(0x8a5cff, 0.85, 0.4, 0.25, 0.4, { flatShading: false }); mats.push(mat);
      add(EG.dseg, mat).scale.set(1, 0.8, 1);
      for (const sx of [-0.3, 0.3]) { const sp = add(EG.dspike, basicGlow(0xff6bd6), sx, 0.65, 0); sp.rotation.z = -sx; }
      inner.add(glow(0xb07bff, 3, 0.5)); break;
    }
    case 'mine': {
      const b = add(EG.mine, mat); b.add(edgeLines(EG.mine, 0xff8899));
      for (let i = 0; i < 8; i++) {
        const sp = add(EG.mspike, mat); const a = i * TAU / 8;
        sp.position.set(Math.sin(a) * 0.42, i % 2 ? 0.15 : -0.1, Math.cos(a) * 0.42);
        sp.lookAt(sp.position.x * 3, sp.position.y * 3, sp.position.z * 3); sp.rotateX(Math.PI / 2);
      }
      P.glow = glow(0xff3355, 2.2, 0.9, true); inner.add(P.glow); mats.push(P.glow.material); break;
    }
  }
  m.scale.setScalar(0.01);
  scene.add(m);
  return { m, inner, mat, mats, P, fade, baseEI: mat.emissiveIntensity || 0 };
}

function disposeEnemy(e) {
  scene.remove(e.m);
  if (e.P && e.P.ringM) scene.remove(e.P.ringM);
  for (const m of e.mats) m.dispose();
}

function animEnemy(e, dt) {
  const P = e.P, t = tAll + (e.id % 17);
  if (e.punch > 0) { e.punch = Math.max(0, e.punch - dt * 7); }
  const pk = (1 + (e.punch || 0) * 0.14) * (e.type === 'note' ? 1.35 : 1);
  e.inner.scale.setScalar(pk);
  if (e.mat && e.mat.emissiveIntensity !== undefined && e.type !== 'bubble') {
    const f = (e.flashV || 0);
    e.mat.emissiveIntensity = e.baseEI + f * 2.6;
  }

  // Hiệu ứng luồng lửa động cơ phản lực phụt nhấp nháy theo thời gian thực
  if (P && P.flames && P.flames.length > 0) {
    const fPulse = 1 + 0.28 * Math.sin(t * 32);
    for (let i = 0; i < P.flames.length; i++) {
      P.flames[i].scale.y = fPulse * (1 + 0.14 * Math.sin(t * 45 + i * 2));
    }
  }

  switch (e.type) {
    case 'shooter':
      if (P.ring) P.ring.rotation.z += dt * 3;
      if (P.sp) P.sp.rotation.y += dt * 2;
      break;
    case 'splitter':
      if (P.blobs) P.blobs.forEach((b, i) => b.scale.setScalar(1 + 0.08 * Math.sin(t * 5 + i * 2)));
      break;
    case 'boss': case 'ultimate':
      P.shell.rotation.y += dt * 0.6; P.shell.rotation.x += dt * 0.25; P.sats.rotation.y += dt * 1.4;
      if (P.ringM) { P.ringM.position.set(e.m.position.x, 0.3, e.m.position.z); P.ringM.rotation.z += dt * 1.5; P.ringM.visible = e.m.visible; }
      if (P.ring2) P.ring2.rotation.y -= dt * 2;
      if (e.type === 'ultimate') {
        const ph = e.st || 1;
        e.mat.emissive.setHex(ph === 3 ? 0xff2020 : ph === 2 ? 0xffc04d : 0xff2a7a);
        P.shell.material.opacity = e.inv ? 0.75 : 0.35;
      }
      break;
    case 'queen': {
      const op = e.stV = (e.stV || 0) + ((e.st ? 1 : 0) - (e.stV || 0)) * Math.min(1, dt * 6);
      P.plates.forEach(p => { p.position.z = 1.35 + op * 0.95; p.rotation.x = -op * 0.55; });
      P.core.scale.setScalar(1.3 + op * 0.8 + Math.sin(t * 8) * 0.1 * op); e.inner.rotation.y += dt * 0.3; break;
    }
    case 'bee': P.wings.forEach((w, i) => w.rotation.z = Math.sin(t * 40 + i * Math.PI) * 0.6); break;
    case 'egg': {
      const a = e.a || 0;
      P.glow.scale.setScalar(1.4 + a * 1.8 + Math.sin(t * (6 + a * 20)) * 0.3 * a);
      P.glow.material.opacity = 0.5 + a * 0.5;
      e.inner.rotation.z = Math.sin(t * (4 + a * 30)) * 0.08 * a; break;
    }
    case 'golem': P.chunks.rotation.y += dt * 0.8; P.core.scale.setScalar(1.2 + Math.sin(t * 3) * 0.15); e.inner.rotation.y += dt * 0.25; break;
    case 'hole': {
      P.diskMat.uniforms.uT.value = tAll;
      const s = e.stV = (e.stV || 0) + ((e.st ? 1 : 0) - (e.stV || 0)) * Math.min(1, dt * 4);
      P.diskMat.uniforms.uS.value = s; P.disk.rotation.z += dt * (1 + s * 3);
      P.glow.material.color.setHex(e.st ? 0xff5a3a : 0x9a4dff);
      P.glow.scale.setScalar(8 + Math.sin(t * 3) * 0.8 + s * 3); break;
    }
    case 'twinA': case 'twinB': {
      const down = e.st === 1; const op = down ? 0.25 + 0.15 * Math.sin(t * 20) : 1;
      for (const [m, b] of e.fade) m.opacity = b * op;
      P.mirror.visible = !down; P.mglow.visible = !down; e.inner.rotation.y = 0; break;
    }
    case 'maestro': {
      P.staffs.forEach((s, i) => { s.rotation.z += dt * (0.4 + i * 0.3) * (i % 2 ? -1 : 1); s.scale.setScalar((1 + i * 0.12) * (1 + Math.sin(t * 6.1) * 0.03)); });
      const v = e.st === 1;
      e.mat.emissive.setHex(v ? (Math.sin(t * 14) > 0 ? 0xff5a5a : 0xffffff) : 0xffc040);
      P.glow.material.color.setHex(v ? 0xff5a5a : 0xffc040);
      P.clef.position.y = Math.sin(t * 2) * 0.15; break;
    }
    case 'note': {
      const c = NOTE_COLS[(e.a | 0) % 4];
      e.mat.emissive.setHex(c); P.glow.material.color.setHex(c);
      e.inner.rotation.y = Math.sin(t * 2) * 0.4; e.inner.position.y = Math.sin(t * 3) * 0.25; break;
    }
    case 'ghost': case 'decoy': {
      const vis = e.type === 'decoy' ? 0.42 : (e.a === undefined ? 1 : e.a);
      for (const [m, b] of e.fade) m.opacity = b * vis;
      e.inner.position.y = Math.sin(t * 2.5) * 0.25; e.inner.rotation.z = Math.sin(t * 1.7) * 0.08; break;
    }
    case 'thief':
      P.fingers.forEach(([g, g2], i) => { const c = 0.25 + 0.25 * Math.sin(t * 4 + i * 0.6); g.rotation.x = c; g2.rotation.x = c * 1.2; });
      P.thumb.rotation.x = 0.3 + 0.2 * Math.sin(t * 4); break;
    case 'clock':
      P.hour.rotation.y = e.a || 0; P.min.rotation.y = e.b || 0;
      P.hour.material.uniforms.uT.value = tAll; P.min.material.uniforms.uT.value = tAll;
      P.gem.rotation.y += dt * 2; P.hour.scale.z = P.min.scale.z = RA;
      e.mat.emissiveIntensity = e.st === 1 ? 1.6 : 0.25; break;
    case 'bubble': P.b.scale.setScalar(1 + Math.sin(t * 2) * 0.03); break;
    case 'dseg': e.inner.rotation.y += dt * 2; break;
    case 'mine':
      P.glow.material.opacity = e.st ? (Math.sin(t * 16) > 0 ? 1 : 0.25) : 0.4;
      P.glow.scale.setScalar(e.st ? 2.6 : 1.8); e.inner.rotation.y += dt * 2; break;
  }
}

function spawnEnemy(type, x, z, spawnT = 0.45, o = {}) {
  const vis = buildEnemy(type);
  vis.m.position.set(x, T[type].y, z);
  const e = new Enemy(type, vis, Object.assign({
    id: ++eSeq,
    ti: TYPES.indexOf(type),
    spawnT,
    spawn0: spawnT
  }, o));

  if (type === 'boss') { e.atkT = 2.5; e.mode = null; e.ang = 0; }
  enemies.push(e);
  spawnFx(x, z, T[type].col, !!T[type].boss);
  return e;
}

function fireE(x, z, a, spd, size = 1) {
  const b = EB.get();
  b.id = ++ebSeq;
  b.m.position.set(x, 0.8, z);
  b.v.set(Math.sin(a) * spd, 0, Math.cos(a) * spd);
  b.life = 6;
  b.m.rotation.y = a;
  b.r = 0.32 * size;
  b.core.scale.set(1.3 * size, 1.3 * size, 2.2 * size);
  b.gl.scale.setScalar(2.1 * size);
  if (typeof q === 'function') q(['eb', b.id, r2(x), r2(z), r2(b.v.x), r2(b.v.z), r2(size)]);
}
