/* ==========================================================================
   ReChoice - js/ui/menu.js
   Quản lý Màn hình Menu chính, Bảng xếp hạng, Cài đặt & Phòng chờ Online
   ========================================================================== */
'use strict';

function toggleMute() {
  muted = !muted;
  $('muteBtn').textContent = muted ? 'ÂM: TẮT' : 'ÂM: BẬT';
  if (muted) bgmPause();
  else if (['play', 'levelup', 'dying'].includes(state)) bgmPlay();
}
$('muteBtn').addEventListener('click', toggleMute);
$('pauseBtn').addEventListener('click', () => {
  if (online()) ovl ? resume() : pause();
  else if (state === 'play') pause();
  else if (state === 'pause') resume();
});

function pause() {
  mouse.down = false;
  if (online()) {
    ovl = true;
    $('pauseT').textContent = 'MENU';
    $('quitBtn').textContent = 'RỜI PHÒNG';
    $('pause').hidden = false;
    return;
  }
  state = 'pause';
  $('pauseT').textContent = 'TẠM DỪNG';
  $('quitBtn').textContent = 'VỀ MENU';
  $('pause').hidden = false;
  bgmPause();
}

function resume() {
  $('pause').hidden = true;
  if (online()) { ovl = false; return; }
  state = 'play';
  clock.getDelta();
  bgmPlay();
}
$('resumeBtn').addEventListener('click', resume);
$('quitBtn').addEventListener('click', () => toMenu());

const SCREENS = ['menu', 'online', 'lobby', 'lvl', 'pause', 'over', 'board', 'settings', 'musicScreen'];
function hideScreens() { for (const id of SCREENS) $(id).hidden = true; }
function setHud(on) {
  for (const id of ['tl', 'bl', 'tr']) $(id).hidden = !on;
  if (!on) $('boss').hidden = true;
}

function toMenu(msg) {
  if (online()) leaveOnline();
  hideScreens(); setHud(false); ovl = false;
  state = 'menu';
  if (typeof menuShip === 'function') menuShip();
  showBest(); loadKing();
  $('menuMsg').textContent = msg || '';
  $('menu').hidden = false;
  bgmPause();
}

function beginPlay() {
  hideScreens(); setHud(true); ovl = false;
  state = 'play';
  if (!isTouch) canvas.classList.add('aiming');
  clock.getDelta();
  bgm.currentTime = 0;
  bgmPlay();
}

function start() {
  audio();
  if (AC && AC.state === 'suspended') AC.resume();
  NET.mode = 'solo'; NET.myId = 'me';
  newRun([['me', cleanName(lsGet(KEY.name)), 0]]);
  beginPlay();
}
$('startBtn').addEventListener('click', start);
$('againBtn').addEventListener('click', () => {
  audio();
  if (NET.mode === 'host') hostStart();
  else if (!online()) start();
});
$('overMenuBtn').addEventListener('click', () => toMenu());

let lastRun = null;
function gameOver() {
  const d = { score: Math.floor(G.score), wave: G.wave, level: G.level, kills: G.kills, wins: G.wins, practice: G.practice };
  if (NET.mode === 'host') {
    NET.running = false;
    Net.send({ t: 'over', d });
    sendRoster();
  }
  showOver(d);
}

function showOver(d) {
  state = 'over'; bgmPause(); ovl = false;
  const best = getBest();
  if (!d.practice && d.score > best) setBest(d.score);
  $('overT').textContent = d.wins ? 'CHIẾN THẮNG' : 'TÀU VỠ';
  $('oScore').textContent = d.score.toLocaleString('vi-VN');
  $('oWave').textContent = d.wave;
  $('oLv').textContent = d.level;
  $('oKills').textContent = d.kills;
  $('bestO').innerHTML = d.practice ? 'LUYỆN TẬP · KHÔNG TÍNH ĐIỂM' : d.score > best ? '<b>KỶ LỤC MỚI!</b>' : `KỶ LỤC CỦA BẠN <b>${best.toLocaleString('vi-VN')}</b>`;
  $('againBtn').hidden = !isHost();
  $('overWait').textContent = isHost() ? '' : 'Chờ chủ phòng bấm Chơi lại…';
  $('overMenuBtn').hidden = false;
  $('rankMsg').textContent = ''; $('saveRow').hidden = true;
  $('boss').hidden = true; $('lvl').hidden = true; $('pause').hidden = true; $('over').hidden = false;
  for (const s of ships.values()) if (s.tag) s.tag.hidden = true;
  lastRun = d;
  if (isHost() && !d.practice && d.score > 0) autoSubmit(d);
}

