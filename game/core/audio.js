/* ==========================================================================
   ReChoice - js/core/audio.js
   Hệ thống âm thanh Web Audio API & Quản lý Nhạc nền (BGM)
   ========================================================================== */
'use strict';

let AC = null;
let master = null;
let noiseBuf = null;
let muted = false;

function audio() {
  if (AC) return AC;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain();
    master.gain.value = 0.32 * SET.sfx / 100;
    master.connect(AC.destination);

    noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) {
    AC = null;
  }
  return AC;
}

function tone(f, d, type = 'square', v = 0.12, slide = 0.5, at = 0, filt = 0) {
  if (!AC || muted) return;
  const t = at || AC.currentTime;
  const o = AC.createOscillator();
  const g = AC.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + d);
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);

  let n = o;
  if (filt) {
    const bq = AC.createBiquadFilter();
    bq.type = 'lowpass';
    bq.frequency.value = filt;
    o.connect(bq);
    n = bq;
  }
  n.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + d + 0.03);
}

function noise(d, v = 0.2, freq = 800, type = 'lowpass', at = 0) {
  if (!AC || muted) return;
  const t = at || AC.currentTime;
  const s = AC.createBufferSource();
  const f = AC.createBiquadFilter();
  const g = AC.createGain();
  s.buffer = noiseBuf;
  f.type = type;
  f.frequency.value = freq;
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(f);
  f.connect(g);
  g.connect(master);
  s.start(t);
  s.stop(t + d + 0.03);
}

let lastShot = 0, lastPick = 0, lastHit = 0, lastLaser = 0;
const sfx = {
  shoot() {
    const n = performance.now();
    if (n - lastShot < 55) return;
    lastShot = n;
    tone(rnd(780, 880), 0.06, 'square', 0.03, 0.4);
    tone(rnd(1500, 1700), 0.04, 'sine', 0.02, 0.6);
  },
  hit() {
    const n = performance.now();
    if (n - lastHit < 40) return;
    lastHit = n;
    tone(320, 0.05, 'triangle', 0.05, 0.6);
  },
  block() {
    const n = performance.now();
    if (n - lastHit < 60) return;
    lastHit = n;
    tone(1900, 0.05, 'square', 0.025, 0.9);
    noise(0.04, 0.05, 5000, 'highpass');
  },
  kill() {
    noise(0.2, 0.16, 1400);
    tone(180, 0.18, 'sawtooth', 0.06, 0.3);
  },
  big() {
    noise(0.7, 0.32, 600);
    tone(90, 0.6, 'sawtooth', 0.13, 0.25);
    tone(45, 0.8, 'sine', 0.2, 0.5);
  },
  pick() {
    const n = performance.now();
    if (n - lastPick < 35) return;
    lastPick = n;
    tone(rnd(1100, 1400), 0.05, 'sine', 0.05, 1.3);
  },
  hurt() {
    noise(0.25, 0.25, 500);
    tone(120, 0.25, 'square', 0.1, 0.4);
  },
  dash() {
    noise(0.2, 0.18, 2400, 'bandpass');
    tone(300, 0.18, 'sine', 0.05, 2.2);
  },
  lvl() {
    if (!AC) return;
    const t = AC.currentTime;
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.09, 1, t + i * 0.07));
  },
  zap() {
    tone(1800, 0.08, 'sawtooth', 0.03, 0.3);
  },
  enemyShot() {
    tone(500, 0.08, 'sine', 0.03, 0.5);
  },
  laser() {
    const n = performance.now();
    if (n - lastLaser < 80) return;
    lastLaser = n;
    tone(220, 0.4, 'sawtooth', 0.06, 2.5, 0, 2400);
    noise(0.3, 0.08, 3000, 'bandpass');
  },
  warn() {
    if (!AC) return;
    const t = AC.currentTime;
    tone(880, 0.12, 'square', 0.05, 1, t);
    tone(880, 0.12, 'square', 0.05, 1, t + 0.18);
  },
  boss() {
    if (!AC) return;
    const t = AC.currentTime;
    [110, 98, 82, 65].forEach((f, i) => tone(f, 0.5, 'sawtooth', 0.11, 0.98, t + i * 0.22, 900));
    noise(1.2, 0.12, 300, 'lowpass', t);
  },
  win() {
    if (!AC) return;
    const t = AC.currentTime;
    [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, 0.3, 'triangle', 0.1, 1, t + i * 0.11));
  },
  steal() {
    tone(900, 0.25, 'square', 0.06, 0.25);
    noise(0.2, 0.1, 2000, 'highpass');
  },
  rewind() {
    if (!AC) return;
    const t = AC.currentTime;
    for (let i = 0; i < 6; i++) tone(1200 - i * 140, 0.08, 'sine', 0.05, 1.4, t + i * 0.05);
  },

  /* Âm thanh Chiêu Cuối & Vật phẩm mới */
  ultReady() {
    if (!AC) return;
    const t = AC.currentTime;
    tone(587, 0.12, 'sine', 0.08, 1.2, t);
    tone(880, 0.22, 'triangle', 0.09, 1.5, t + 0.08);
  },
  ult() {
    noise(0.5, 0.28, 400);
    tone(180, 0.5, 'sawtooth', 0.16, 4.0);
    tone(60, 0.8, 'sine', 0.25, 0.2);
  },
  pickupHeal() {
    if (!AC) return;
    const t = AC.currentTime;
    tone(440, 0.1, 'sine', 0.08, 1.5, t);
    tone(660, 0.15, 'triangle', 0.1, 1.2, t + 0.06);
    tone(880, 0.2, 'sine', 0.1, 1.0, t + 0.12);
  },
  pickupNuke() {
    noise(0.8, 0.35, 300);
    tone(120, 0.7, 'sawtooth', 0.2, 0.2);
  },
  pickupMagnet() {
    tone(800, 0.3, 'sine', 0.1, 3.0);
    noise(0.2, 0.1, 4000, 'bandpass');
  },
  pickupBuff() {
    if (!AC) return;
    const t = AC.currentTime;
    [400, 600, 900, 1200].forEach((f, i) => tone(f, 0.12, 'triangle', 0.08, 1.1, t + i * 0.05));
  },
  reviveTick() {
    tone(880, 0.05, 'sine', 0.03, 1.0);
  },
  reviveDone() {
    if (!AC) return;
    const t = AC.currentTime;
    [330, 440, 660, 880].forEach((f, i) => tone(f, 0.25, 'sine', 0.1, 1.0, t + i * 0.08));
    noise(0.3, 0.15, 1200);
  }
};

