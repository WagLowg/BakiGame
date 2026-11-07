/* ==========================================================================
   ReChoice - js/core/config.js
   Cấu hình trò chơi, Hằng số, Lớp Phi thuyền, Tiện ích Toán học & LocalStorage
   ========================================================================== */
'use strict';

// Tiện ích DOM & Toán học
const $ = id => document.getElementById(id);
const V3 = THREE.Vector3;
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const r2 = v => Math.round(v * 100) / 100;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lighten = (c, k) => new THREE.Color(c).lerp(new THREE.Color(0xffffff), k);
const darken = (c, k) => new THREE.Color(c).multiplyScalar(k);
const cleanText = (s, n) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const cleanName = n => String(n || '').trim().slice(0, 14) || 'Phi công';
const fmt = n => Math.floor(n).toLocaleString('vi-VN');

// Đấu trường
const R = 30;               // Bán kính đấu trường mặc định
let RA = R;                 // Bán kính hiện tại (boss cuối có thể thu hẹp)
let tAll = 0;               // Tổng thời gian chạy

// Màu tàu phi thuyền người chơi
const SHIP_COLORS = [
  [0xffb547, 0xff7a1f],     // Vàng Cam
  [0x2fe0d0, 0x0fa8a0],     // Xanh Ngọc
  [0xa07bff, 0x6a3dff],     // Tím Laze
  [0xff6b9a, 0xe0306a]      // Hồng Neon
];
const CSS_COLORS = ['#ffb547', '#2fe0d0', '#a07bff', '#ff6b9a'];

/* ---------- Bảng Màu Tùy Chọn Phi Thuyền (Neon Sci-Fi Palettes) ---------- */
const CUSTOM_PALETTES = [
  { name: 'Cyber Gold',  c: 0xffb547, em: 0xff7a1f, css: '#ffb547' },
  { name: 'Neon Cyan',   c: 0x2fe0d0, em: 0x0fa8a0, css: '#2fe0d0' },
  { name: 'Hyper Pink',  c: 0xff3fa4, em: 0xe0207a, css: '#ff3fa4' },
  { name: 'Void Purple', c: 0x9a7bff, em: 0x6a3dff, css: '#9a7bff' },
  { name: 'Acid Lime',   c: 0x39ff14, em: 0x10cc00, css: '#39ff14' },
  { name: 'Inferno Red', c: 0xff3344, em: 0xcc1122, css: '#ff3344' },
  { name: 'Nova White',  c: 0xe8f4ff, em: 0x88bbff, css: '#e8f4ff' }
];

let selectedColorIdx = 0;
try {
  const savedCol = localStorage.getItem('rechoice_color');
  if (savedCol !== null && !isNaN(+savedCol)) selectedColorIdx = clamp(+savedCol, 0, CUSTOM_PALETTES.length - 1);
} catch (e) {}

function getShipColor(slot, isLocal = false) {
  if (isLocal && CUSTOM_PALETTES[selectedColorIdx]) {
    const pal = CUSTOM_PALETTES[selectedColorIdx];
    return [pal.c, pal.em];
  }
  return SHIP_COLORS[slot % 4];
}

/* ---------- Hệ thống Lớp Phi Thuyền (Ship Classes) ---------- */
const SHIP_CLASSES = {
  striker: {
    id: 'striker',
    name: 'Tiên Phong',
    badge: 'Xuyên giáp · Lôi thần',
    desc: 'Khí động học siêu âm, hỏa lực ổn định. Tích hợp sẵn đạn xuyên giáp (+1 xuyên địch).',
    ultName: 'BÃO TỐ LÔI ĐÌNH',
    ultBadge: 'Thunderstorm Judgment',
    ultDesc: 'Bung cánh thiên thần lôi quang. Phóng 2 cột Lôi Quang khổng lồ kèm bão đạn lông vũ điện từ và chuỗi sét diện rộng trong 6s.',
    stats: { hp: 100, maxHp: 100, speed: 9.0, dmg: 10, rate: 5.8, multi: 1, pierce: 1, dashCd: 1.5, crit: 0.05, boom: 0, bsize: 1.0, drones: 0 }
  },
  colossus: {
    id: 'colossus',
    name: 'Thiết Giáp',
    badge: 'Pháo đài · Nhiệt hạch',
    desc: 'Thân tàu bọc giáp Titan dày bản (+50 giáp). Đạn cỡ lớn gây nổ diện rộng, nhưng di chuyển đầm hơn.',
    ultName: 'TẬN THẾ NHIỆT HẠCH',
    ultBadge: 'Supernova Cataclysm',
    ultDesc: 'Bung cánh giáp Titan bất tử. Liên tục kích nổ sóng xung kích Supernova toàn bản đồ và phóng bão đạn đại bác nổ 360° trong 6s.',
    stats: { hp: 150, maxHp: 150, speed: 7.2, dmg: 14, rate: 4.2, multi: 1, pierce: 0, dashCd: 1.8, crit: 0.05, boom: 1, bsize: 1.35, drones: 0 }
  },
  phantom: {
    id: 'phantom',
    name: 'Bóng Ma',
    badge: 'Băng Phong · Chí mạng',
    desc: 'Tốc độ lướt cực nhanh (0.9s hồi). 25% tỉ lệ bạo kích gây x2.5 sát thương.',
    ultName: 'BĂNG PHONG TUYỆT KỸ',
    ultBadge: 'Glacial Mirage Storm',
    ultDesc: 'Bung cánh pha lê Băng Phong. Khai hỏa 2 cột Hàn Băng Laser cực đại cùng bão lông vũ pha lê uốn lượn, đóng băng 80% thời gian sàn đấu.',
    stats: { hp: 75, maxHp: 75, speed: 11.5, dmg: 9, rate: 5.5, multi: 1, pierce: 0, dashCd: 0.9, crit: 0.25, boom: 0, bsize: 0.95, drones: 0 }
  },
  dronemaster: {
    id: 'dronemaster',
    name: 'Chỉ Huy Drone',
    badge: 'Dực thủ · Bão Laser',
    desc: 'Được hộ tống bởi 2 Vệ Tinh Trợ Chiến (Wingmen) thông minh tự động bay lượn và bắn tỉa kẻ địch gần nhất.',
    ultName: 'MA TRẬN HỦY DIỆT',
    ultBadge: 'Omega Orbital Matrix',
    ultDesc: 'Bung cánh thiên thần lượng tử. Triệu hồi 6 cột Laser Vệ Tinh khổng lồ xoay 360° quanh tàu, càn quét sạch toàn bộ sàn đấu trong 6s.',
    stats: { hp: 90, maxHp: 90, speed: 8.8, dmg: 10, rate: 5.0, multi: 1, pierce: 0, dashCd: 1.5, crit: 0.05, boom: 0, bsize: 1.0, drones: 2 }
  }
};

