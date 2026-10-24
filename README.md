# ReChoice

Game bắn tàu vũ trụ 3D chạy trên trình duyệt (Three.js). Chơi một mình, hoặc 2–4 người cùng phe qua mạng. Mỗi 10 đợt có một boss đặc biệt, đợt 100 là trận cuối.

## Chơi một mình
Mở `index.html` bằng Chrome, Edge hoặc Firefox. Cần có mạng để tải Three.js và phông chữ.
Mở kiểu này thì bảng xếp hạng chỉ lưu trên máy bạn và không chơi online được.

## Chơi online trên máy của bạn
1. Cài Node.js (bản 18 trở lên) từ https://nodejs.org.
2. Mở thư mục BakiGame, gõ `cmd` vào thanh địa chỉ rồi nhấn Enter, sau đó gõ:
   ```
   npm install
   npm start
   ```
3. Mở trình duyệt vào `http://localhost:3000`, bấm **CHƠI ONLINE** → **Tạo phòng**.
4. Người khác cùng Wi-Fi mở `http://<IP máy bạn>:3000` (xem IP bằng lệnh `ipconfig`, dòng IPv4), bấm **CHƠI ONLINE**, nhập mã phòng 4 chữ và bấm **Vào**.

## Cập nhật bản trên Render
Mỗi khi sửa game, mở cmd trong thư mục BakiGame và gõ:
```
git add .
git commit -m "Cap nhat game"
git push
```
Render sẽ tự cập nhật sau vài phút.

## Bảng xếp hạng "Vua trò chơi"
- Khi thua, điểm tự được ghi danh (chơi một mình: lần đầu sẽ hỏi tên; chơi online: chủ phòng ghi danh cho cả đội).
- Người đứng đầu hiện ở menu với danh hiệu **Vua trò chơi**. Bấm nút **VUA TRÒ CHƠI** để xem top 50.
- Chế độ luyện tập (`?dot=`) không được ghi danh.

**Giữ bảng xếp hạng vĩnh viễn trên Render (nên làm):**
Gói miễn phí của Render xóa file mỗi khi máy chủ ngủ hoặc cập nhật, nên mặc định bảng xếp hạng sẽ bị xóa. Để giữ lại:
1. Vào https://upstash.com, đăng ký miễn phí, bấm **Create Database** (loại Redis, gói Free).
2. Trong trang database vừa tạo, tìm phần **REST API**, chép 2 giá trị `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN`.
3. Trên Render, mở web service của game → **Environment** → **Add Environment Variable**, thêm 2 biến trên với đúng tên và giá trị vừa chép → **Save Changes**.
4. Render tự khởi động lại. Trong phần **Logs** sẽ thấy dòng `Bảng xếp hạng lưu ở: Upstash Redis (vĩnh viễn)`.

Lưu ý: điểm do trình duyệt gửi lên, người rành máy tính vẫn có thể gian lận. Máy chủ chỉ chặn những điểm quá vô lý.

## Cài đặt trong game
Menu → **CÀI ĐẶT** (hoặc trong lúc tạm dừng):
- Âm lượng nhạc nền và âm thanh hiệu ứng.
- Chất lượng hình ảnh: Thấp / Vừa / Cao. Máy yếu hoặc điện thoại nên chọn Thấp.
- Bật/tắt rung màn hình và số sát thương.