function snd(name) {
  if (sfx[name]) sfx[name]();
  if (typeof q === 'function') q(['s', name]);
}

/* ---------- Hệ Thống Thư Viện Nhạc Nền Trong /music & Quản Lý Playlist Tùy Chọn ---------- */
const BGM_MAX = 0.8;

// Helper xây dựng đường dẫn âm thanh tương thích cả 3 môi trường:
// 1. file:/// (mở trực tiếp index.html)
// 2. VS Code Live Server (localhost:5500)
// 3. Node.js Production Server (localhost:3000 hoặc host online)
function getTrackSrc(item) {
  if (item && item.src && item.src.startsWith('blob:')) return item.src;
  const f = typeof item === 'string' ? item : (item.file || '');
  return encodeURI('../music/' + f);
}

function getAltTrackSrc(item) {
  if (item && item.src && item.src.startsWith('blob:')) return item.src;
  const f = typeof item === 'string' ? item : (item.file || '');
  return '/music/' + encodeURIComponent(f);
}

// Danh sách các file nhạc mặc định (đồng bộ từ thư mục music/ của dự án)
const DEFAULT_MUSIC_FILES = [
  { file: 'nhac-nen.mp3', title: 'Nhạc Nền Không Gian', style: 'Nhạc Không Gian /music' },
  { file: 'JACK J97 LIỄU THANH YÊN LYRIC VIDEO Thương má em hồng mình không trong bóng đêm.mp3', title: 'JACK J97 - Liễu Thanh Yên', style: 'Nhạc Trẻ /music' },
  { file: 'Mixtape 3In1 X Parado ( Thái Hoàng X Slex )  Full Set Nhạc Style TH Hot Tiktok Hay Nhất 2025 - Nam D.mp3', title: 'Mixtape 3In1 X Parado (Thái Hoàng x Slex)', style: 'Nhạc Sôi Động /music' },
  { file: 'Mixtape Bình Gold ADAMN x BCDBL x OBGTLH x Trăng Hoa Mây Mưa Thanh Phong Remix.mp3', title: 'Mixtape Bình Gold - Trăng Hoa Mây Mưa Remix', style: 'Vinahouse /music' }
];

