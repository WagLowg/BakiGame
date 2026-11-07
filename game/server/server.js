// Máy chủ ReChoice: phục vụ các file game, chuyển tin nhắn giữa người chơi trong cùng phòng,
// và lưu bảng xếp hạng "Vua trò chơi".
// Chạy: npm install  (một lần)  rồi  npm start   → mở http://localhost:3000
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, '..');                     // game/  → thư mục gốc của web
const MUSIC_DIR = path.join(__dirname, '..', '..', 'music'); // music/ ở thư mục gốc dự án → phục vụ tại /music/*
const MAX_PLAYERS = 4;

/* ---------- phục vụ file tĩnh ---------- */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json'
};
// Chặn cả thư mục server/ (mã máy chủ + scores.json) không cho trình duyệt tải về.
const BLOCKED = new Set(['server', 'node_modules']);

function resolveFile(urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath.split('?')[0]); } catch { return null; }
  if (p === '/' || p === '') p = '/index.html';
  const rel = path.normalize(p).replace(/^[/\\]+/, '');
  const parts = rel.split(/[/\\]/);
  if (parts.some(s => s === '..' || s.startsWith('.'))) return null;
  if (BLOCKED.has(parts[0])) return null;
  if (!MIME[path.extname(rel).toLowerCase()]) return null;
  if (parts[0] === 'music') {
    const p1 = path.join(MUSIC_DIR, ...parts.slice(1));
    if (fs.existsSync(p1)) return p1;
    const p2 = path.join(ROOT, 'music', ...parts.slice(1));
    if (fs.existsSync(p2)) return p2;
    return p1;
  }
  return path.join(ROOT, rel);
}

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function notFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Không tìm thấy');
}

