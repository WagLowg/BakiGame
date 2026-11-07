// Script tự động quét folder music/ và sinh file game/music-list.json
// Chạy độc lập: node game/server/scan-music.js hoặc tự động qua npm start / build
const fs = require('fs');
const path = require('path');

const AUDIO_EXTS = new Set(['.mp3', '.ogg', '.wav', '.m4a', '.aac', '.flac']);

const ROOT_MUSIC = path.join(__dirname, '..', '..', 'music');
const GAME_MUSIC = path.join(__dirname, '..', 'music');
const TARGET_JSON = path.join(__dirname, '..', 'music-list.json');

function cleanTitle(filename) {
  let name = filename.replace(/\.[^/.]+$/, '');
  // Loại bỏ các thẻ thừa phổ biến khi tải nhạc từ YouTube/Tiktok
  name = name.replace(/\s*\(.*?Tiktok.*?\)/gi, '');
  name = name.replace(/\s*\(.*?Official.*?\)/gi, '');
  name = name.replace(/\s*\[.*?Official.*?\]/gi, '');
  name = name.replace(/\s*LYRIC\s*VIDEO/gi, '');
  name = name.replace(/\s*OFFICIAL\s*AUDIO/gi, '');
  name = name.replace(/\s*FULL\s*SET.*?20\d\d/gi, '');
  name = name.replace(/\s*-\s*Nam\s*D$/gi, '');
  name = name.replace(/\s{2,}/g, ' ').trim();
  return name || filename.replace(/\.[^/.]+$/, '');
}

function scan() {
  const dirs = [ROOT_MUSIC, GAME_MUSIC];
  const map = new Map();

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (AUDIO_EXTS.has(ext)) {
          if (!map.has(file)) {
            map.set(file, {
              file: file,
              title: cleanTitle(file),
              style: 'Nhạc Không Gian /music',
              src: encodeURI('../music/' + file)
            });
          }
        }
      }
    } catch (e) {
      console.warn(`[Music Scan] Không thể đọc thư mục ${dir}:`, e.message);
    }
  }

  const tracks = Array.from(map.values());
  // Đưa bài mặc định nhac-nen.mp3 lên đầu nếu có
  tracks.sort((a, b) => {
    if (a.file === 'nhac-nen.mp3') return -1;
    if (b.file === 'nhac-nen.mp3') return 1;
    return a.title.localeCompare(b.title, 'vi');
  });

  try {
    fs.writeFileSync(TARGET_JSON, JSON.stringify(tracks, null, 2), 'utf-8');
    console.log(`[Music Scan] ✅ Đã quét thành công ${tracks.length} bài hát và lưu vào game/music-list.json!`);
    tracks.forEach((t, i) => console.log(`   ${i + 1}. [${t.title}] (${t.file})`));
  } catch (err) {
    console.error('[Music Scan] ❌ Lỗi khi ghi file music-list.json:', err.message);
  }

  return tracks;
}

if (require.main === module) {
  scan();
}

module.exports = { scan, cleanTitle, AUDIO_EXTS };