let MUSIC_TRACKS = DEFAULT_MUSIC_FILES.map((item, idx) => ({
  id: 'track_' + encodeURIComponent(item.file),
  title: item.title || item.file.replace(/\.[^/.]+$/, ''),
  file: item.file,
  style: item.style || 'Nhạc /music',
  src: getTrackSrc(item),
  isFile: true
}));

const KEY_PLAYLIST = 'rechoice_user_playlist';
const KEY_SEEN = 'rechoice_seen_music_tracks';
let userPlaylist = [];

function getSeenTracks() {
  try {
    const raw = localStorage.getItem(KEY_SEEN);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) {
    return new Set();
  }
}

function saveSeenTracks(seenSet) {
  try {
    localStorage.setItem(KEY_SEEN, JSON.stringify(Array.from(seenSet)));
  } catch (e) {}
}

function initUserPlaylist() {
  const saved = localStorage.getItem(KEY_PLAYLIST);
  let parsed = null;
  try { if (saved) parsed = JSON.parse(saved); } catch (e) {}
  if (Array.isArray(parsed) && parsed.length > 0) {
    userPlaylist = parsed.filter(id => MUSIC_TRACKS.some(t => t.id === id));
  }
  if (!userPlaylist || userPlaylist.length === 0) {
    userPlaylist = MUSIC_TRACKS.map(t => t.id);
  }
}
initUserPlaylist();

function saveUserPlaylist(list) {
  userPlaylist = list && list.length ? list : (MUSIC_TRACKS.length ? [MUSIC_TRACKS[0].id] : []);
  try { localStorage.setItem(KEY_PLAYLIST, JSON.stringify(userPlaylist)); } catch (e) {}
}

/**
 * Tự động đồng bộ toàn bộ file nhạc từ thư mục /music theo thời gian thực.
 * Khi Dev merge bài mới vào folder music/ và deploy, tất cả người chơi
 * đều tự động nhận và phát các bài mới mà không cần thao tác gì!
 */
async function syncMusicTracks(showToast = false) {
  try {
    let list = null;
    // 1. Thử lấy danh sách động từ API của máy chủ
    try {
      const res = await fetch('/api/tracks?t=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.tracks) && data.tracks.length > 0) {
          list = data.tracks;
        }
      }
    } catch (e) {}

    // 2. Nếu không có API (mở file tĩnh), đọc file music-list.json được tự động sinh
    if (!list) {
      try {
        const res2 = await fetch('music-list.json?t=' + Date.now());
        if (res2.ok) {
          const data2 = await res2.json();
          if (Array.isArray(data2) && data2.length > 0) list = data2;
        }
      } catch (e) {}
    }

    if (list && list.length > 0) {
      MUSIC_TRACKS = list.map((item, idx) => ({
        id: 'track_' + encodeURIComponent(item.file || ('idx_' + idx)),
        title: item.title || (item.file ? item.file.replace(/\.[^/.]+$/, '') : ('Bài hát ' + (idx + 1))),
        file: item.file,
        style: item.style || 'Nhạc /music',
        src: item.src ? item.src : getTrackSrc(item),
        isFile: true
      }));

      const seenSet = getSeenTracks();
      const isFirstSession = !localStorage.getItem(KEY_PLAYLIST);

      if (isFirstSession) {
        // Lần đầu vào game: Kích hoạt toàn bộ tất cả bài hát từ thư mục music/
        userPlaylist = MUSIC_TRACKS.map(t => t.id);
        MUSIC_TRACKS.forEach(t => seenSet.add(t.id));
      } else {
        // Người chơi cũ: Bất kỳ bài mới nào vừa được merge/deploy lên server
        // sẽ tự động được thêm vào Playlist chơi ngay lập tức!
        for (const t of MUSIC_TRACKS) {
          if (!seenSet.has(t.id)) {
            if (!userPlaylist.includes(t.id)) {
              userPlaylist.push(t.id);
            }
            seenSet.add(t.id);
          }
        }
      }

      saveSeenTracks(seenSet);
      saveUserPlaylist(userPlaylist);

      if (!currentTrack || !MUSIC_TRACKS.some(t => t.id === currentTrack.id)) {
        currentTrack = MUSIC_TRACKS[0];
      }

      if (typeof updatePlaylistUI === 'function') updatePlaylistUI();

      if (showToast && typeof rawToast === 'function') {
        rawToast(`🎵 Đã cập nhật ${MUSIC_TRACKS.length} bài hát từ folder music/!`);
      }
    }
  } catch (err) {
    console.warn('Lỗi khi đồng bộ nhạc:', err);
  }
}
syncMusicTracks();