/* ---------- Bảng xếp hạng Vua Trò Chơi ---------- */
function localBoard() { try { return JSON.parse(lsGet(KEY.board) || '[]'); } catch (e) { return []; } }
function saveLocal(entry) {
  const l = localBoard(); l.push(entry);
  l.sort((a, b) => b.score - a.score);
  const k = l.slice(0, 30);
  lsSet(KEY.board, JSON.stringify(k));
  return l.indexOf(entry) + 1;
}

async function fetchBoard() {
  if (typeof Net !== 'undefined' && Net.available()) {
    try {
      const r = await fetch('/api/scores', { cache: 'no-store' });
      if (r.ok) { const j = await r.json(); return { top: j.top || [], server: true }; }
    } catch (e) {}
  }
  return { top: localBoard(), server: false };
}

async function submitScore(entry) {
  const localRank = saveLocal(Object.assign({}, entry, { date: new Date().toISOString().slice(0, 10) }));
  if (typeof Net !== 'undefined' && Net.available()) {
    try {
      const r = await fetch('/api/scores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) });
      const j = await r.json();
      if (r.ok) return { rank: j.rank, server: true, top: j.top };
      return { error: j.error || 'Không gửi được điểm.' };
    } catch (e) {
      return { error: 'Không gửi được điểm lên máy chủ.' };
    }
  }
  return { rank: localRank, server: false };
}

function teamName() { return NET.mode === 'host' ? NET.roster.map(r => r[1]).join(' & ').slice(0, 40) : cleanName(lsGet(KEY.name)); }
function rankText(res) {
  if (res.error) return res.error;
  if (!res.rank) return 'Chưa lọt vào top 100 · cố lên lần sau!';
  if (res.rank === 1) return '<b>BẠN LÀ VUA TRÒ CHƠI!</b> Hạng #1' + (res.server ? '' : ' trên máy này');
  return 'Hạng <b>#' + res.rank + '</b> trên bảng Vua trò chơi' + (res.server ? '' : ' (trên máy này)');
}

async function autoSubmit(d) {
  const solo = NET.mode === 'solo';
  if (solo && !lsGet(KEY.name)) {
    $('saveRow').hidden = false; $('saveName').value = '';
    $('rankMsg').textContent = 'Nhập tên để ghi danh lên bảng Vua trò chơi';
    return;
  }
  $('rankMsg').textContent = 'Đang ghi danh…';
  const res = await submitScore({ name: teamName(), score: d.score, wave: d.wave, level: d.level, kills: d.kills, team: solo ? 1 : NET.roster.length, wins: d.wins });
  const txt = rankText(res);
  $('rankMsg').innerHTML = txt;
  if (NET.mode === 'host' && typeof Net !== 'undefined') Net.send({ t: 'rank', txt });
}

$('saveBtn').addEventListener('click', async () => {
  const n = $('saveName').value.trim();
  if (!n) { $('saveName').focus(); return; }
  lsSet(KEY.name, n.slice(0, 14));
  $('nameIn').value = n.slice(0, 14);
  $('saveRow').hidden = true;
  if (lastRun) autoSubmit(lastRun);
});

async function loadKing() {
  const b = await fetchBoard(); const k = b.top && b.top[0];
  $('king').hidden = !k;
  if (k) { $('kingName').textContent = k.name; $('kingScore').textContent = fmt(k.score); }
}

let boardBack = 'menu';
async function openBoard(back) {
  boardBack = back; hideScreens(); $('board').hidden = false;
  const list = $('rankList'); list.innerHTML = '<li class="empty">Đang tải…</li>';
  $('boardMsg').textContent = '';
  const b = await fetchBoard();
  $('boardNote').textContent = b.server ? 'Những phi công ghi điểm cao nhất trên máy chủ.' : 'Bảng này chỉ lưu trên máy bạn. Mở game qua đường link máy chủ để thi đấu với mọi người.';
  list.innerHTML = '';
  if (!b.top.length) { list.innerHTML = '<li class="empty">Chưa có ai ghi danh. Hãy là người đầu tiên!</li>'; return; }
  const myName = teamName();
  b.top.slice(0, 50).forEach((r, i) => {
    const li = document.createElement('li'); li.className = (i < 3 ? 'top' + (i + 1) : '') + (r.name === myName ? ' me' : '');
    const no = document.createElement('span'); no.className = 'no'; no.textContent = i === 0 ? '♛' : i + 1;
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = r.name;
    const sc = document.createElement('span'); sc.className = 'sc'; sc.textContent = fmt(r.score);
    const mt = document.createElement('span'); mt.className = 'mt'; mt.textContent = `Đợt ${r.wave} · ${r.team > 1 ? 'Đội ' + r.team + ' người' : 'Một mình'}${r.wins ? ' · ' + r.wins + ' lần thắng' : ''}${r.date ? ' · ' + r.date : ''}`;
    li.append(no, nm, sc, mt); list.appendChild(li);
  });
}
$('boardBtn').addEventListener('click', () => openBoard('menu'));
$('overBoard').addEventListener('click', () => openBoard('over'));
$('boardBack').addEventListener('click', () => { hideScreens(); $(boardBack).hidden = false; });

/* ---------- Cài đặt ---------- */
let setBack = 'menu';
function openSettings(back) { setBack = back; hideScreens(); $('settings').hidden = false; renderSettings(); }
function closeSettings() { hideScreens(); $(setBack).hidden = false; }
function renderSettings() {
  $('volMusic').value = SET.music; $('volMusicV').textContent = SET.music + '%';
  $('volSfx').value = SET.sfx; $('volSfxV').textContent = SET.sfx + '%';
  for (const b of $('qual').children) b.setAttribute('aria-checked', b.dataset.q === SET.quality);
  for (const b of $('shakeSeg').children) b.setAttribute('aria-checked', +b.dataset.s === SET.shake);
  for (const b of $('numSeg').children) b.setAttribute('aria-checked', +b.dataset.n === SET.nums);
  if ($('gpuInfoTag')) {
    const gpuText = (typeof GPU_INFO !== 'undefined' && GPU_INFO.gpuName) ? GPU_INFO.gpuName : 'Phần cứng web';
    $('gpuInfoTag').textContent = (typeof isIGPU !== 'undefined' && isIGPU)
      ? `⚡ Phát hiện ${gpuText} · Đã bật cấu hình Siêu Mượt 60 FPS`
      : `🎮 ${gpuText}`;
  }
}
$('volMusic').addEventListener('input', e => {
  SET.music = +e.target.value; applyVolume(); saveSet(); renderSettings();
  if (SET.music === 0) bgmPause(); else if (['play', 'levelup', 'dying'].includes(state)) bgmPlay();
});
$('volSfx').addEventListener('input', e => { SET.sfx = +e.target.value; applyVolume(); saveSet(); renderSettings(); });
$('volSfx').addEventListener('change', () => { audio(); sfx.pick(); });
$('qual').addEventListener('click', e => { const q = e.target.dataset && e.target.dataset.q; if (!q) return; SET.quality = q; saveSet(); applyQuality(); renderSettings(); });
$('shakeSeg').addEventListener('click', e => { const v = e.target.dataset && e.target.dataset.s; if (v === undefined) return; SET.shake = +v; saveSet(); renderSettings(); });
$('numSeg').addEventListener('click', e => { const v = e.target.dataset && e.target.dataset.n; if (v === undefined) return; SET.nums = +v; saveSet(); renderSettings(); });
$('setBtn').addEventListener('click', () => openSettings('menu'));
$('pauseSet').addEventListener('click', () => openSettings('pause'));
$('setBack').addEventListener('click', closeSettings);

function applyQuality() {
  Q = QUAL[SET.quality] || QUAL.low;
  renderer.setPixelRatio(Math.min(typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1, Q.pr));
  if (bloomPass) bloomPass.enabled = !!Q.bloom;
  if (postPass) postPass.enabled = !!Q.post;
  if (typeof floorMat !== 'undefined' && floorMat.uniforms && floorMat.uniforms.uSimple) {
    floorMat.uniforms.uSimple.value = Q.simpleFloor ? 1.0 : 0.0;
  }
  if (typeof dust !== 'undefined') dust.visible = !Q.simpleFloor;
  if (typeof shards !== 'undefined') {
    for (const s of shards) s.m.visible = !Q.simpleFloor;
  }
  resize();
}

/* ---------- Online & Phòng chờ ---------- */
function myName() { return cleanName($('nameIn').value); }
$('nameIn').value = lsGet(KEY.name) || '';

$('onlineBtn').addEventListener('click', () => {
  audio();
  hideScreens(); $('online').hidden = false;
  const ok = typeof Net !== 'undefined' && Net.available();
  $('createBtn').disabled = !ok; $('joinBtn').disabled = !ok;
  $('onMsg').textContent = ok ? '' : 'Muốn chơi online, hãy chạy máy chủ (npm start) rồi mở game bằng đường link http://localhost:3000 thay vì mở file trực tiếp.';
  if (ok) setTimeout(() => $('nameIn').focus(), 50);
});
$('onBack').addEventListener('click', () => { if (typeof Net !== 'undefined') Net.close(); hideScreens(); $('menu').hidden = false; });
$('codeIn').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ''); });

