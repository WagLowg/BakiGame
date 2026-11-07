/* ==========================================================================
   ReChoice - js/ui/controls.js
   Xử lý Đầu vào Điều khiển: Bàn phím, Chuột, Cần ảo cảm ứng (Virtual Sticks)
   ========================================================================== */
'use strict';

const keys = {};
const mouse = { x: 0, y: 0, down: false };
const sticks = {
  L: { id: null, ox: 0, oy: 0, x: 0, y: 0, el: $('ls') },
  R: { id: null, ox: 0, oy: 0, x: 0, y: 0, el: $('rs') }
};

function moveInput() {
  let x = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  let z = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
  if (sticks.L.id !== null) { x += sticks.L.x; z += sticks.L.y; }
  const l = Math.hypot(x, z);
  if (l > 1) { x /= l; z /= l; }
  return { x, z };
}

const typing = e => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');

addEventListener('keydown', e => {
  if (typing(e)) {
    if (e.code === 'Enter') {
      if (e.target.id === 'codeIn') $('joinBtn').click();
      else if (e.target.id === 'nameIn') $('createBtn').click();
      else if (e.target.id === 'saveName') $('saveBtn').click();
    }
    return;
  }
  keys[e.code] = true;
  if (e.code === 'Space') { e.preventDefault(); dash(); }
  if (e.code === 'KeyQ' || e.code === 'KeyE') { e.preventDefault(); useUltimate(); }
  if (e.code === 'KeyF' && state === 'play' && !ovl) {
    autoFire = !autoFire;
    rawBanner(autoFire ? 'TỰ BẮN: BẬT' : 'TỰ BẮN: TẮT', '');
  }
  if (e.code === 'KeyM') toggleMute();
  if (e.code === 'KeyN' && ['play', 'levelup', 'menu'].includes(state)) {
    if (typeof bgmNext === 'function') bgmNext(false);
  }
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (!$('settings').hidden) { closeSettings(); return; }
    if (online()) { if (['play', 'levelup', 'dying'].includes(state)) ovl ? resume() : pause(); }
    else if (state === 'play') pause(); else if (state === 'pause') resume();
  }
  if (state === 'levelup' && !ovl && /^Digit[1-3]$/.test(e.code)) choose(+e.code.slice(5) - 1);
  if (e.code === 'Enter') {
    if (state === 'menu' && !$('menu').hidden) start();
    else if (state === 'over' && isHost() && !$('againBtn').hidden) $('againBtn').click();
  }
});

addEventListener('keyup', e => keys[e.code] = false);
addEventListener('blur', () => {
  for (const k in keys) keys[k] = false;
  mouse.down = false;
  if (state === 'play' && !online()) pause();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'play' && !online()) pause();
});

canvas.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
canvas.addEventListener('mousedown', e => {
  audio();
  if (e.button === 2) { dash(); return; }
  mouse.down = true;
});
addEventListener('mouseup', () => mouse.down = false);
canvas.addEventListener('contextmenu', e => e.preventDefault());

/* ---------- Cảm ứng Mobile ---------- */
function enableTouchControls() {
  isTouch = true;
  const d = $('dashBtn'); if (d) d.classList.add('on');
  const u = $('ultBtn'); if (u) u.classList.add('on');
  canvas.classList.remove('aiming');
}
if (isTouch) enableTouchControls();

canvas.addEventListener('touchstart', e => {
  e.preventDefault(); audio();
  if (!isTouch || !$('dashBtn').classList.contains('on')) {
    enableTouchControls();
  }
  for (const t of e.changedTouches) {
    const s = t.clientX < innerWidth / 2 ? sticks.L : sticks.R;
    if (s.id !== null) continue;
    s.id = t.identifier; s.ox = t.clientX; s.oy = t.clientY; s.x = s.y = 0;
    s.el.style.left = s.ox + 'px'; s.el.style.top = s.oy + 'px'; s.el.hidden = false; s.el.firstElementChild.style.transform = '';
  }
}, { passive: false });

addEventListener('touchmove', e => {
  for (const t of e.changedTouches) for (const k of ['L', 'R']) {
    const s = sticks[k]; if (s.id !== t.identifier) continue;
    let dx = t.clientX - s.ox, dy = t.clientY - s.oy;
    const d = Math.hypot(dx, dy), m = Math.min(d, 48);
    if (d > 0) { dx = dx / d * m; dy = dy / d * m; }
    s.x = dx / 48; s.y = dy / 48;
    s.el.firstElementChild.style.transform = `translate(${dx}px,${dy}px)`;
  }
}, { passive: true });

function endTouch(e) {
  for (const t of e.changedTouches) for (const k of ['L', 'R']) {
    const s = sticks[k];
    if (s.id === t.identifier) { s.id = null; s.x = s.y = 0; s.el.hidden = true; }
  }
}
addEventListener('touchend', endTouch);
addEventListener('touchcancel', endTouch);

$('dashBtn').addEventListener('touchstart', e => {
  e.preventDefault();
  e.stopPropagation();
  dash();
}, { passive: false });
$('dashBtn').addEventListener('click', e => {
  e.stopPropagation();
  dash();
});

if ($('ultBtn')) {
  $('ultBtn').addEventListener('touchstart', e => {
    e.preventDefault();
    e.stopPropagation();
    useUltimate();
  }, { passive: false });
  $('ultBtn').addEventListener('click', e => {
    e.stopPropagation();
    useUltimate();
  });
}
