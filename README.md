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

## 4 Tính năng mới nâng cấp

### 1. 4 Lớp Phi Thuyền Chiến Thuật (Ship Classes)
Người chơi có thể chọn 1 trong 4 lớp tàu trực tiếp tại Menu chính:
- **STRIKER (Tiên Phong):** Cân bằng hoàn hảo, đạn tích hợp sẵn khả năng xuyên giáp (`Pierce +1`).
- **COLOSSUS (Thiết Giáp):** Giáp dày 150 HP, đạn nổ diện rộng (`Boom +1`, đạn to x1.35).
- **PHANTOM (Bóng Ma):** Tốc độ bay cực nhanh (11.5), lướt né hồi siêu tốc (0.9s), tỉ lệ chí mạng gốc 25%.
- **DRONEMASTER (Chỉ Huy Drone):** Sở hữu 2 Drone hộ vệ tự hành bay quanh tàu, tự động phát hiện và bắn tỉa kẻ địch.

### 2. Kỹ năng Chiêu Cuối (Ultimate Ability)
- Tích lũy Năng lượng Nộ (Ultimate) khi tiêu diệt quái vật hoặc khi bị trúng đạn.
- Khi đạt 100%, nhấn **Q** hoặc **E** (hoặc nút **ULTI** trên Mobile) để kích hoạt:
  - Tức thì quét sạch toàn bộ đạn địch trên toàn đấu trường!
  - **Striker:** *Overdrive* — Kích hoạt hỏa lực liên thanh điên cuồng (+150% tốc độ bắn, x2 tốc độ bay) trong 5 giây.
  - **Colossus:** *Titan Slam* — Bất tử hoàn toàn, phóng ra sóng chấn động 360 độ cực đại thổi bay và nghiền nát quái vật.
  - **Phantom:** *Time Warp* — Đóng băng làm chậm toàn bộ sàn đấu 80% trong 5 giây, 100% đòn bắn đều chí mạng.
  - **Dronemaster:** *Orbital Ray* — Kích hoạt 4 chùm laser hủy diệt nhiệt độ cao xoay tròn quét sạch chiến trường.

### 3. Vật phẩm Rơi ngẫu nhiên trên Sàn Đấu (Battlefield Pickups)
Quái vật và Boss khi bị tiêu diệt có cơ hội rơi 4 loại vật phẩm chiến thuật:
- **Nano Heal (Xanh ngọc):** Hồi ngay lập tức 40 điểm Giáp.
- **Super Magnet (Xanh dương điện):** Hút toàn bộ tinh thể EXP rải rác trên sàn bay thẳng về phía tàu.
- **EMP Nuke (Đỏ cam rực):** Kích nổ bom sóng từ trường quét sạch đạn địch và giáng 350 sát thương lên tất cả quái vật.
- **Overcharge Boost (Vàng kim):** Nhân đôi hỏa lực (x2 Sát thương) trong 10 giây.

### 4. Cơ chế Cứu Sống Đồng Đội Tại Chỗ trong Co-op (In-Combat Revive)
- Trong trận đấu nhiều người chơi, khi một phi thuyền hết máu, tàu sẽ không nổ ngay mà chuyển sang trạng thái **Gục ngã (Downed)** kèm vòng cứu hộ năng lượng.
- Đồng đội chỉ cần di chuyển vào phạm vi vòng bảo hộ và đứng trong 2.5 giây để hồi sinh đồng đội ngay lập tức với 40% giáp mà không cần phải chờ hết đợt!

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