async function connectThen(msg) {
  $('onMsg').textContent = 'Đang kết nối…';
  $('createBtn').disabled = $('joinBtn').disabled = true;
  lsSet(KEY.name, $('nameIn').value.trim());
  try {
    await Net.connect();
    Net.send(msg);
  } catch (err) {
    $('onMsg').textContent = err.message || 'Không kết nối được máy chủ.';
    $('createBtn').disabled = $('joinBtn').disabled = false;
  }
}
$('createBtn').addEventListener('click', () => connectThen({ t: 'create', name: myName(), shipClass: selectedClass }));
$('joinBtn').addEventListener('click', () => {
  const code = $('codeIn').value.trim().toUpperCase();
  if (code.length !== 4) { $('onMsg').textContent = 'Mã phòng gồm 4 chữ cái.'; $('codeIn').focus(); return; }
  connectThen({ t: 'join', code, name: myName(), shipClass: selectedClass });
});

function showLobby() {
  hideScreens(); setHud(false); state = 'lobby';
  $('roomCode').textContent = NET.code;
  $('lobby').hidden = false;
  updateDifficultyUI();
  updateLobby();
}

function updateLobby() {
  const ul = $('plist'); ul.innerHTML = '';
  for (const [id, name, slot, shipClass] of NET.roster) {
    const li = document.createElement('li'); li.style.setProperty('--c', CSS_COLORS[slot % 4]);
    li.appendChild(document.createElement('i'));
    const n = document.createElement('span'); n.textContent = name; li.appendChild(n);
    const cls = (typeof SHIP_CLASSES !== 'undefined' && SHIP_CLASSES[shipClass]) || {};
    const tags = [cls.name || 'Tiên Phong'];
    if (id === NET.hostId) tags.push('CHỦ PHÒNG');
    if (id === NET.myId) tags.push('BẠN');
    const tag = document.createElement('em'); tag.textContent = tags.join(' · '); li.appendChild(tag);
    ul.appendChild(li);
  }
  const host = NET.mode === 'host';
  $('goBtn').hidden = !host;
  const diffBtn = $('lobbyDiffBtn');
  if (diffBtn) diffBtn.style.display = host ? 'inline-block' : 'none';
  $('lobWait').textContent = host ? (NET.roster.length < 2 ? 'Có thể bắt đầu một mình, hoặc chờ bạn bè vào.' : '') : 'Chờ chủ phòng bấm Bắt đầu…';
}
$('goBtn').addEventListener('click', () => { audio(); hostStart(); });
$('lobLeave').addEventListener('click', () => toMenu());