let selectedClass = 'striker';
try {
  const sc = localStorage.getItem('rechoice-ship-class');
  if (sc && SHIP_CLASSES[sc]) selectedClass = sc;
} catch (e) {}

/* ---------- Hệ Thống 4 Cấp Độ Khó (Difficulty System) ---------- */
const DIFFICULTIES = {
  easy: {
    id: 'easy',
    name: 'DỄ',
    badge: '🟢 DỄ',
    desc: 'Quái máu ít (-25%), sát thương thấp (-30%), đạn chậm, rơi buff dồi dào, diệt Boss nhận Lõi',
    hpMul: 0.75,
    dmgMul: 0.70,
    spdMul: 0.80,
    spawnMul: 0.80,
    fireRateMul: 0.85,
    scoreMul: 0.80,
    bossCore: true,
    normalDropRate: 0.08,
    tankDropRate: 0.50,
    bossDropRate: 1.0,
    bossHealRate: 0.80,
    waveHeal: 15,
    bossClearHeal: 50,
    color: '#2fe0d0'
  },
  normal: {
    id: 'normal',
    name: 'VỪA',
    badge: '🟡 TRUNG BÌNH',
    desc: 'Cân bằng chuẩn: Giảm tỷ lệ rơi buff hỗ trợ, quái arcade, diệt Boss nhận Lõi',
    hpMul: 1.0,
    dmgMul: 1.0,
    spdMul: 1.0,
    spawnMul: 1.0,
    fireRateMul: 1.0,
    scoreMul: 1.0,
    bossCore: true,
    normalDropRate: 0.018,
    tankDropRate: 0.18,
    bossDropRate: 1.0,
    bossHealRate: 0.35,
    waveHeal: 10,
    bossClearHeal: 35,
    color: '#ffb547'
  },
  hard: {
    id: 'hard',
    name: 'KHÓ',
    badge: '🟠 KHÓ',
    desc: 'Thử thách: Máu +65%, Dame +55%, quái nhanh & bão đạn, rơi ít buff, DIỆT BOSS KHÔNG NHẬN LÕI',
    hpMul: 1.65,
    dmgMul: 1.55,
    spdMul: 1.20,
    spawnMul: 1.35,
    fireRateMul: 1.25,
    scoreMul: 1.60,
    bossCore: false,
    normalDropRate: 0.007,
    tankDropRate: 0.08,
    bossDropRate: 0.50,
    bossHealRate: 0.15,
    waveHeal: 5,
    bossClearHeal: 15,
    color: '#ff7a1f'
  },
  nightmare: {
    id: 'nightmare',
    name: 'SIÊU KHÓ',
    badge: '🔴 SIÊU KHÓ',
    desc: 'Ác mộng: Máu +150%, Dame +125%, bão đạn xé gió, rơi buff cực hiếm, DIỆT BOSS KHÔNG NHẬN LÕI',
    hpMul: 2.50,
    dmgMul: 2.25,
    spdMul: 1.40,
    spawnMul: 1.65,
    fireRateMul: 1.50,
    scoreMul: 2.50,
    bossCore: false,
    normalDropRate: 0.002,
    tankDropRate: 0.03,
    bossDropRate: 0.25,
    bossHealRate: 0.0,
    waveHeal: 2,
    bossClearHeal: 5,
    color: '#ff3344'
  }
};

