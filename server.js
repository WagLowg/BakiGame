// Máy chủ Voidcore: phục vụ các file game và chuyển tin nhắn giữa người chơi trong cùng phòng.
// Chạy: npm install  (một lần)  rồi  npm start   → mở http://localhost:3000
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
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
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};
const BLOCKED = new Set(['node_modules', 'server.js', 'package.json', 'package-lock.json']);

function resolveFile(urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath.split('?')[0]); } catch { return null; }
  if (p === '/' || p === '') p = '/index.html';
  const rel = path.normalize(p).replace(/^[/\\]+/, '');
  const parts = rel.split(/[/\\]/);
  if (parts.some(s => s === '..' || s.startsWith('.'))) return null;
  if (BLOCKED.has(parts[0])) return null;
  if (!MIME[path.extname(rel).toLowerCase()]) return null;
  return path.join(ROOT, rel);
}

function notFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Không tìm thấy');
}

const server = http.createServer((req, res) => {
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
function cleanName(n) { return String(n || '').trim().slice(0, 14) || 'Phi công'; }
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

const wss = new WebSocketServer({ server, maxPayload: 64 * 1024 });

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
      return send(ws, { t: 'created', code: room.code, id: ws.id });
    }

    if (m.t === 'join') {
      if (ws.room) return;
      const room = rooms.get(String(m.code || '').toUpperCase().trim());
      if (!room) return send(ws, { t: 'error', msg: 'Không tìm thấy phòng với mã này.' });
      if (room.peers.size >= MAX_PLAYERS) return send(ws, { t: 'error', msg: 'Phòng đã đủ 4 người.' });
      room.peers.set(ws.id, ws);
      ws.room = room;
      send(ws, { t: 'joined', code: room.code, id: ws.id, hostId: room.host.id });
      return send(room.host, { t: 'peer+', id: ws.id, name: cleanName(m.name) });
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
  console.log(`Voidcore đang chạy: http://localhost:${PORT}`);
});