function leaveOnline() {
  if (typeof Net !== 'undefined') Net.close();
  NET.mode = 'solo'; NET.running = false; NET.roster = []; NET.code = null; NET.hostId = null; NET.myId = 'me';
  lvlWait.clear(); fxq = [];
}
function sendRoster() { if (typeof Net !== 'undefined') Net.send({ t: 'roster', list: NET.roster, running: NET.running, diff: currentDifficulty }); }
function hostStart() {
  NET.running = true;
  if (typeof Net !== 'undefined') Net.send({ t: 'start', list: NET.roster, diff: currentDifficulty });
  newRun(NET.roster);
  beginPlay();
}
function syncRoster(list) {
  const ids = new Set(list.map(r => r[0]));
  for (const id of [...ships.keys()]) if (!ids.has(id)) removeShip(id);
  for (const [id, name, slot, shipClass] of list) {
    if (!ships.has(id)) addShip(id, name, slot, id === NET.myId, shipClass || (id === NET.myId ? selectedClass : 'striker'));
  }
}

if (typeof Net !== 'undefined') {
  Net.on('close', () => { if (online()) toMenu('Mất kết nối với máy chủ.'); });
  Net.on('msg', m => {
    switch (m.t) {
      case 'created':
        NET.mode = 'host'; NET.myId = m.id; NET.hostId = m.id; NET.code = m.code; NET.running = false;
        NET.roster = [[m.id, myName(), 0, selectedClass]];
        clearWorld(); clearShips(); addShip(m.id, myName(), 0, true, selectedClass);
        showLobby(); break;
      case 'joined':
        NET.mode = 'guest'; NET.myId = m.id; NET.hostId = m.hostId; NET.code = m.code; NET.roster = [];
        clearWorld(); clearShips(); addShip(m.id, myName(), 1, true, selectedClass);
        showLobby(); break;
      case 'error':
        $('onMsg').textContent = m.msg; $('createBtn').disabled = $('joinBtn').disabled = false;
        if (!online()) Net.close();
        break;
      case 'hostleft':
        toMenu('Chủ phòng đã rời đi.'); break;

      /* ----- Chủ phòng nhận ----- */
      case 'peer+': {
        if (NET.mode !== 'host') break;
        const used = new Set(NET.roster.map(r => r[2])); let slot = 0; while (used.has(slot)) slot++;
        const name = cleanName(m.name);
        const shipClass = m.shipClass || 'striker';
        NET.roster.push([m.id, name, slot, shipClass]);
        if (NET.running && G) {
          const s = addShip(m.id, name, slot, false, shipClass); const [x, z] = spawnPoint(slot, 4);
          s.pos.set(x, 0, z); s.tx = x; s.tz = z; s.inv = 2.5;
          rawBanner(name.toUpperCase(), 'đã vào trận');
        }
        sendRoster(); updateLobby(); break;
      }
      case 'peer-': {
        if (NET.mode !== 'host') break;
        const r = NET.roster.find(x => x[0] === m.id);
        NET.roster = NET.roster.filter(x => x[0] !== m.id);
        removeShip(m.id);
        if (lvlWait.delete(m.id) && !lvlWait.size) finishLevel();
        if (r && NET.running) rawBanner(r[1].toUpperCase(), 'đã rời trận');
        if (NET.running && G && state === 'play' && !aliveShips().length) { state = 'dying'; G.deadT = 1.6; }
        sendRoster(); updateLobby(); break;
      }
      case 'in': {
        const s = ships.get(m.from); if (!s || s.local || s.dead) break;
        const cl = v => clamp(+v || 0, -R, R);
        s.tx = cl(m.x); s.tz = cl(m.z); s.tRy = +m.ry || 0; s.tRz = +m.rz || 0;
        s.aim.set(+m.ax || 0, 0, +m.az || 0); if (s.aim.lengthSq() < 1e-4) s.aim.set(0, 0, -1); s.aim.normalize();
        s.firing = !!m.f;
        if (m.d) { if (s.dashT <= 0) s.dashId++; s.dashT = 0.12; }
        if (m.u) { s.useUltimate(); }
        break;
      }
      case 'changeClass': {
        if (NET.mode !== 'host') break;
        const r = NET.roster.find(x => x[0] === m.from);
        if (r && m.shipClass) {
          r[3] = m.shipClass;
          sendRoster();
          updateLobby();
        }
        break;
      }
      case 'pick': { if (NET.mode === 'host') applyPick(ships.get(m.from), m.i); break; }

      /* ----- Khách nhận ----- */
      case 'roster':
        if (NET.mode !== 'guest') break;
        NET.roster = m.list;
        if (m.diff) { currentDifficulty = m.diff; updateDifficultyUI(); }
        updateLobby();
        if (m.running && state === 'lobby') { newRun(m.list); beginPlay(); }
        else if (m.running && state !== 'over') syncRoster(m.list);
        break;
      case 'start':
        if (NET.mode !== 'guest') break;
        NET.roster = m.list;
        if (m.diff) { currentDifficulty = m.diff; updateDifficultyUI(); }
        newRun(m.list); beginPlay(); break;
      case 'diff':
        if (NET.mode === 'guest') {
          currentDifficulty = m.diff || 'normal';
          updateDifficultyUI();
          if (typeof rawToast === 'function') rawToast(`Độ khó phòng: ${diffCfg().badge}`);
        }
        break;
      case 'tracksUpdated':
        if (typeof syncMusicTracks === 'function') syncMusicTracks(true);
        break;
      case 'lvl':
        if (NET.mode !== 'guest' || !me) break;
        me.upg = m.up || {}; showCards(m.ids, m.lv, me.upg); break;
      case 'me':
        if (NET.mode !== 'guest' || !me) break;
        { const hp = me.S.hp; Object.assign(me.S, m.S); me.S.hp = hp; } me.upg = m.upg || {}; chips(); break;
      case 'over':
        if (NET.mode === 'guest') showOver(m.d); break;
      case 'rank':
        if (NET.mode === 'guest') $('rankMsg').innerHTML = String(m.txt || '').replace(/<(?!\/?b>)[^>]*>/g, ''); break;
      case 's':
        if (NET.mode === 'guest' && G && state !== 'over' && state !== 'lobby') applySnap(m); break;
    }
  });
}