function serveStatic(req, res) {
  const file = resolveFile(req.url || '/');
  if (!file) return notFound(res);
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return notFound(res);
    const type = MIME[path.extname(file).toLowerCase()];
    const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
    if (range) {
      let start = range[1] ? +range[1] : 0;
      let end = range[2] ? +range[2] : st.size - 1;
      if (!range[1] && range[2]) { start = st.size - +range[2]; end = st.size - 1; }
      end = Math.min(end, st.size - 1);
      if (start < 0 || start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${st.size}` });
        return res.end();
      }
      res.writeHead(206, {
        'Content-Type': type, 'Content-Length': end - start + 1,
        'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Accept-Ranges': 'bytes'
      });
      if (req.method === 'HEAD') return res.end();
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

/* ---------- bảng xếp hạng "Vua trò chơi" ----------
   Mặc định lưu vào file scores.json cạnh server.js.
   Trên Render gói miễn phí, file này bị xóa mỗi khi máy chủ khởi động lại.
   Muốn giữ điểm vĩnh viễn: tạo một cơ sở dữ liệu Redis miễn phí ở upstash.com rồi đặt 2 biến môi trường
   UPSTASH_REDIS_REST_URL và UPSTASH_REDIS_REST_TOKEN trên Render (xem README.md). */
const SCORES_FILE = path.join(__dirname, 'scores.json');
const SCORES_KEY = 'rechoice:scores';
const MAX_ENTRIES = 100;
const UP_URL = process.env.UPSTASH_REDIS_REST_URL;
const UP_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const storage = UP_URL && UP_TOKEN ? 'upstash' : 'file';

async function upstash(cmd) {
  const r = await fetch(UP_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  if (!r.ok) throw new Error('upstash ' + r.status);
  return (await r.json()).result;
}

let cache = null;
async function loadScores() {
  if (cache) return cache;
  try {
    if (storage === 'upstash') {
      const raw = await upstash(['GET', SCORES_KEY]);
      cache = raw ? JSON.parse(raw) : [];
    } else {
      cache = fs.existsSync(SCORES_FILE) ? JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8')) : [];
    }
  } catch (e) {
    console.error('Không đọc được bảng xếp hạng:', e.message);
    cache = [];
  }
  if (!Array.isArray(cache)) cache = [];
  return cache;
}
async function saveScores(list) {
  cache = list;
  const raw = JSON.stringify(list);
  if (storage === 'upstash') await upstash(['SET', SCORES_KEY, raw]);
  else await fs.promises.writeFile(SCORES_FILE, raw);
}

// ghi lần lượt để hai người gửi cùng lúc không đè lên nhau
let queue = Promise.resolve();
function serial(fn) { const p = queue.then(fn, fn); queue = p.catch(() => {}); return p; }

const lastPost = new Map();
function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
}
function readBody(req, limit = 4096) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
const cleanText = (s, n) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);

async function handleScores(req, res) {
  if (req.method === 'GET') {
    const list = await loadScores();
    return sendJson(res, 200, { top: list.slice(0, 50), storage });
  }
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Không hỗ trợ.' });

  const ip = clientIp(req), now = Date.now();
  if (now - (lastPost.get(ip) || 0) < 8000) return sendJson(res, 429, { error: 'Gửi điểm quá nhanh, thử lại sau vài giây.' });
  lastPost.set(ip, now);

  let b;
  try { b = JSON.parse(await readBody(req)); } catch { return sendJson(res, 400, { error: 'Dữ liệu không hợp lệ.' }); }
  const name = cleanText(b.name, 40);
  const score = Math.floor(+b.score);
  const wave = Math.floor(+b.wave);
  if (!name) return sendJson(res, 400, { error: 'Thiếu tên.' });
  if (!Number.isFinite(score) || score < 0 || !Number.isFinite(wave) || wave < 1 || wave > 100000)
    return sendJson(res, 400, { error: 'Điểm không hợp lệ.' });
  if (score > wave * 25000 + 200000) return sendJson(res, 400, { error: 'Điểm không hợp lệ.' });

  const entry = {
    name, score, wave,
    level: Math.max(1, Math.floor(+b.level) || 1),
    kills: Math.max(0, Math.floor(+b.kills) || 0),
    team: Math.min(4, Math.max(1, Math.floor(+b.team) || 1)),
    wins: Math.max(0, Math.floor(+b.wins) || 0),
    date: new Date().toISOString().slice(0, 10)
  };

  try {
    const out = await serial(async () => {
      const list = (await loadScores()).slice();
      list.push(entry);
      list.sort((a, c) => c.score - a.score);
      const rank = list.indexOf(entry) + 1;
      const kept = list.slice(0, MAX_ENTRIES);
      await saveScores(kept);
      return { rank: rank <= MAX_ENTRIES ? rank : 0, top: kept.slice(0, 50) };
    });
    sendJson(res, 200, { ok: true, ...out });
  } catch (e) {
    console.error('Không lưu được điểm:', e.message);
    sendJson(res, 500, { error: 'Máy chủ không lưu được điểm.' });
  }
}

/* ---------- Quản lý thư viện nhạc /music động ---------- */
let musicScanner = null;
try { musicScanner = require('./scan-music'); } catch (e) {}

const AUDIO_EXTS = musicScanner ? musicScanner.AUDIO_EXTS : new Set(['.mp3', '.ogg', '.wav', '.m4a', '.aac', '.flac']);

function scanMusicDir() {
  if (musicScanner && typeof musicScanner.scan === 'function') {
    return musicScanner.scan();
  }
  try {
    if (!fs.existsSync(MUSIC_DIR)) fs.mkdirSync(MUSIC_DIR, { recursive: true });
    const files = fs.readdirSync(MUSIC_DIR);
    const tracks = [];
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (AUDIO_EXTS.has(ext)) {
        tracks.push({
          file: file,
          title: file.replace(/\.[^/.]+$/, ''),
          style: 'Nhạc /music',
          src: '/music/' + encodeURIComponent(file)
        });
      }
    }
    return tracks;
  } catch (err) {
    console.error('Không thể quét thư mục music/:', err.message);
    return [];
  }
}

function updateStaticMusicJson() {
  return scanMusicDir();
}

const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];

  if (url === '/api/scores') {
    handleScores(req, res).catch(e => { console.error(e); sendJson(res, 500, { error: 'Lỗi máy chủ.' }); });
    return;
  }

  // API lấy danh sách bài hát động trong thư mục music/
  if (url === '/api/tracks' && req.method === 'GET') {
    const tracks = scanMusicDir();
    return sendJson(res, 200, { ok: true, tracks });
  }

  // API upload bài hát mới từ trình duyệt lưu thẳng vào thư mục music/
  if (url === '/api/upload-track' && req.method === 'POST') {
    const rawFileName = req.headers['x-filename'] || ('track_' + Date.now() + '.mp3');
    let fileName = decodeURIComponent(rawFileName).replace(/[/\\?%*:|"<>]/g, '_');
    const ext = path.extname(fileName).toLowerCase();
    if (!AUDIO_EXTS.has(ext)) {
      return sendJson(res, 400, { error: 'Chỉ chấp nhận các file âm thanh (.mp3, .ogg, .wav, .m4a, .aac, .flac)' });
    }
    if (!fs.existsSync(MUSIC_DIR)) fs.mkdirSync(MUSIC_DIR, { recursive: true });
    const filePath = path.join(MUSIC_DIR, fileName);
    const writeStream = fs.createWriteStream(filePath);
    req.pipe(writeStream);
    writeStream.on('finish', () => {
      console.log(`[Music] Đã tải lên file mới vào thư mục music/: ${fileName}`);
      const tracks = updateStaticMusicJson();
      sendJson(res, 200, { ok: true, file: fileName, tracks });
      for (const ws of wss.clients) {
        if (ws.readyState === 1) send(ws, { t: 'tracksUpdated', tracks });
      }
    });
    writeStream.on('error', (err) => {
      sendJson(res, 500, { error: 'Không thể lưu file: ' + err.message });
    });
    return;
  }

  serveStatic(req, res);
});

/* ---------- phòng chơi ---------- */
// Người tạo phòng là "chủ phòng": máy của họ chạy toàn bộ trận đấu.
// Máy chủ chỉ chuyển tin: khách → chủ phòng, chủ phòng → một khách (có "to") hoặc tất cả khách.
const rooms = new Map();
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

function newCode() {
  let c;
  do { c = Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join(''); }
  while (rooms.has(c));
  return c;
}
function newId() { return Math.random().toString(36).slice(2, 8); }
function cleanName(n) { return cleanText(n, 14) || 'Phi công'; }
function send(ws, obj) { if (ws && ws.readyState === 1) ws.send(typeof obj === 'string' ? obj : JSON.stringify(obj)); }

function leave(ws) {
  const room = ws.room;
  if (!room) return;
  ws.room = null;
  if (room.host === ws) {
    for (const p of room.peers.values()) if (p !== ws) { p.room = null; send(p, { t: 'hostleft' }); }
    rooms.delete(room.code);
  } else {
    room.peers.delete(ws.id);
    send(room.host, { t: 'peer-', id: ws.id });
  }
}

const wss = new WebSocketServer({ server, maxPayload: 256 * 1024 });

wss.on('connection', ws => {
  ws.id = newId();
  ws.room = null;
  ws.alive = true;
  ws.on('pong', () => { ws.alive = true; });

  ws.on('message', raw => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m.t !== 'string') return;

    if (m.t === 'create') {
      if (ws.room) return;
      const room = { code: newCode(), host: ws, peers: new Map([[ws.id, ws]]) };
      rooms.set(room.code, room);
      ws.room = room;
      ws.shipClass = m.shipClass || 'striker';
      return send(ws, { t: 'created', code: room.code, id: ws.id });
    }

    if (m.t === 'join') {
      if (ws.room) return;
      const room = rooms.get(String(m.code || '').toUpperCase().trim());
      if (!room) return send(ws, { t: 'error', msg: 'Không tìm thấy phòng với mã này.' });
      if (room.peers.size >= MAX_PLAYERS) return send(ws, { t: 'error', msg: 'Phòng đã đủ 4 người.' });
      room.peers.set(ws.id, ws);
      ws.room = room;
      ws.shipClass = m.shipClass || 'striker';
      send(ws, { t: 'joined', code: room.code, id: ws.id, hostId: room.host.id });
      return send(room.host, { t: 'peer+', id: ws.id, name: cleanName(m.name), shipClass: ws.shipClass });
    }

    if (m.t === 'leave') return leave(ws);

    const room = ws.room;
    if (!room) return;
    if (ws === room.host) {
      if (m.to) {
        const target = room.peers.get(m.to);
        if (target && target !== ws) send(target, raw.toString());
      } else {
        const s = raw.toString();
        for (const p of room.peers.values()) if (p !== ws) send(p, s);
      }
    } else {
      m.from = ws.id;
      send(room.host, m);
    }
  });

  ws.on('close', () => leave(ws));
  ws.on('error', () => leave(ws));
});

setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.alive) { ws.terminate(); continue; }
    ws.alive = false;
    try { ws.ping(); } catch {}
  }
}, 30000);

server.listen(PORT, () => {
  console.log(`ReChoice đang chạy: http://localhost:${PORT}`);
  console.log(`Bảng xếp hạng lưu ở: ${storage === 'upstash' ? 'Upstash Redis (vĩnh viễn)' : 'file scores.json (mất khi máy chủ khởi động lại)'}`);

  // Quét và cập nhật danh sách nhạc nền ban đầu
  const initialTracks = updateStaticMusicJson();
  console.log(`[Music] Đã quét thư mục music/: tìm thấy ${initialTracks.length} bài hát.`);

  // Tự động theo dõi thư mục music/ khi người dùng copy/paste bài mới vào máy
  try {
    if (fs.existsSync(MUSIC_DIR)) {
      let watchDebounce = null;
      fs.watch(MUSIC_DIR, (eventType, filename) => {
        clearTimeout(watchDebounce);
        watchDebounce = setTimeout(() => {
          console.log(`[Music] Thư mục music/ đã thay đổi (${eventType}: ${filename || ''}), đang cập nhật...`);
          const updated = updateStaticMusicJson();
          for (const ws of wss.clients) {
            if (ws.readyState === 1) send(ws, { t: 'tracksUpdated', tracks: updated });
          }
        }, 500);
      });
      console.log(`[Music] Đang tự động theo dõi thư mục: ${MUSIC_DIR}`);
    }
  } catch (e) {
    console.warn('[Music] Không thể tự động theo dõi thư mục music/:', e.message);
  }
});
