/* ==========================================================================
   ReChoice - js/systems/wave.js
   Hệ thống 100 Đợt tấn công, Cân bằng độ khó, Sinh quái & Lịch trình Boss
   ========================================================================== */
'use strict';

const crew = () => Math.max(1, ships.size);
const loopMul = () => 1 + Math.floor(((G ? G.wave : 1) - 1) / 100) * 1.5;
const bossScale = () => (1 + 0.16 * ((G ? G.wave : 1) - 1)) * (1 + 0.45 * (crew() - 1)) * loopMul() * (typeof diffCfg === 'function' ? diffCfg().hpMul : 1);

function spawnPoint(slot, n) {
  if (n <= 1) return [0, 0];
  const a = slot / 4 * TAU + Math.PI / 4;
  return [Math.cos(a) * 3, Math.sin(a) * 3];
}

function edgePos() {
  let a = Math.random() * TAU;
  const r = RA - 1.5;
  let x = Math.cos(a) * r, z = Math.sin(a) * r;
  const s = nearestShip(x, z);
  if (s && Math.hypot(x - s.pos.x, z - s.pos.z) < 12) {
    a += Math.PI;
    x = Math.cos(a) * r; z = Math.sin(a) * r;
  }
  return [x, z, a];
}

function pickType() {
  const n = G.wave, w = [['chaser', 10]];
  if (n >= 2) w.push(['shooter', 3 + n * 0.4]);
  if (n >= 3) w.push(['splitter', 2 + n * 0.3]);
  if (n >= 4) w.push(['tank', 1 + n * 0.25]);
  let s = w.reduce((a, b) => a + b[1], 0) * Math.random();
  for (const [k, v] of w) { if ((s -= v) <= 0) return k; }
  return 'chaser';
}

function startWave(n) {
  G.wave = n; G.vacuum = false;
  const special = n % 10 === 0, classic = !special && n % 5 === 0;
  const c = crew();
  const df = typeof diffCfg === 'function' ? diffCfg() : { spawnMul: 1 };
  G.toSpawn = Math.round((special ? 3 + n / 5 : classic ? 4 + n : 6 + Math.floor(n * 4.5)) * (1 + 0.5 * (c - 1)) * (df.spawnMul || 1));
  if (special) G.toSpawn = Math.min(G.toSpawn, Math.round(24 * (df.spawnMul || 1)));
  G.spawnEvery = Math.max(0.18, (1.1 - n * 0.06) / (df.spawnMul || 1)) / (1 + 0.25 * (c - 1)) * (special ? 2.2 : 1);
  G.spawnT = special ? 6 : 1;

  // Hồi sinh đồng đội đã chết hoặc gục khi sang đợt mới
  for (const s of ships.values()) {
    if (!s.dead && !s.downed) continue;
    s.dead = false; s.downed = false; s.g.visible = true; s.S.hp = Math.round(s.S.maxHp * 0.5); s.inv = 2.5;
    if (s.revRing) s.revRing.visible = false;
    const [x, z] = spawnPoint(s.slot, ships.size);
    s.pos.set(x, 0, z); s.tx = x; s.tz = z; s.vx = s.vz = 0;
    emit(x, 0.7, z, 0x2fe0d0, 40, 9, 0.7);
    ring(x, z, 0x2fe0d0, 6, 0.5);
    if (s.local) rawBanner('HỒI SINH', 'Quay lại chiến đấu!');
    else if (typeof q === 'function') q(['rs', s.id, r2(x), r2(z)]);
  }

  if (special) {
    const idx = ((n / 10) - 1) % 10;
    G.bossQueue = idx;
    G.bossPending = 3.2;
    rawIntro(idx);
    if (typeof q === 'function') q(['I', idx]);
  } else if (classic) {
    G.bossQueue = -1;
    G.bossPending = 1.6;
    banner('CẢNH BÁO', 'Lõi Hư Không đang thức dậy');
    snd('big');
  } else {
    banner('ĐỢT ' + n, n === 1 ? 'Sống sót. Lên cấp. Lặp lại.' : `${G.toSpawn} mục tiêu đang tới`);
  }
}
