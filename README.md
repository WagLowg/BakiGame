# Voidcore

Game bắn tàu vũ trụ 3D chạy trên trình duyệt (Three.js). Chơi một mình, hoặc 2–4 người cùng phe qua mạng.

## Chơi một mình
Mở `index.html` bằng Chrome, Edge hoặc Firefox. Cần có mạng để tải Three.js và phông chữ.

## Chơi online trên máy của bạn
1. Cài Node.js (bản 18 trở lên) từ https://nodejs.org.
2. Mở thư mục BakiGame trong VS Code, mở Terminal (Ctrl + `) và gõ:
   ```
   npm install
   npm start
   ```
3. Mở trình duyệt vào `http://localhost:3000`, bấm **CHƠI ONLINE** → **Tạo phòng**.
4. Người khác cùng Wi-Fi mở `http://<IP máy bạn>:3000` (xem IP bằng lệnh `ipconfig`, dòng IPv4), bấm **CHƠI ONLINE**, nhập mã phòng 4 chữ và bấm **Vào**.

Tắt máy chủ: bấm Ctrl + C trong Terminal.

## Đưa lên internet để bạn bè ở xa cùng chơi (miễn phí, dùng Render)
1. Tạo tài khoản GitHub, tạo một repository mới và tải toàn bộ thư mục BakiGame lên (trừ `node_modules`).
2. Tạo tài khoản ở https://render.com → **New** → **Web Service** → chọn repository vừa tạo.
3. Điền:
   - Runtime: **Node**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: **Free**
4. Bấm **Create Web Service**. Khi xong, Render cho một đường link dạng `https://ten-game.onrender.com`. Gửi link đó cho bạn bè.

Gói miễn phí của Render sẽ "ngủ" khi không ai vào khoảng 15 phút; lần mở đầu tiên sau đó mất chừng 30–60 giây để thức dậy.

Lưu ý: bài nhạc nền trong `music/` có bản quyền. Nếu đưa game lên internet cho người khác chơi, nên thay bằng nhạc miễn phí bản quyền.

## Cách chơi online
- Một người **Tạo phòng** (chủ phòng), những người khác nhập mã phòng để vào. Tối đa 4 người.
- Cả đội chung điểm, chung đợt, chung thanh kinh nghiệm. Khi lên cấp, trận tạm dừng và mỗi người tự chọn nâng cấp cho tàu mình (sau 25 giây sẽ tự chọn ngẫu nhiên).
- Tàu vỡ sẽ hồi sinh ở đầu đợt sau với nửa giáp. Thua khi cả đội vỡ hết.
- Càng nhiều người thì kẻ địch càng đông và trâu hơn.
- Người vào giữa trận sẽ nhảy thẳng vào trận đang chạy.
- Nút II / phím Esc khi chơi online chỉ mở menu, trận vẫn tiếp tục. Nếu chủ phòng thoát, phòng sẽ đóng.

## Các file
- `index.html` — giao diện: menu, phòng chờ, HUD, màn lên cấp, màn thua.
- `style.css` — màu sắc và bố cục.
- `game.js` — toàn bộ logic game, kể cả phần đồng bộ online.
- `net.js` — kết nối WebSocket tới máy chủ.
- `server.js` — máy chủ: phục vụ file game và chuyển tin nhắn giữa người chơi trong phòng.
- `package.json` — khai báo thư viện `ws` và lệnh `npm start`.
- `music/nhac-nen.mp3` — nhạc nền.

## Cách online hoạt động
Máy của chủ phòng chạy toàn bộ trận (kẻ địch, va chạm, sát thương) và gửi ảnh chụp trận đấu 20 lần/giây cho các khách. Mỗi khách tự điều khiển tàu mình rồi gửi vị trí, hướng ngắm và nút bắn cho chủ phòng. `server.js` chỉ làm nhiệm vụ chuyển tin.

## Chỗ hay sửa trong game.js
- `const T={...}` — chỉ số kẻ địch (máu, tốc độ, sát thương, điểm).
- `const U=[...]` — danh sách nâng cấp khi lên cấp.
- `function baseStats()` — chỉ số ban đầu của mỗi tàu.
- `function startWave(n)` — số địch mỗi đợt, đợt boss (mỗi 5 đợt), hồi sinh đồng đội.
- `function bossAI(...)` — các đòn tấn công của boss.
- `const SHIP_COLORS` — màu tàu của 4 người chơi.
- `const R=30` — bán kính đấu trường.

## Nhạc nền
- File nhạc: `music/nhac-nen.mp3`. Muốn đổi bài, chép file mp3 khác vào và đặt đúng tên này.
- Chỉnh âm lượng ở dòng `const BGM_VOL=.45;` trong `game.js` (0 là tắt, 1 là to nhất).
- Nếu xóa file nhạc, game tự quay về nhạc điện tử tự tạo như cũ.
