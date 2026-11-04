/* ==========================================================================
   ReChoice - js/systems/upgrades.js
   Hệ thống Nâng cấp Kỹ năng Roguelite & Giao diện Chọn Thẻ Lên Cấp
   ========================================================================== */
'use strict';

const U = [
  { id: 'dmg',    g: 'DMG', n: 'Đạn Nặng',           d: '+25% sát thương mỗi viên đạn.', max: 6, f: S => S.dmg *= 1.25 },
  { id: 'rate',   g: 'ROF', n: 'Cò Siêu Tốc',         d: '+20% tốc độ bắn.', max: 6, f: S => S.rate *= 1.2 },
  { id: 'multi',  g: '×N',  n: 'Chùm Đạn',            d: 'Bắn thêm 1 tia đạn mỗi lần nhả cò.', max: 5, f: S => S.multi++ },
  { id: 'pierce', g: 'PRC', n: 'Xuyên Giáp',          d: 'Mỗi viên đạn xuyên thêm 1 kẻ địch.', max: 4, f: S => S.pierce++ },
  { id: 'speed',  g: 'SPD', n: 'Động Cơ Ion',         d: '+12% tốc độ di chuyển.', max: 4, f: S => S.speed *= 1.12 },
  { id: 'hp',     g: 'HP+', n: 'Vỏ Gia Cố',           d: '+25 giáp tối đa và hồi ngay 40 giáp.', max: 5, f: S => { S.maxHp += 25; S.hp = Math.min(S.maxHp, S.hp + 40); } },
  { id: 'regen',  g: 'REG', n: 'Nano Tự Sửa',         d: 'Tự hồi 1,5 giáp mỗi giây.', max: 4, f: S => S.regen += 1.5 },
  { id: 'orbit',  g: 'ORB', n: 'Lưỡi Quỹ Đạo',        d: 'Thêm 1 lưỡi năng lượng xoay quanh tàu, cắt mọi thứ chạm vào.', max: 6, f: (S, s) => syncBlades(s, s.upg.orbit || 0) },
  { id: 'chain',  g: 'ARC', n: 'Sét Dây Chuyền',      d: '+20% cơ hội đạn phóng sét sang 2 kẻ địch gần.', max: 4, f: S => S.chain += 0.2 },
  { id: 'boom',   g: 'EXP', n: 'Phản Ứng Dây Chuyền', d: 'Kẻ địch nổ tung khi chết, gây sát thương vùng. Nổ có thể kích nổ tiếp.', max: 3, f: S => S.boom++ },
  { id: 'crit',   g: 'CRT', n: 'Điểm Yếu',            d: '+12% tỉ lệ chí mạng, mỗi đòn chí mạng gây x2,5 sát thương.', max: 4, f: S => S.crit += 0.12 },
  { id: 'magnet', g: 'MAG', n: 'Từ Trường',           d: '+60% tầm hút tinh thể kinh nghiệm.', max: 3, f: S => S.magnet *= 1.6 },
  { id: 'dash',   g: 'DSH', n: 'Lướt Húc',            d: 'Lướt hồi nhanh hơn 25% và húc nát kẻ địch trên đường đi.', max: 3, f: S => S.dashCd *= 0.75 },
  { id: 'size',   g: 'PLS', n: 'Lõi Plasma',          d: 'Đạn to hơn 35% và mạnh hơn 10%.', max: 3, f: S => { S.bsize *= 1.35; S.dmg *= 1.1; } }
];

const HEAL = { id: 'heal', g: '+HP', n: 'Sửa Chữa Khẩn', d: 'Hồi đầy giáp.', max: 99, f: S => S.hp = S.maxHp };
const UMAP = { heal: HEAL };
for (const u of U) UMAP[u.id] = u;

function recalcStats(s) {
  const hp = s.S.hp, S = baseStats(s.shipClass || s.classId || (typeof selectedClass !== 'undefined' ? selectedClass : 'striker')); s.S = S;
  for (const id in s.upg) {
    const u = UMAP[id]; if (!u || id === 'heal') continue;
    for (let i = 0; i < (s.upg[id] || 0); i++) u.f(S, s);
  }
  S.hp = Math.max(1, Math.min(hp, S.maxHp));
  syncBlades(s, s.upg.orbit || 0);
}

function syncStats(s) {
  if (s.local) chips();
  else if (typeof Net !== 'undefined' && Net.send) Net.send({ t: 'me', to: s.id, S: s.S, upg: s.upg });
}

