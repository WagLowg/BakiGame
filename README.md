# 🚀 ReChoice: 3D Sci-Fi Space Shooter

<div align="center">

### Trình Duyệt 3D Roguelite • Co-op Trực Tuyến 2–4 Người • 100 Đợt Sóng • 10 Đại Boss

Tựa game bắn tàu vũ trụ 3D nhịp độ cao vận hành trực tiếp trên nền tảng Web với đồ họa Three.js Neon Sci-fi, cơ chế chiến đấu Roguelite đa dạng và hệ thống đồng bộ mạng thời gian thực.

![Three.js](https://img.shields.io/badge/Graphics-Three.js%20(WebGL)-black?logo=three.js)
![NodeJS](https://img.shields.io/badge/Backend-Node.js-green?logo=node.js)
![WebSocket](https://img.shields.io/badge/Networking-WebSocket%20Relay-blue)
![Web Audio](https://img.shields.io/badge/Audio-Web%20Audio%20API-orange)
![Genre](https://img.shields.io/badge/Genre-3D%20Roguelite%20Shooter-purple)

</div>

---

# 🌌 Tổng Quan Dự Án (Project Overview)

**ReChoice** là trò chơi bắn tàu không gian 3D hoạt động hoàn toàn trên trình duyệt, kết hợp giữa thể loại bắn súng sinh tồn (Shoot 'em up / Bullet Hell) và cơ chế nâng cấp ngẫu nhiên Roguelite.

Người chơi có thể tác chiến độc lập hoặc kết nối đội hình 2–4 người qua mạng để cùng vượt qua 100 đợt quái vật biến đổi liên tục, chạm trán 10 trận chiến trùm (Boss) quy mô lớn và cạnh tranh ghi danh trên bảng vinh danh **"Vua Trò Chơi"**.

---

# 💡 Điểm Nhấn Trải Nghiệm (Core Highlights)

- **Trải nghiệm ngay trên trình duyệt:** Chạy mượt mà trên các trình duyệt hiện đại (Chrome, Edge, Firefox); tương thích hoàn chỉnh với bàn phím/chuột trên PC và cần ảo cảm ứng trên thiết bị di động.
- **Phong cách đồ họa Neon Cyberpunk:** Đấu trường tinh vân 3D, hiệu ứng phát sáng hậu kỳ (UnrealBloom Shader), lưới năng lượng lục giác và hệ thống hạt rực rỡ.
- **Hệ thống nâng cấp Roguelite:** Hơn 14 thẻ bài nâng cấp thuộc tính xuất hiện ngẫu nhiên mỗi khi thăng cấp, mang lại lối xây dựng sức mạnh biến hóa qua từng lượt chơi.
- **Tối ưu hóa hiệu năng cao:** Tích hợp bộ gom bộ nhớ (Object Pool) cho đạn, hiệu ứng và quái vật, hạn chế tối đa hiện tượng tụt khung hình do thu gom rác (GC lag).

---

# 🎮 Chế Độ Chơi (Game Modes)

### 1. Chơi Đơn (Single-player)
- Trải nghiệm toàn bộ 100 đợt sóng và 10 đại Boss độc hành.
- Điểm số được ghi nhận vào bảng xếp hạng máy cục bộ sau khi kết thúc lượt đấu.

### 2. Chơi Trực Tuyến Đồng Đội (Co-op 2–4 Người)
- **Cơ chế phòng:** 1 người chơi khởi tạo phòng, các thành viên khác nhập mã phòng 4 ký tự để tham gia chiến đấu cùng phe.
- **Chia sẻ tài nguyên:** Toàn đội dùng chung điểm số, đợt sóng và thanh kinh nghiệm (EXP). Khi lên cấp, mỗi thành viên có 25 giây để độc lập chọn thẻ nâng cấp phù hợp với phong cách của mình.
- **Cân bằng tự động:** Càng đông người chơi, chỉ số máu và mật độ quái vật xuất hiện càng gia tăng.
- **Hồi sinh qua đợt:** Phi thuyền bị phá hủy hoàn toàn sẽ tự động tái xuất ở đầu đợt sóng tiếp theo với 50% giáp. Toàn đội chỉ thất bại khi tất cả thành viên cùng lúc bị tiêu diệt.

---

# 🛸 4 Lớp Phi Thuyền Chiến Thuật (Ship Classes)

Người chơi có thể tùy chọn 1 trong 4 lớp phi thuyền ngay tại màn hình chính trước khi vào trận:

| Lớp Tàu | Định Vị | Thuộc Tính Cốt Lõi | Đặc Trưng Tác Chiến |
| :--- | :--- | :--- | :--- |
| **STRIKER** | Tiên Phong | Cân bằng toàn diện | Hỏa lực trực diện ổn định; đạn tích hợp sẵn khả năng xuyên giáp (`Pierce +1`). |
| **COLOSSUS** | Thiết Giáp | Chống chịu cực đại | Lượng máu dày 150 HP; đạn bắn phát nổ diện rộng (`Boom +1`, kích thước đạn x1.35). |
| **PHANTOM** | Bóng Ma | Cơ động & Bạo kích | Tốc độ bay 11.5; lướt né hồi siêu tốc (0.9s); tỉ lệ đòn đánh chí mạng cơ bản đạt 25%. |
| **DRONEMASTER** | Chỉ Huy Vệ Tinh | Kiểm soát bản đồ | Khởi đầu cùng 2 Drone tự hành hộ tống, tự động rà quét và bắn tỉa kẻ thù xung quanh. |

---

# ⚡ Kỹ Năng Tối Thượng (Ultimate Abilities)

Tích lũy nộ năng lượng thông qua việc tiêu diệt quái vật hoặc khi nhận sát thương. Khi đạt mốc 100%, nhấn **Q**, **E** (hoặc nút **ULTI** trên di động) để kích hoạt:

> **Quy tắc dọn sàn:** Toàn bộ đạn địch trên đấu trường lập tức bị xóa sạch ngay thời điểm kích hoạt chiêu cuối.

~~~text
[ Nhận Sát Thương / Diệt Quái ] ──> [ Năng Lượng Đạt 100% ] ──> [ Kích Hoạt Q / E / Nút ULTI ]
                                                                             │
             ┌──────────────────────┬──────────────────────┬─────────────────┴─────────────────┐
             ▼                      ▼                      ▼                                   ▼
       [ STRIKER ]            [ COLOSSUS ]            [ PHANTOM ]                       [ DRONEMASTER ]
        Overdrive              Titan Slam              Time Warp                          Orbital Ray
+150% Tốc bắn, x2 Tốc độ   Bất tử hoàn toàn,      Làm chậm đấu trường 80% (5s),    4 Chùm laser hủy diệt 360°,
di chuyển trong 5 giây.    Phóng sóng chấn động.  100% Đòn bắn đều chí mạng.       Quét sạch toàn bộ quái vật.
~~~

---

# 🎁 Vật Phẩm Rơi & Cứu Sống Đồng Đội

### 1. Vật Phẩm Chiến Trường (Pickups)
Khi tiêu diệt Quái vật hoặc Boss, các khối năng lượng ngẫu nhiên sẽ xuất hiện trên sàn đấu:
- 🟢 **Nano Heal (Xanh ngọc):** Hồi phục lập tức 40 điểm Giáp.
- 🔵 **Super Magnet (Xanh điện):** Tạo lực từ trường hút toàn bộ tinh thể EXP trên bản đồ về tàu.
- 🔴 **EMP Nuke (Đỏ cam):** Kích nổ sóng từ trường quét sạch đạn địch và gây 350 sát thương diện rộng.
- 🟡 **Overcharge Boost (Vàng kim):** Kích hoạt trạng thái hỏa lực cực hạn (Nhân đôi x2 sát thương) trong 10 giây.

### 2. Cơ Chế Cứu Sống Đồng Đội Tại Chỗ (In-Combat Revive)
- Trong chế độ nhiều người chơi, phi thuyền cạn kiệt HP sẽ rơi vào trạng thái **Gục Ngã (Downed)** kèm vòng bảo hộ năng lượng.
- Đồng đội chỉ cần di chuyển vào phạm vi bảo hộ và giữ vững vị trí trong **2.5 giây** để hồi sinh đồng đội với **40% Giáp** ngay trong đợt đấu mà không cần đợi sang màn tiếp theo.

---

# 👾 Thử Thách 10 Đại Boss (Wave 10 - 100)

Cứ mỗi 10 đợt sóng, hệ thống sẽ xuất hiện một Boss mang cơ chế thử thách kỹ năng và sự phối hợp:

| Đợt | Đại Boss | Cơ Chế Tác Chiến & Khắc Chế |
| :---: | :--- | :--- |
| **10** | **Nữ Hoàng Tổ Ong** | Miễn nhiễm sát thương khi đóng vỏ; chỉ nhận sát thương khi mở vỏ đẻ trứng. Cần ưu tiên phá trứng trước khi nở. |
| **20** | **Cự Thạch Phân Rã** | Phóng sóng chấn động liên tục (dùng lướt né để vượt qua). Khi bị tiêu diệt sẽ phân tách thành 2 khối vừa và 4 khối nhỏ. |
| **30** | **Hố Đen** | Hút tàu và bẻ cong quỹ đạo đạn; chỉ bắn được khi hố đen "thở ra" (vành đai năng lượng đổi sang màu đỏ rực). |
| **40** | **Gương Song Sinh** | Mặt gương phản dội đạn ngược lại; tập trung hỏa lực vào mặt tối và phải hạ cả 2 phân thân cách nhau không quá 3 giây. |
| **50** | **Nhạc Trưởng Hư Không** | Tạo khiên nốt nhạc bảo vệ; phải bắn hạ toàn bộ nốt nhạc bay và luồn lách né các vạch laser cảnh báo màu đỏ. |
| **60** | **Bóng Ma Săn Mồi** | Tàng hình gần như hoàn toàn; người chơi phải canh thời điểm lướt né chuẩn xác khi bị vòng khóa mục tiêu đỏ xuất hiện. |
| **70** | **Kẻ Đánh Cắp** | Hút trộm tinh thể EXP và thẻ nâng cấp của tàu; dồn hỏa lực tiêu diệt nhanh để lấy lại toàn bộ tài nguyên. |
| **80** | **Đồng Hồ Thời Gian** | Quét laser kim đồng hồ xoay tròn, tạo vùng làm chậm và tự tua ngược máu nếu không bị dồn sát thương đủ nhanh. |
| **90** | **Rồng Plasma** | Thân rồng gồm nhiều phân đốt; cần phá hủy từng đốt thân trước khi đầu rồng có thể nhận sát thương (khi còn dưới 5 đốt). |
| **100** | **Lõi Hư Không Tối Thượng** | Trận chiến 3 giai đoạn; giai đoạn cuối cùng đấu trường bị thu hẹp tối đa đòi hỏi kỹ năng né tránh chính xác. |

> **Chế độ Luyện Tập Boss:** Thêm tham số `?dot=` vào sau URL trình duyệt (Ví dụ: `?dot=50`) để vào thẳng đợt sóng mong muốn cùng hệ thống thẻ bài nâng cấp được chuẩn bị sẵn.

---

# 🏆 Bảng Xếp Hạng "Vua Trò Chơi"

- **Cơ chế ghi danh:** Khi kết thúc ván đấu (Game Over), hệ thống tự động ghi nhận điểm số:
  - *Chơi đơn:* Người chơi nhập tên đại diện trực tiếp tại màn hình kết quả.
  - *Chơi Co-op:* Chủ phòng đại diện nhập tên vinh danh chung cho cả đội.
- **Vinh danh:** Người chơi có điểm số cao nhất sẽ xuất hiện trực tiếp tại Menu chính với danh hiệu **Vua Trò Chơi**. Bấm nút **VUA TRÒ CHƠI** để tra cứu bảng vàng Top 50.
- **Lưu ý:** Chế độ luyện tập (`?dot=`) không ghi nhận điểm vào bảng xếp hạng. Máy chủ có tích hợp thuật toán lọc điểm số bất thường để giữ tính công bằng.

---

# ⚙️ Tùy Chỉnh & Âm Nhạc Trong Game

### 1. Cài Đặt Hệ Thống (Settings)
Người chơi có thể truy cập phần Cài đặt tại Menu chính hoặc màn hình Tạm dừng (Pause):
- **Âm lượng:** Điều chỉnh độc lập âm lượng nhạc nền (BGM) và hiệu ứng âm thanh (SFX).
- **Chất lượng hình ảnh:** 3 mức *Thấp / Vừa / Cao* (thiết bị di động hoặc máy cấu hình yếu nên chọn mức Thấp để tối ưu khung hình).
- **Hiệu ứng trực quan:** Bật/tắt rung chấn màn hình (Screen Shake) và hiển thị chỉ số sát thương nảy số (Damage Numbers).

### 2. Hệ Thống Âm Thanh (Audio Engine)
- Sử dụng công nghệ Web Audio API để xử lý âm thanh thời gian thực và tự tổng hợp nhạc nền điện tử trong trường hợp không tải tệp tĩnh.
- Hỗ trợ phát nhạc nền định dạng MP3, kiểm soát ngưỡng âm lượng an toàn nhằm duy trì trải nghiệm giải trí ổn định.