/* ---------- Khởi tạo Bộ chọn Lớp Phi Thuyền ---------- */
function initClassPicker() {
  const grid = $('classGrid');
  if (!grid) return;
  const cards = grid.querySelectorAll('.class-card');
  const cur = selectedClass || 'striker';
  cards.forEach(card => {
    card.classList.toggle('active', card.dataset.class === cur);
    card.addEventListener('click', () => {
      audio();
      cards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedClass = card.dataset.class;
      try { localStorage.setItem('rechoice_class', selectedClass); } catch (e) {}
      if (NET.mode === 'host' && NET.roster) {
        const myR = NET.roster.find(r => r[0] === NET.myId);
        if (myR) { myR[3] = selectedClass; sendRoster(); updateLobby(); }
      } else if (NET.mode === 'guest' && typeof Net !== 'undefined') {
        Net.send({ t: 'changeClass', shipClass: selectedClass });
      }
      if (me && me.g) {
        // Tái tạo lại visual tàu trên màn hình menu
        const parent = me.g.parent;
        const rotY = me.g.rotation.y;
        scene.remove(me.g);
        clearShips();
        const s = addShip('me', '', 0, true, selectedClass);
        s.pos.set(0, 0, 0);
        s.g.rotation.y = rotY;
      }
      snd('lvl');
    });
  });
}
initClassPicker();