## Cấu trúc Kiến trúc Mã Nguồn (OOP & Clean Architecture)
- `index.html` — Giao diện chính: HUD, Menu, Phòng chờ, Bảng xếp hạng, Cài đặt.
- `style.css` — Thiết kế màu sắc Neon Sci-fi và bố cục responsive (PC & Mobile).
- `server.js` — Máy chủ WebSocket relay và API Bảng xếp hạng "Vua trò chơi".
- `music/nhac-nen.mp3` — Nhạc nền chiến đấu.
- `js/` — Kiến trúc Hướng Đối Tượng (OOP) và Quản lý theo Managers/Engine:
  - `js/engine/` *(Core Game Engine & Lifecycle)*
    - `ObjectPool.js`: Generic Object Pool Engine tái sử dụng bộ nhớ, chống lag GC.
    - `CameraController.js`: Class điều khiển góc nhìn camera, lerp bám theo tàu, screen shake.
    - `GameEngine.js`: Class điều phối trung tâm toàn bộ Game Loop, Physics, Render Passes.
  - `js/core/` *(Rendering & Audio)*
    - `config.js`: Cấu hình hệ thống, Hằng số (`R`, `SHIP_COLORS`), Math utilities.
    - `audio.js`: Bộ tổng hợp âm thanh Web Audio API & Quản lý nhạc nền.
    - `renderer.js`: Khởi tạo Three.js, Camera, Ánh sáng, UnrealBloomPass, Shader hậu kỳ.
    - `arena.js`: Đấu trường 3D (sàn tinh vân shader, lưới lục giác, tường năng lượng, thiên thạch).
  - `js/entities/` *(OOP Entity Hierarchy)*
    - `Entity.js`: Base class cơ sở trừu tượng cho mọi thực thể 3D.
    - `Ship.js`: Class Phi thuyền đóng gói 4 Lớp, Drone, Nạp nộ Ultimate, Lướt né, Hồi sinh.
    - `Drone.js`: Class Drone hộ vệ tự hành bay lượn và tự động bắn tỉa.
    - `Enemy.js`: Class Kẻ địch đóng gói thuộc tính, HP, AI hành vi và sinh học procedural.
    - `Projectile.js`: Class `PlayerBullet` & `EnemyBullet` kế thừa từ `Projectile`.
    - `Pickup.js`: Class Vật phẩm chiến trường 3D (`heal`, `magnet`, `nuke`, `boost`).
    - `fx.js`: Particle system, Vòng sóng, Mảnh vỡ, Laser, Tia sét, Damage numbers.
    - `player.js`: Factory dựng hình 3D procedural cho 4 lớp phi thuyền.
    - `enemies.js`: Pools đạn, tinh thể EXP, pickups và factory kẻ địch.
    - `bosses.js`: Trí tuệ nhân tạo (AI) và cơ chế chiến đấu của 10 Boss đặc biệt.
  - `js/systems/` *(Business Systems)*
    - `upgrades.js`: 14+ Thẻ nâng cấp kỹ năng roguelite, Logic lên cấp và chia bài.
    - `combat.js`: Hệ thống chiến đấu, Tính sát thương, Combo, Nạp nộ và Revive.
    - `wave.js`: Hệ thống 100 Đợt quái, Lịch trình xuất hiện Boss, Cân bằng độ khó.
  - `js/network/` *(Multiplayer Network)*
    - `net.js`: Thư viện kết nối WebSocket tới server.
    - `sync.js`: Đồng bộ multiplayer: Snapshot máy chủ, Nội suy chuyển động máy khách.
  - `js/ui/` *(User Interface & Input)*
    - `InputManager.js`: Class đóng gói bàn phím, chuột, cần ảo (virtual sticks) cảm ứng.
    - `hud.js`: Cập nhật HUD (máu, cấp, chiêu cuối, boss bar, tên đồng đội).
    - `menu.js`: Điều khiển Menu, Bảng xếp hạng online, Cài đặt âm lượng, Phòng chờ lobby.
    - `controls.js`: Bắt sự kiện bàn phím, chuột và touch controls.
  - `js/main.js`: Bootstrap khởi chạy `GameEngine` và điều phối chu trình chơi.

## Nhạc nền
- File nhạc: `music/nhac-nen.mp3`. Muốn đổi bài, chép file mp3 khác vào và đặt đúng tên này.
- Chỉnh âm lượng trong **CÀI ĐẶT**. Mức to nhất đặt ở dòng `const BGM_MAX=.8;` trong `js/core/audio.js`.
- Nếu xóa file nhạc, game tự quay về nhạc điện tử tự tạo.
- Bài nhạc hiện tại có bản quyền; nếu chia sẻ game công khai, nên thay bằng nhạc miễn phí bản quyền.