/* ---------- Lên cấp ---------- */
const lvlWait = new Set();
let curOffer = null, picked = false;

function makeOffer(s) {
  const pool = U.filter(u => (s.upg[u.id] || 0) < u.max), o = [];
  while (o.length < 3 && pool.length) o.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0].id);
  if (!o.length) o.push('heal');
  return o;
}

function openLevel() {
  state = 'levelup'; snd('lvl'); mouse.down = false;
  G.lvlT = 25; lvlWait.clear();
  const lv = G.level - G.pendingLv + 1;
  for (const s of ships.values()) {
    s.offer = makeOffer(s); lvlWait.add(s.id);
    if (s.local) showCards(s.offer, lv, s.upg);
    else if (typeof Net !== 'undefined' && Net.send) Net.send({ t: 'lvl', to: s.id, ids: s.offer, lv, up: s.upg });
  }
  if (me) {
    rawEmit(me.pos.x, 0.8, me.pos.z, 0x2fe0d0, 40, 10, 0.8, 1, 0.5);
    rawGlow(me.pos.x, 1, me.pos.z, 0x2fe0d0, 6, 0.4);
  }
}

function showCards(ids, lv, upg) {
  state = 'levelup'; curOffer = ids; picked = false; mouse.down = false;
  $('lvlN').textContent = lv; $('lvlWait').textContent = '';
  const cards = $('cards'); cards.innerHTML = '';
  ids.forEach((id, i) => {
    const u = UMAP[id]; if (!u) return;
    const lvU = upg[id] || 0;
    const b = document.createElement('button'); b.className = 'up'; b.type = 'button';
    let pips = '';
    if (u.max < 20) for (let j = 0; j < u.max; j++) pips += `<i class="${j < lvU ? 'on' : j === lvU ? 'nx' : ''}"></i>`;
    b.innerHTML = `<span class="k">${i + 1}</span><span class="g">${u.g}</span><span class="n">${u.n}</span><span class="d">${u.d}</span><span class="pips">${pips}</span>`;
    b.addEventListener('click', () => choose(i));
    cards.appendChild(b);
  });
  $('lvl').hidden = false;
  setTimeout(() => { const f = cards.querySelector('button'); f && !isTouch && f.focus({ preventScroll: true }); }, 50);
}

function choose(i) {
  if (state !== 'levelup' || !curOffer || picked || i < 0 || i >= curOffer.length) return;
  picked = true;
  for (const b of $('cards').children) b.disabled = true;
  if (isHost()) applyPick(me, i);
  else {
    if (typeof Net !== 'undefined' && Net.send) Net.send({ t: 'pick', i });
    $('lvlWait').textContent = 'Đang chờ đồng đội chọn…';
  }
}

function applyPick(s, i) {
  if (!s || !lvlWait.has(s.id) || !s.offer) return;
  const id = s.offer[clamp(i | 0, 0, s.offer.length - 1)], u = UMAP[id];
  s.upg[id] = (s.upg[id] || 0) + 1;
  u.f(s.S, s);
  lvlWait.delete(s.id);
  emit(s.pos.x, 0.7, s.pos.z, 0x2fe0d0, 40, 9, 0.7);
  ring(s.pos.x, 0.7, 0x2fe0d0, 7, 0.5);
  if (s.local) {
    chips();
    if (lvlWait.size) $('lvlWait').textContent = 'Đang chờ đồng đội chọn…';
  } else if (typeof Net !== 'undefined' && Net.send) {
    Net.send({ t: 'me', to: s.id, S: s.S, upg: s.upg });
  }
  if (!lvlWait.size) finishLevel();
}

function autoPicks() {
  for (const id of [...lvlWait]) {
    const s = ships.get(id);
    if (s) applyPick(s, Math.floor(Math.random() * 3));
    else lvlWait.delete(id);
  }
  if (!lvlWait.size && state === 'levelup') finishLevel();
}

function finishLevel() {
  if (state !== 'levelup') return;
  G.pendingLv--; curOffer = null;
  $('lvl').hidden = true;
  if (G.pendingLv > 0) openLevel();
  else { state = 'play'; clock.getDelta(); }
}

function chips() {
  $('chips').innerHTML = me ? U.filter(u => me.upg[u.id]).map(u => `<span class="chip"><b>${u.g}</b>${me.upg[u.id]}</span>`).join('') : '';
}