let currentDifficulty = 'normal';
try {
  const sd = localStorage.getItem('rechoice-difficulty');
  if (sd && DIFFICULTIES[sd]) currentDifficulty = sd;
} catch (e) {}
const diffCfg = () => DIFFICULTIES[currentDifficulty] || DIFFICULTIES.normal;

// Trạng thái vòng đời game
const STATES = ['menu', 'lobby', 'play', 'levelup', 'dying', 'over', 'pause'];
let state = 'menu';
let ovl = false;            // Overlay menu khi đang chơi online

// Thông tin phòng chơi & mạng
const NET = {
  mode: 'solo',             // 'solo' | 'host' | 'guest'
  running: false,
  roster: [],
  code: null,
  hostId: null,
  myId: 'me',
  sendT: 0
};
const isHost = () => NET.mode === 'solo' || NET.mode === 'host';
const online = () => NET.mode !== 'solo';

// Cài đặt & Lưu trữ cục bộ (LocalStorage)
const KEY = {
  best: 'rechoice-best',
  name: 'rechoice-name',
  set: 'rechoice-settings',
  board: 'rechoice-board',
  class: 'rechoice-ship-class'
};
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

if (lsGet('voidcore-best') && !lsGet(KEY.best)) lsSet(KEY.best, lsGet('voidcore-best'));
if (lsGet('voidcore-name') && !lsGet(KEY.name)) lsSet(KEY.name, lsGet('voidcore-name'));

const coarse = matchMedia('(pointer:coarse)').matches;
let isTouch = coarse;
let autoFire = false;

// Tự động nhận diện phần cứng đồ họa (iGPU / Card Onboard vs dGPU / Card rời)
function detectGPUHardware() {
  let isIGPU = false;
  let gpuName = 'Card tích hợp (iGPU)';
  try {
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
    if (gl) {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      if (dbg) {
        gpuName = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '';
        const igpuKeywords = [
          /intel/i, /uhd/i, /hd graphics/i, /iris/i, /mali/i, /adreno/i,
          /powervr/i, /microsoft basic/i, /swiftshader/i, /llvmpipe/i,
          /radeon.*graphics/i, /radeon.*vega/i, /geforce.*m\b/i
        ];
        const isDiscrete = /rtx|gtx\s*(1[0-9]{3}|20[0-9]{2}|30[0-9]{2}|40[0-9]{2}|9[5-9]0)|radeon\s*rx/i.test(gpuName);
        if (!isDiscrete && (igpuKeywords.some(rx => rx.test(gpuName)) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4))) {
          isIGPU = true;
        }
      }
    }
  } catch (e) {
    isIGPU = true;
  }
  return { isIGPU, gpuName };
}

const GPU_INFO = detectGPUHardware();
const isIGPU = GPU_INFO.isIGPU;

// Mặc định tự động chọn cấu hình phù hợp với phần cứng máy
const defaultQuality = isIGPU ? 'low' : (coarse ? 'mid' : 'high');

const SET = Object.assign(
  { music: 60, sfx: 80, quality: defaultQuality, shake: 1, nums: 1 },
  (() => { try { return JSON.parse(lsGet(KEY.set) || '{}'); } catch (e) { return {}; } })()
);
const saveSet = () => lsSet(KEY.set, JSON.stringify(SET));

const QUAL = {
  potato: {
    pr: 0.85,
    bloom: false,
    post: false,
    pMul: 0.3,
    trail: false,
    debris: 0.2,
    pMax: 1000,
    simpleFloor: true,
    edgeLines: false
  },
  low: {
    pr: 1.0,
    bloom: false,
    post: false,
    pMul: 0.45,
    trail: false,
    debris: 0.35,
    pMax: 1500,
    simpleFloor: true,
    edgeLines: false
  },
  mid: {
    pr: Math.min(1.25, typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1),
    bloom: true,
    post: true,
    pMul: 0.75,
    trail: true,
    debris: 0.65,
    pMax: 3000,
    simpleFloor: false,
    edgeLines: true
  },
  high: {
    pr: Math.min(1.75, typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1),
    bloom: true,
    post: true,
    pMul: 1.0,
    trail: true,
    debris: 1.0,
    pMax: 5000,
    simpleFloor: false,
    edgeLines: true
  }
};
let Q = QUAL[SET.quality] || QUAL.low;

const PRACTICE = Math.max(1, Math.min(500, parseInt(new URLSearchParams(location.search).get('dot')) || 1));

function getBest() { return parseInt(lsGet(KEY.best)) || 0; }
function setBest(v) { lsSet(KEY.best, Math.max(getBest(), Math.floor(v))); showBest(); }
function showBest() {
  const b = getBest();
  const t = b ? `KỶ LỤC CỦA BẠN <b>${b.toLocaleString('vi-VN')}</b>` : 'HÃY LẬP KỶ LỤC ĐẦU TIÊN';
  if ($('bestM')) $('bestM').innerHTML = t;
}