/* ---------- Khởi tạo Bảng Chọn Màu Phi Thuyền ---------- */
function initColorPicker() {
  const container = $('colorPalette');
  if (!container || typeof CUSTOM_PALETTES === 'undefined') return;
  container.innerHTML = '';
  CUSTOM_PALETTES.forEach((pal, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'color-dot' + (idx === selectedColorIdx ? ' active' : '');
    btn.style.setProperty('--col', pal.css);
    btn.title = pal.name;
    btn.addEventListener('click', () => {
      audio();
      selectedColorIdx = idx;
      try { localStorage.setItem('rechoice_color', idx); } catch (e) {}
      container.querySelectorAll('.color-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
      if (me && me.g) {
        const rotY = me.g.rotation.y;
        scene.remove(me.g);
        clearShips();
        const s = addShip('me', '', 0, true, selectedClass);
        s.pos.set(0, 0, 0);
        s.g.rotation.y = rotY;
      }
      snd('click');
    });
    container.appendChild(btn);
  });
}
initColorPicker();


/* ---------- Quản Lý Giao Diện Playlist Nhạc Nền (Jukebox UI) ---------- */
let prevScreenBeforeMusic = 'menu';

function openMusicScreen() {
  audio();
  prevScreenBeforeMusic = $('settings').hidden ? 'menu' : 'settings';
  hideScreens();
  $('musicScreen').hidden = false;
  updatePlaylistUI();
}

function closeMusicScreen() {
  if (typeof stopPreview === 'function') stopPreview();
  hideScreens();
  if (prevScreenBeforeMusic === 'settings') {
    $('settings').hidden = false;
  } else {
    $('menu').hidden = false;
  }
}

function updatePlaylistUI() {
  const box = $('playlistBox');
  if (!box || typeof MUSIC_TRACKS === 'undefined') return;
  box.innerHTML = '';

  MUSIC_TRACKS.forEach((track, idx) => {
    const isSelected = userPlaylist.includes(track.id);
    const isPreviewing = previewingTrackId === track.id;

    const row = document.createElement('div');
    row.className = 'track-item' + (isSelected ? ' selected' : '');

    // Cụm trái: Checkbox + Tiêu đề + Thể loại
    const left = document.createElement('div');
    left.className = 'track-left';

    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.className = 'track-chk';
    chk.checked = isSelected;
    chk.addEventListener('change', () => {
      audio();
      if (chk.checked) {
        if (!userPlaylist.includes(track.id)) userPlaylist.push(track.id);
      } else {
        // Không cho bỏ chọn hết (phải giữ ít nhất 1 bài)
        if (userPlaylist.length <= 1) {
          chk.checked = true;
          if (typeof rawToast === 'function') rawToast('⚠️ Playlist phải có ít nhất 1 bài hát!');
          return;
        }
        userPlaylist = userPlaylist.filter(id => id !== track.id);
      }
      saveUserPlaylist(userPlaylist);
      updatePlaylistUI();
    });

    const info = document.createElement('div');
    info.className = 'track-info';

    const title = document.createElement('span');
    title.className = 'track-title';
    title.textContent = track.title;

    const style = document.createElement('span');
    style.className = 'track-style';
    style.textContent = track.style;

    info.appendChild(title);
    info.appendChild(style);
    left.appendChild(chk);
    left.appendChild(info);

    // Cụm phải: Nút Nghe thử
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'track-preview-btn' + (isPreviewing ? ' playing' : '');
    prevBtn.textContent = isPreviewing ? '⏸ Đang phát' : '▶ Nghe thử';
    prevBtn.addEventListener('click', () => {
      previewTrack(track.id);
    });

    row.appendChild(left);
    row.appendChild(prevBtn);
    box.appendChild(row);
  });

  const countTxt = $('playlistCountTxt');
  if (countTxt) {
    countTxt.textContent = `Playlist của bạn: Đã chọn ${userPlaylist.length} / ${MUSIC_TRACKS.length} bài (Tự động lặp lại tuần hoàn)`;
  }
}

// Lắng nghe sự kiện các nút bấm mở/đóng Playlist
const musicBtn = $('musicBtn');
if (musicBtn) musicBtn.addEventListener('click', openMusicScreen);

const setMusicBtn = $('setMusicBtn');
if (setMusicBtn) setMusicBtn.addEventListener('click', openMusicScreen);

const musicBackBtn = $('musicBack');
if (musicBackBtn) musicBackBtn.addEventListener('click', closeMusicScreen);

const selectAllBtn = $('selectAllTracks');
if (selectAllBtn) {
  selectAllBtn.addEventListener('click', () => {
    audio();
    userPlaylist = MUSIC_TRACKS.map(t => t.id);
    saveUserPlaylist(userPlaylist);
    updatePlaylistUI();
    snd('click');
  });
}

const deselectAllBtn = $('deselectAllTracks');
if (deselectAllBtn) {
  deselectAllBtn.addEventListener('click', () => {
    audio();
    // Giữ lại bài mặc định đầu tiên
    userPlaylist = [MUSIC_TRACKS[0].id];
    saveUserPlaylist(userPlaylist);
    updatePlaylistUI();
    snd('click');
  });
}

const refreshTracksBtn = $('refreshTracksBtn');
if (refreshTracksBtn) {
  refreshTracksBtn.addEventListener('click', () => {
    audio();
    if (typeof syncMusicTracks === 'function') syncMusicTracks(true);
    snd('click');
  });
}

const musicFileInput = $('musicFileInput');
if (musicFileInput) {
  musicFileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    audio();
    let uploadedCount = 0;

    for (const file of files) {
      try {
        const res = await fetch('/api/upload-track', {
          method: 'POST',
          headers: { 'x-filename': encodeURIComponent(file.name) },
          body: file
        });
        if (res.ok) {
          uploadedCount++;
        } else {
          throw new Error('Upload fallback');
        }
      } catch (err) {
        // Fallback offline qua Blob URL nếu không có server
        const blobUrl = URL.createObjectURL(file);
        const trkId = 'track_' + encodeURIComponent(file.name);
        if (!MUSIC_TRACKS.some(t => t.id === trkId)) {
          MUSIC_TRACKS.push({
            id: trkId,
            title: file.name.replace(/\.[^/.]+$/, ''),
            file: file.name,
            style: 'Nhạc Tải Lên /file',
            src: blobUrl,
            isFile: true
          });
          userPlaylist.push(trkId);
          uploadedCount++;
        }
      }
    }

    if (typeof syncMusicTracks === 'function') await syncMusicTracks(false);
    saveUserPlaylist(userPlaylist);
    if (typeof updatePlaylistUI === 'function') updatePlaylistUI();
    if (typeof rawToast === 'function') rawToast(`🎵 Đã thêm thành công ${uploadedCount} bài hát vào Playlist!`);
    musicFileInput.value = '';
  });
}