## 10 boss đặc biệt
| Đợt | Boss | Cách hạ |
| --- | --- | --- |
| 10 | Nữ Hoàng Tổ Ong | Chỉ mất máu khi mở vỏ đẻ trứng; bắn vỡ trứng trước khi nở |
| 20 | Cự Thạch Phân Rã | Lướt qua sóng chấn động; vỡ thành 2 rồi 4 khối nhỏ |
| 30 | Hố Đen | Hút tàu và bẻ cong đạn; chỉ bắn được lúc nó thở ra (vành chuyển đỏ) |
| 40 | Gương Song Sinh | Mặt gương dội đạn ngược; bắn vào mặt tối, hạ cả hai trong 3 giây |
| 50 | Nhạc Trưởng Hư Không | Phá hết nốt nhạc mới bắn được boss; né laser khi thấy vạch đỏ |
| 60 | Bóng Ma Săn Mồi | Gần như tàng hình; khi bị đánh dấu vòng đỏ thì lướt né |
| 70 | Kẻ Đánh Cắp | Cướp tinh thể và nâng cấp; hạ nó để lấy lại tất cả |
| 80 | Đồng Hồ Thời Gian | Kim đồng hồ là laser; bong bóng làm chậm; tua ngược máu nếu bắn không đủ |
| 90 | Rồng Plasma | Phá từng đốt thân; đầu rồng chỉ mất máu khi còn dưới 5 đốt |
| 100 | Lõi Hư Không Tối Thượng | Ba giai đoạn; giai đoạn 3 đấu trường thu nhỏ |

Lõi Hư Không thường vẫn xuất hiện ở các đợt 5, 15, 25… Qua đợt 100, các boss quay lại mạnh hơn.

**Luyện tập boss:** thêm `?dot=50` vào cuối đường link (ví dụ `http://localhost:3000/?dot=50`) để vào thẳng đợt 50, kèm sẵn nâng cấp. Đổi số để thử boss khác.

## Cách chơi online
- Một người **Tạo phòng** (chủ phòng), những người khác nhập mã phòng để vào. Tối đa 4 người.
- Cả đội chung điểm, chung đợt, chung thanh kinh nghiệm. Khi lên cấp, mỗi người tự chọn nâng cấp cho tàu mình (sau 25 giây sẽ tự chọn ngẫu nhiên).
- Tàu vỡ sẽ hồi sinh ở đầu đợt sau với nửa giáp. Thua khi cả đội vỡ hết.
- Càng nhiều người thì kẻ địch và boss càng mạnh.
- Nút II / phím Esc khi chơi online chỉ mở menu, trận vẫn tiếp tục. Nếu chủ phòng thoát, phòng sẽ đóng.

## Các file
- `index.html` — giao diện: menu, phòng chờ, bảng xếp hạng, cài đặt, HUD, màn lên cấp, màn thua.
- `style.css` — màu sắc và bố cục.
- `game.js` — toàn bộ game: đồ họa, hiệu ứng, kẻ địch, 10 boss, nâng cấp, bảng xếp hạng, đồng bộ online.
- `net.js` — kết nối WebSocket tới máy chủ.
- `server.js` — máy chủ: phục vụ file game, chuyển tin giữa người chơi, lưu bảng xếp hạng.
- `package.json` — khai báo thư viện `ws` và lệnh `npm start`.
- `music/nhac-nen.mp3` — nhạc nền.

## Chỗ hay sửa trong game.js
- `const T={...}` — chỉ số kẻ địch và boss (máu, tốc độ, sát thương, điểm).
- `const BOSSES=[...]` — tên và lời nhắc của 10 boss.
- `const AI={...}` — cách từng boss di chuyển và tấn công.
- `function buildEnemy(type)` — hình dáng kẻ địch và boss.
- `function buildShip(slot)` — hình dáng tàu; `const SHIP_COLORS` — màu tàu của 4 người.
- `const U=[...]` — danh sách nâng cấp khi lên cấp.
- `function baseStats()` — chỉ số ban đầu của mỗi tàu.
- `function startWave(n)` — số địch mỗi đợt và lịch boss.
- `const R=30` — bán kính đấu trường.

## Nhạc nền
- File nhạc: `music/nhac-nen.mp3`. Muốn đổi bài, chép file mp3 khác vào và đặt đúng tên này.
- Chỉnh âm lượng trong **CÀI ĐẶT**. Mức to nhất đặt ở dòng `const BGM_MAX=.8;` trong `game.js`.
- Nếu xóa file nhạc, game tự quay về nhạc điện tử tự tạo.
- Bài nhạc hiện tại có bản quyền; nếu chia sẻ game công khai, nên thay bằng nhạc miễn phí bản quyền.