const bgm = new Audio();
bgm.loop = false;
bgm.preload = 'auto';
let bgmOk = true;

bgm.addEventListener('error', (e) => {
  bgmOk = false;
  console.warn('Không tải được bài nhạc:', bgm.src, e);
  if (currentTrack && bgm.dataset.triedAlt !== '1') {
    bgm.dataset.triedAlt = '1';
    const alt = getAltTrackSrc(currentTrack);
    console.log('Thử đường dẫn nhạc dự phòng:', alt);
    bgm.src = alt;
    bgm.load();
    bgm.play().catch(() => {});
  }
});

// Tự động chuyển sang bài tiếp theo trong Playlist khi bài phát hết
bgm.addEventListener('ended', () => {
  bgmNext(true);
});

let currentPlaylistIdx = 0;
let currentTrack = MUSIC_TRACKS[0];
let isBgmPlaying = false;
let previewAudio = null;
let previewingTrackId = null;

function applyVolume() {
  const vol = clamp(BGM_MAX * (typeof SET !== 'undefined' ? SET.music : 60) / 100, 0, 1);
  bgm.volume = vol;
  if (previewAudio) previewAudio.volume = vol;
  if (master && typeof SET !== 'undefined') master.gain.value = 0.32 * SET.sfx / 100;
}
applyVolume();

function getActivePlaylistTracks() {
  const valid = MUSIC_TRACKS.filter(t => userPlaylist.includes(t.id));
  return valid.length ? valid : (MUSIC_TRACKS.length ? MUSIC_TRACKS : [MUSIC_TRACKS[0]]);
}

function bgmPlay() {
  if (muted || (typeof SET !== 'undefined' && SET.music <= 0)) return;
  const list = getActivePlaylistTracks();
  if (currentPlaylistIdx >= list.length) currentPlaylistIdx = 0;
  currentTrack = list[currentPlaylistIdx];

  isBgmPlaying = true;
  stopPreview();

  if (currentTrack) {
    const primarySrc = currentTrack.src || getTrackSrc(currentTrack);
    const fallbackSrc = getAltTrackSrc(currentTrack);

    if (bgm.dataset.trackId !== currentTrack.id) {
      bgm.src = primarySrc;
      bgm.dataset.trackId = currentTrack.id;
      bgm.dataset.triedAlt = '0';
      bgm.load();
    }
    const p = bgm.play();
    if (p && p.catch) {
      p.catch(err => {
        console.warn('bgm.play error, thử fallback:', err);
        if (bgm.dataset.triedAlt !== '1') {
          bgm.dataset.triedAlt = '1';
          bgm.src = fallbackSrc;
          bgm.play().catch(() => {});
        }
      });
    }
  }
}

function bgmPause() {
  isBgmPlaying = false;
  bgm.pause();
}

