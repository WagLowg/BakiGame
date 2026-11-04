// Kết nối tới máy chủ ReChoice bằng WebSocket.
// game.js dùng: Net.available(), Net.connect(), Net.send(obj), Net.close(), Net.on('msg'|'close', fn)
window.Net = (() => {
  let ws = null;
  const handlers = {};

  // Chỉ chơi online được khi trang mở qua máy chủ (http/https), không phải mở file trực tiếp.
  function available() {
    return location.protocol === 'http:' || location.protocol === 'https:';
  }

  function connect() {
    return new Promise((resolve, reject) => {
      if (ws && ws.readyState === 1) return resolve();
      if (ws) { ws.onclose = null; ws.close(); ws = null; }
      const url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
      const sock = new WebSocket(url);
      let opened = false;
      sock.onopen = () => { opened = true; ws = sock; resolve(); };
      sock.onerror = () => { if (!opened) reject(new Error('Không kết nối được máy chủ.')); };
      sock.onclose = () => {
        if (ws === sock) ws = null;
        if (opened && handlers.close) handlers.close();
      };
      sock.onmessage = e => {
        let m;
        try { m = JSON.parse(e.data); } catch { return; }
        if (handlers.msg) handlers.msg(m);
      };
    });
  }

  function send(obj) {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
  }

  function close() {
    if (!ws) return;
    const sock = ws;
    ws = null;
    sock.onclose = null;
    try { sock.send(JSON.stringify({ t: 'leave' })); } catch {}
    sock.close();
  }

  return { available, connect, send, close, on: (k, fn) => { handlers[k] = fn; } };
})();