/* ---------- Xử lý 4 Cấp Độ Khó (Difficulty Selection Logic) ---------- */
function setDifficulty(diffId, broadcast = true) {
  if (typeof DIFFICULTIES === 'undefined' || !DIFFICULTIES[diffId]) return;
  currentDifficulty = diffId;
  try { localStorage.setItem('rechoice-difficulty', diffId); } catch (e) {}
  updateDifficultyUI();
  if (broadcast && NET.mode === 'host' && typeof Net !== 'undefined') {
    Net.send({ t: 'diff', diff: diffId });
  }
}

function updateDifficultyUI() {
  if (typeof diffCfg !== 'function') return;
  const cfg = diffCfg();
  const diffBtns = document.querySelectorAll('.diff-btn');
  diffBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.diff === currentDifficulty);
  });
  const descEl = $('diffDesc');
  if (descEl) descEl.textContent = `${cfg.badge}: ${cfg.desc}`;

  const lobBadge = $('lobbyDiffBadge');
  if (lobBadge) {
    lobBadge.textContent = cfg.badge;
    lobBadge.style.color = cfg.color;
  }
}

document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    setDifficulty(btn.dataset.diff, true);
    snd('click');
  });
});

const lobDiffBtn = $('lobbyDiffBtn');
if (lobDiffBtn) {
  lobDiffBtn.addEventListener('click', () => {
    if (NET.mode !== 'host') {
      if (typeof rawToast === 'function') rawToast('Chỉ chủ phòng mới có quyền đổi độ khó!');
      return;
    }
    const order = ['easy', 'normal', 'hard', 'nightmare'];
    const nextIdx = (order.indexOf(currentDifficulty) + 1) % order.length;
    setDifficulty(order[nextIdx], true);
    snd('click');
  });
}
updateDifficultyUI();