function bgmNext(auto = false) {
  const list = getActivePlaylistTracks();
  currentPlaylistIdx++;
  // Khi hết danh sách -> Tự động quay lại bài đầu tiên (Looping playlist tuần hoàn)
  if (currentPlaylistIdx >= list.length) {
    currentPlaylistIdx = 0;
  }

  const trk = list[currentPlaylistIdx];
  currentTrack = trk;
  isBgmPlaying = true;
  stopPreview();

  // Nếu bài kế tiếp là bài hiện tại (ví dụ người chơi chỉ chọn đúng 1 bài trong playlist)
  if (bgm.dataset.trackId === currentTrack.id) {
    bgm.currentTime = 0;
    const p = bgm.play();
    if (p && p.catch) p.catch(() => {});
  } else {
    bgm.src = currentTrack.src || getTrackSrc(currentTrack);
    bgm.dataset.trackId = currentTrack.id;
    bgm.dataset.triedAlt = '0';
    bgm.load();
    const p = bgm.play();
    if (p && p.catch) {
      p.catch(() => {
        bgm.src = getAltTrackSrc(currentTrack);
        bgm.play().catch(() => {});
      });
    }
  }

  const info = `${trk.title} (${currentPlaylistIdx + 1}/${list.length})`;
  if (typeof rawToast === 'function') {
    rawToast(`🎵 ${auto ? 'Bài tiếp theo' : 'Đổi bài'}: ${info}`);
  }
}

function bgmPrev() {
  const list = getActivePlaylistTracks();
  currentPlaylistIdx--;
  if (currentPlaylistIdx < 0) {
    currentPlaylistIdx = list.length - 1;
  }

  const trk = list[currentPlaylistIdx];
  currentTrack = trk;
  isBgmPlaying = true;
  stopPreview();

  if (bgm.dataset.trackId === currentTrack.id) {
    bgm.currentTime = 0;
    const p = bgm.play();
    if (p && p.catch) p.catch(() => {});
  } else {
    bgm.src = currentTrack.src || getTrackSrc(currentTrack);
    bgm.dataset.trackId = currentTrack.id;
    bgm.dataset.triedAlt = '0';
    bgm.load();
    const p = bgm.play();
    if (p && p.catch) {
      p.catch(() => {
        bgm.src = getAltTrackSrc(currentTrack);
        bgm.play().catch(() => {});
      });
    }
  }

  const info = `${trk.title} (${currentPlaylistIdx + 1}/${list.length})`;
  if (typeof rawToast === 'function') {
    rawToast(`🎵 Bài trước: ${info}`);
  }
}

function stopPreview() {
  if (previewAudio) {
    previewAudio.pause();
    previewAudio = null;
  }
  previewingTrackId = null;
  if (typeof updatePlaylistUI === 'function') updatePlaylistUI();
}

function previewTrack(id) {
  audio();
  if (AC && AC.state === 'suspended') AC.resume();
  if (previewingTrackId === id) {
    stopPreview();
    return;
  }
  stopPreview();
  bgmPause();

  const trk = MUSIC_TRACKS.find(t => t.id === id);
  if (!trk) return;

  previewingTrackId = id;
  const primarySrc = trk.src || getTrackSrc(trk);
  const fallbackSrc = getAltTrackSrc(trk);

  previewAudio = new Audio(primarySrc);
  previewAudio.volume = clamp(BGM_MAX * (typeof SET !== 'undefined' ? SET.music : 60) / 100, 0, 1);

  let triedAlt = false;
  previewAudio.addEventListener('error', (e) => {
    if (!triedAlt && primarySrc !== fallbackSrc) {
      triedAlt = true;
      console.warn('Preview fallback URL:', fallbackSrc);
      previewAudio.src = fallbackSrc;
      previewAudio.load();
      previewAudio.play().catch(err => console.warn('Cả 2 đường dẫn nhạc đều lỗi:', err));
    }
  });

  const p = previewAudio.play();
  if (p && p.catch) {
    p.catch(err => {
      console.warn('Không thể tự phát preview:', err);
      if (!triedAlt) {
        triedAlt = true;
        previewAudio.src = fallbackSrc;
        previewAudio.play().catch(() => {});
      }
    });
  }
  previewAudio.onended = () => stopPreview();

  if (typeof updatePlaylistUI === 'function') updatePlaylistUI();
}

function music(dt = 0.016) {
  // Nhạc nền hiện được phát 100% bằng file audio thực tế trong /music
}
