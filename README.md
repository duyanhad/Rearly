# DrinkWatter — Frontend

React 19 + Vite + TailwindCSS v4 + React Three Fiber — **JavaScript thuần** (`.jsx` / `.js`, không dùng TypeScript).

## Chạy

```powershell
npm install
npm run dev
```

Mở <http://localhost:5173>. Vite proxy `/api`, `/uploads`, `/hubs` sang backend
`http://localhost:5157` (xem `vite.config.js`), nên **phải chạy backend trước**.

### Cấu hình qua `.env`

Repo có `.env.example` (mẫu, commit được) và `.env` (thật, đã gitignore):

```
VITE_API_URL=                                  # trống = gọi tương đối qua proxy của Vite
VITE_PROXY_TARGET=http://localhost:5157        # backend mà dev server proxy tới
# VITE_PORT=5173                               # đổi cổng dev server nếu cần
```

Đổi backend chỉ cần sửa `VITE_PROXY_TARGET` rồi khởi động lại `npm run dev`.
Nếu muốn FE gọi thẳng backend (không qua proxy) thì đặt `VITE_API_URL=http://host:port`
— khi đó SignalR cũng gọi trực tiếp nên backend phải cho phép CORS (`http://localhost:5173`
đã được bật sẵn).

## Build

```powershell
npm run build
```

## Cấu trúc

Tổ chức theo **feature** (giống dự án KMart): mỗi nghiệp vụ có `pages/`, `components/`,
`services/` riêng; phần dùng chung nằm ở `components/`, `layouts/`, `context/`, `utils/`, `services/`.

```
src/
├── main.jsx            entry: QueryClient + Router + AuthProvider + ToastProvider
├── App.jsx             khai báo route (user / admin / guest)
├── index.css           Tailwind v4 + biến theme
├── components/         dùng chung: Avatar, Toast, LogStatusChip, RealtimeBridge
├── context/            AuthProvider (đăng nhập, hồ sơ, token)
├── layouts/            AppLayout (header/chuông/badge), BottomNav (mobile + FAB), RadialMenu
├── services/           apiClient (axios + interceptor + mediaUrl), realtime (SignalR),
│                       authService, userService, waterService, cupService,
│                       socialService, notificationService, adminService
├── utils/              format (giờ/ca), cutout (tách nền ảnh cốc)
└── features/
    ├── auth/           pages/{LoginPage, RegisterPage}, components/AuthShell
    ├── water/          pages/{DashboardPage, CalendarPage},
    │                   components/{AddWaterModal, WaterCup3D}
    ├── social/         pages/{FeedPage, FriendsPage},
    │                   components/NotificationBell (dropdown chuông thông báo)
    ├── partner/        pages/PartnerPage (duyệt ảnh minh chứng)
    ├── chat/           pages/ChatPage, components/{ChatPanel, ChatBubble}
    ├── mascot/         tiers.js (3 kỷ nguyên x 5 cấp), components/WaterMascot,
    │                   pages/MascotLabPage
    ├── profile/        pages/ProfilePage
    ├── settings/       pages/SettingsPage
    └── admin/          layouts/AdminLayout, pages/{AdminOverview, AdminUsers,
                        AdminBroadcast, AdminLogs}
```

**Giao diện admin tách riêng**: `/admin` nằm ngoài `AppLayout` — shell riêng (sidebar tối), không nav
người dùng, không chuông/3D. `RequireAdmin` chỉ cho `role === 'Admin'`; tài khoản admin đăng nhập là
vào thẳng `/admin` và mọi route người dùng tự chuyển về `/admin`; user thường vào `/admin` bị đẩy ra
`/login`. API `/api/admin/*` đã giới hạn `[Authorize(Roles = "Admin")]`.

**Quy ước**

- Không gọi `api.get/post` trực tiếp trong page/component — luôn qua `services/*Service.js`.
  37 chỗ gọi API đã được gom vào 7 service theo feature.
- Component chia sẻ ≥ 2 feature → `src/components/`; chỉ dùng trong 1 feature → `features/<x>/components/`.
- `pages/*.jsx` đặt tên trùng tên export (`DashboardPage`, `SettingsPage`, …).

## Giao diện

- **Người dùng**: header ngang trên desktop (kèm **chuông thông báo có badge chưa đọc**, avatar
  dẫn tới trang cá nhân); dưới `md` header rút gọn + **bottom navigation**
  (Hôm nay · Lịch · **FAB** · Bạn bè · Cài đặt) với nút tròn ở giữa mở **radial menu**:
  **Chụp ảnh** (mở camera chụp nhanh) · **Partner** · **Bạn bè**.
- **Chuông thông báo** (`features/social/components/NotificationBell`): bấm là **thả dropdown**
  ngay dưới header, không chuyển trang. Mobile: panel trải gần hết bề ngang; desktop (`sm+`): panel
  384px canh phải, cao tối đa 70vh và cuộn bên trong. Mỗi dòng có chấm chưa đọc + thời gian tương
  đối ("vừa xong", "10 giờ trước"), bấm vào để đánh dấu đã đọc; nút **Đọc tất cả** ở đầu panel.
  Đóng bằng nút chuông, click nền, `Esc`, hoặc khi đổi trang. Panel render qua portal ra `body`
  nên không bị ảnh hưởng bởi `backdrop-blur` của header.
- **Bạn bè** (`/friends`): chỉ **danh sách bạn bè + lời mời**, tìm người để kết bạn, đặt
  **biệt hiệu** cho từng người, nút nhắc uống nước. Bảng tin ở trang riêng.
- **Bảng tin** (`/feed`): tiến trình hôm nay + ảnh minh chứng mới nhất của bạn bè.
- **Trang cá nhân** (`/profile`): đổi ảnh đại diện, đổi tên hiển thị, thống kê (chuỗi, ngày
  hoàn thành, tổng lít), chọn partner duyệt ảnh, lối tắt tới cài đặt/admin.
- **Kênh Partner** (`/partner`) — **2 bước**:
  1. **Danh sách người nhờ mình duyệt**: avatar, **biệt hiệu** (tự đặt, chỉ mình thấy) + tên thật,
     `ml / mục tiêu · %`, badge số phiếu chờ, ô tìm khi > 4 người. Bấm vào mới mở trang của họ.
  2. **Trang của người đó** (giống dashboard người dùng): nút **Danh sách** để quay lại, thẻ cốc
     (đúng ảnh cốc + màu nước của họ) + % / ml / chuỗi / ml chờ duyệt / ml bị trừ, **Đổi biệt hiệu**,
     form **Trừ nước** (nút nhanh 100/200/300/500), **tiến độ theo ca**, và **phiếu chờ duyệt** của họ.
  - **Một luồng duy nhất "Duyệt phiếu & trừ nước"**: mỗi phiếu (ảnh + ml + ca + giờ) có ngay
    **Duyệt** (cộng ml) và **Từ chối** → hộp thoại hỏi *"Trừ luôn X ml vừa thêm khỏi cốc hiện tại"*
    (mặc định bật) → từ chối + trừ đúng X ml, hoặc bỏ chọn để chỉ từ chối. Ngay dưới danh sách là
    **Trừ trực tiếp khỏi cốc** (nút nhanh 100/200/300/500) cho khi không có phiếu.
  - Partner tự cập nhật mỗi 20–30s: khi người kia uống thêm nước, cốc của họ trên máy partner cũng
    hiện nước rót vào.
- **Người bị trừ thấy ngay**: server gửi SignalR `ReceiveDeduct` → toast + cốc trên Dashboard
  của họ nghiêng đổ nước, danh sách "Nhật ký hôm nay" có dòng `-300 ml · Bị trừ nước`, và dưới
  cốc hiện "Bị partner trừ X ml hôm nay".
- **Hiệu ứng đổ nước khi bị trừ**: cốc nghiêng (tối đa ~35°, theo số ml) rồi **dòng nước tràn ra từ
  đúng miệng cốc** — `CupTilt` ghi góc nghiêng + vị trí thật vào `tiltRef`, `SpillStream` đọc lại
  mỗi frame nên nước luôn bắt đầu ở mép miệng (không lơ lửng). Dòng nước **cong ra ngoài, sóng sánh**
  (uốn theo thời gian), **to/mảnh và chảy lâu/ngắn theo số ml bị trừ**; nước rơi xuống → **vũng bầu
  dục loang dần + gợn loang** đặt đúng điểm rơi (`SpillPuddle` bám `tiltRef`), rồi cốc thẳng lại và
  vũng khô dần.
- **Avatar rót nước vào cốc** (cả trang người dùng lẫn trang partner): avatar **nghiêng hẳn (~40°)
  như đang cầm cốc rót** rồi **rót một cung nước** từ góc trên-trái xuống **miệng cốc** — dải ribbon
  uốn theo đường cong Bezier (bắn ngang ra rồi đổ dốc xuống, không phải đường thẳng), **mảnh dần**
  khi rơi. **Điểm rót được đo từ DOM**: mép dưới-phải của **chính ảnh avatar** (không phải cả khối
  avatar + tên) đổi sang toạ độ canvas → nước luôn bắt đầu đúng từ đầu ly, không rơi ở chỗ tên. Cốc **ngả về phía avatar của
  chính chủ** (bên trái) để hứng nước, và dòng nước được vẽ **sau** miệng cốc nên phần dưới bị cốc
  che → nước như chui vào trong cốc. Mực nước dâng **đúng theo thời gian rót** (`useFillTween`:
  chờ ~30% thời gian rót rồi dâng dần bằng smoothstep) nên dòng nước – độ nghiêng cốc – mực nước
  đồng bộ, và mọi phép làm mượt đều tính theo `delta` (không phụ thuộc fps) nên không bị khựng.
  Shader dòng nước: **viền đậm** (khúc xạ) → **lõi sáng** (nước trong) → **vệt phản chiếu** lấp lánh
  chạy dọc + gợn sóng; màu lấy từ chính ảnh cốc (`liquidColor`) nên dòng nước có khối như chất lỏng.
  Độ dài hiệu ứng **tỉ lệ với số ml** vừa uống (`features/water/pourTiming.js`:
  250 ml ≈ 1,8 s · 500 ml ≈ 2,4 s · 1000 ml ≈ 3,7 s, chặn 1,15–4 s) — rót càng nhiều nước chảy càng lâu.
- **Popup chúc mừng 100%** (`GoalCelebration`): vừa chạm mục tiêu ngày → chờ nước rót xong (~2,2 s)
  rồi bật popup: **cốc 3D nhảy múa** (xoay + nảy theo nhịp), confetti rơi, số ml đã uống và chuỗi
  ngày. Mỗi ngày chỉ hiện một lần (lưu `localStorage` theo ngày).
- **Thẻ cốc ở Dashboard**: 2 avatar tròn ở 2 góc — góc trái **Bạn**, góc phải **người duyệt ảnh**.
- **Ai duyệt ảnh cho tôi**: khi đã chọn partner, **menu tròn** ở FAB hiện **ảnh đại diện + tên**
  của người duyệt (viền vàng) thay cho icon Partner — lấy từ `GET /api/social/partner/me`.
- **Đăng nhập / Đăng ký**: layout hai cột, nền gradient + bong bóng động, card kính mờ,
  hiện/ẩn mật khẩu, icon trong input.
- **Admin**: shell riêng (sidebar tối + accent vàng), route `/admin/*`, không dùng layout người
  dùng và không hiển thị 3D. Trên mobile sidebar thành thanh tab cuộn ngang.
- `main` có `pb-28` trên mobile để nội dung không bị bottom nav che.
- **Thêm nước = camera trước** (`AddWaterModal` + `CameraCapture`), 2 bước:
  1. **Chụp ảnh cốc nước**: mở **camera trong app** (`getUserMedia`, ưu tiên camera sau, khung ngắm
     giữa màn hình, nút chụp tròn). Không có camera / bị chặn quyền → nút **Chọn ảnh có sẵn**
     (kèm `capture` cho điện thoại). Ảnh chụp được thu về tối đa 1280 px, JPEG 0.9.
  2. **Nhập số ml + ghi chú** (+ loại cốc) rồi mới bấm **Thêm nước**. Ảnh xem trước có nút **Chụp lại**.
  Cài đặt có công tắc **"Bắt buộc chụp ảnh cốc nước"** (mặc định **bật**): bật thì nút thêm nước bị
  khoá khi chưa có ảnh (server cũng trả 400); tắt thì bước chụp có thêm **Bỏ qua, không chụp ảnh**.
- **Modal thêm nước**: ca (Sáng/Trưa/Tối) **tự nhận theo giờ máy** — không còn dropdown, client
  không gửi `Period` để server (timezone VN) quyết định. Loại cốc chọn qua **bottom sheet**
  (portal ra `body`, nền tối mờ, thanh tìm kiếm, mỗi dòng có icon cốc + tên + ml, ✓ ở mục đang chọn);
  desktop hiển thị thành hộp giữa màn hình.
- **Nhật ký (Hôm nay & Lịch)** — component chung `LogCarousel`: hiện **đúng 3 thẻ mỗi lần**
  (ảnh vuông + số ml + ca/giờ + trạng thái + ghi chú) trong dải **vuốt ngang** có snap
  (`overflow-x-auto` + `snap-x snap-mandatory`, ẩn thanh cuộn), không còn danh sách dọc dài.
  Kèm **2 nút mũi tên** cho người thích bấm: mỗi lần trượt đúng 1 "trang" (3 thẻ), tự mờ/khoá khi ở
  đầu hoặc cuối. Trang **Lịch** dùng lại y nguyên cho phần "Nhật ký ngày …".
- **Dashboard**: một nút **Uống nước** duy nhất (không còn dãy chip cốc) → mở luồng chụp ảnh →
  nhập ml/ghi chú → thêm nước.
- **% đếm mượt**: số % (và mực nước trong cốc) **đếm dần** tới giá trị mới trong ~0,9 s thay vì nhảy —
  uống thêm thì dâng lên, **bị partner trừ thì tụt xuống** cùng nhịp với dòng nước tràn ra.
- **Khối thống kê dưới cốc** (Hôm nay + Partner): số % cỡ lớn tô **gradient nước**, dòng `ml / mục tiêu`
  (số ml đậm hơn), **thanh nước** thu nhỏ cho biết mức hoàn thành, và các **pill** gọn cho chuỗi ngày /
  ml chờ duyệt / ml bị trừ.
- **Màu đồng bộ theo cốc**: `utils/color.js` lấy `liquidColor` nhận diện từ ảnh cốc → `accent()` nâng
  độ bão hoà (≥0.55) và kẹp độ sáng (0.40–0.52) để màu pastel vẫn rõ → dùng cho **số %**, **thanh nước
  mini** và **thanh tiến độ theo ca** (cả 2 trang). Không có ảnh cốc thì giữ màu xanh mặc định.
- **Thanh tiến độ kiểu nước** (`components/WaterBar`, dùng cho "Tiến độ theo ca" ở cả trang Hôm nay
  và trang Partner): nền xanh nhạt, cột nước gradient có **sóng chạy dọc**, **vệt sáng** quét qua,
  **bọt nước nổi** và **gợn meniscus** ở mặt nước (đầu cột).
- **Vượt chỉ tiêu → có lửa**: thanh/ô % nào vượt 100% sẽ hiện **icon ngọn lửa vector**
  (`components/FlameIcon` — thân cam đỏ, lõi vàng) nhấp nháy nhẹ ở đầu thanh + **quầng sáng ấm**
  phía sau (ember-pulse) cho biết đã uống hơn mục tiêu. **Vượt càng nhiều → càng nhiều ngọn lửa
  tỏa ra** ở cuối thanh (1→4 ngọn, mỗi ngọn nghiêng một góc, cỡ giữ nguyên; thanh tự chừa một dải
  phía trên nên không đè lên số ml).
- **Cốc 3D từ ảnh của bạn**: Cài đặt có mục **"Cốc nước của bạn"** — tải một ảnh cốc (JPG/PNG/WebP,
  ≤ 5 MB). Server **tách nền bằng AI (rembg · BiRefNet)** ngay khi upload và trả `cutoutUrl`
  (PNG trong suốt, đã khử viền màu) — cốc + nắp + phụ kiện (nơ, móc khoá) giữ nguyên, chỉ mất nền;
  client dùng ảnh đó trực tiếp (`makePreCut`: chỉ đo tỉ lệ + màu nước, **không chạy model trên máy**).
  Nếu server không có dịch vụ tách nền thì client tự tách: ưu tiên model ISNet trong trình duyệt
  (`@imgly/background-removal`), cuối cùng là thuật toán tại chỗ (palette nền k-means + flood-fill +
  vá lỗ hổng + giữ phụ kiện + dọn nền dính mép). Sau đó dựng thành **billboard 3D** nghiêng nhẹ —
  cốc giữ đúng hình dáng thật; billboard có **lớp bóng mờ phía sau** nên trông dày, không như sticker.
  **Ảnh được làm thẳng tự động**: silhouette lệch (chụp tay) được đo bằng PCA trên alpha rồi xoay
  lại cho trục cốc **thẳng đứng** (bỏ qua nếu lệch > 35°) + crop sát viền.
  **Popup tiến trình khi tải ảnh** (`components/WaterLoader`): modal giữa màn hình với **vòng tròn nước
  dâng theo %** (2 lớp sóng xoay lệch pha + bọt nổi) — 0–55% là % byte đã gửi (`onUploadProgress`),
  55–95% là lúc server tách nền (nước dâng dần), 100% khi xong rồi tự đóng.
  **Bù phần bị che mất cho cân đối**: tìm trục dọc của cốc, hàng nào một bên hụt > 28% so với bên
  kia (tay/phụ kiện che) thì **lấy gương bên còn đầy lấp vào** (chỉ lấp khi phần thiếu ≤ 45% nửa
  bề rộng) → silhouette đối xứng hai bên.
  **Chưa tải ảnh thì dùng ly thuỷ tinh mặc định.**
- **Tự định vị điểm đổ nước**: `detectPourPoint` (trong `utils/cutout.js`) dò silhouette ảnh cốc — bỏ qua
  nắp/cổ chai, lấy hàng đầu tiên đủ rộng rồi lấy mép phải → dòng nước tràn luôn bắt đầu đúng miệng cốc,
  áp dụng cho mọi loại chai/cốc và cả ly mặc định.

- **Nước chờ duyệt**: tài khoản có partner thì phiếu mới ở trạng thái *chờ duyệt* — cốc vẽ thêm một lớp
  nước mờ (kèm đường mức) trên phần đã duyệt, nên bấm "Uống nước" là vẫn thấy nước dâng ngay.

- **Hiệu ứng nước dâng**: một shader duy nhất (`billboardFragment`) tính đường mặt nước theo
  `uProgress` + **2 sóng sin chồng nhau chạy theo thời gian** → mép nước gợn sóng, mềm, không còn
  đường cắt ngang cứng. **Mực nước đi theo % và dâng tới sát miệng khi đạt 100%** (chặn ở 97% để
  chừa vành/miệng); phần chìm trong nước được **nhuộm màu nước nhẹ + khúc xạ gợn** (vừa phải để vẫn
  thấy hoạ tiết trên cốc), phần khô tối nhẹ (`uDim 0.72`, `uSaturation 0.22`). Kèm theo: khúc xạ nhẹ + dải sáng sát mặt nước, ánh lấp lánh chạy, vân nước
  chảy (caustic) trong phần đã uống; phần chưa uống bị tối + giảm bão hoà. Mực nước dâng từ từ
  (`lerp`) mỗi khi % thay đổi. Canvas render ở `dpr` tới 2 và texture bật anisotropic + mipmap để nét.

- **Màu nước tự nhận diện**: `utils/cutout.js` phân tích ảnh cốc (nửa dưới, bỏ pixel trắng/xám/đen) để lấy
  **màu nước thật** (`liquidColor`) — giọt nước, vũng nước, ánh sáng mặt nước và màu nước trong ly đều dùng
  màu này thay vì luôn xanh.
- **Avatar tác động vào cốc** (`CupAvatarFx`): avatar **đẩy lên** rồi mới tác động —
  - Người uống thêm nước: avatar **nghiêng 42° như cầm cốc rót** (dùng `transform` + `transition`
    chứ không dùng CSS keyframes → luôn chạy kể cả khi vừa chuyển trang quay lại, không bị "đứng").
  - Partner trừ nước: avatar partner đẩy lên, **vòng va chạm** + rung, rồi cốc nghiêng đổ nước ra.
  Hiệu ứng tự kết thúc (1–4s), không chặn thao tác.

## Linh vật & kỷ nguyên (`/mascot`)

Linh vật tiến hoá theo **kỷ nguyên**, mở khoá bằng **giọt** kiếm từ chuỗi ngày uống đủ chỉ tiêu.

| Quy tắc | Giá trị |
|---|---|
| Giọt mỗi ngày đạt chỉ tiêu | `10 + 3 × chuỗi ngày` (một lần/ngày, không cộng trùng) |
| Cấu trúc | kỷ nguyên × 5 cấp (admin tự tạo bao nhiêu kỷ nguyên cũng được) |
| Mua | **Mở kỷ nguyên** = `UnlockPrice`, **Nâng cấp** = `Price` của cấp kế tiếp |
| Kỷ nguyên giá 0 | tự mở cấp 1 cho mọi người |

- `DW System/Entities/Era.cs` — `Era`, `EraLevel`, `UserEraProgress`, `WaterCoins.RewardFor()`.
- `DW System/Controllers/EraController.cs` — `GET /api/eras`, `POST /api/eras/{id}/unlock|upgrade`.
- `DW System/Controllers/AdminErasController.cs` — CRUD kỷ nguyên + upload ảnh từng cấp.
- `DW System/Data/EraSeeder.cs` — seed 3 kỷ nguyên mẫu khi DB trống.
- `src/features/mascot/pages/MascotLabPage.jsx` — hiện số giọt, thẻ linh vật theo `imageUrl` + màu nền
  của kỷ nguyên, 2 nút Mở / Nâng cấp, lưới toàn bộ kỷ nguyên.
- `src/features/admin/pages/AdminEras.jsx` (`/admin/eras`) — admin sửa tên, mô tả, thứ tự, giá mở khoá,
  2 màu nền, bật/tắt và **tải ảnh cho từng cấp**; không phải sửa code để thêm kỷ nguyên mới.
- Ảnh: `public/mascots/era1/1..5.webp`, `era2/1..5.webp`; ảnh admin upload nằm ở `/uploads/...`.
  Kỷ nguyên 3 đang mượn ảnh era1 vì chưa có bộ ảnh riêng.

## Ghi chú

- 3D: `WaterCup3D` dùng `useFrame` để nội suy mực nước; không dùng env map
  (tránh tải HDR từ mạng), ánh sáng đặt thủ công.
- **Giới hạn**: cốc từ ảnh là *billboard* (ảnh tách nền + nghiêng nhẹ), không phải mesh xoay 360°.
  Độ nét phụ thuộc ảnh gốc — ảnh nhỏ (< 700 px) được phóng ×2 + làm nét nhưng không thể thêm chi
  tiết; nên dùng ảnh ≥ 800 px, chụp trên nền trơn.
- Token lưu `localStorage` (`drinkwater.token`). 401 → xoá token và về `/login`.
- SignalR tự kết nối lại mỗi 5 giây nếu rớt.
## Cài như app (PWA)

- `public/manifest.webmanifest`: tên, icon 192/512 (+ maskable), `display: standalone`, shortcut Hôm nay/Lịch/Cài đặt.
- `index.html`: `theme-color`, `viewport-fit=cover`, `apple-touch-icon`, `apple-mobile-web-app-*`.
- Icon: `public/icon.svg` (nguồn) → `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`.
- `public/sw.js`: nhận Web Push, hiện thông báo (rung theo tính cách, `requireInteraction` cho Ác quỷ) và
  cache app shell **chỉ ở bản production** (`register('/sw.js?mode=prod|dev')` — dev không cache để tránh bản cũ).
- `components/InstallHint.jsx`: gợi ý "Thêm vào MH chính" (Android dùng `beforeinstallprompt`, iOS hướng dẫn Chia sẻ).
- iPhone: chỉ nhận thông báo khi đã **Thêm vào MH chính** (iOS 16.4+); iOS không hỗ trợ rung và không cho chọn âm riêng.
- Kiểm tra bằng Chrome DevTools → Application: manifest 0 lỗi, `installabilityErrors: []`.
## App Android / iOS (Capacitor)

Đã cấu hình sẵn: `capacitor.config.json` (appId `com.drinkwater.app`), nền tảng `android/` đã tạo,
icon + icon thông báo riêng, quyền Android (POST_NOTIFICATIONS, VIBRATE, SCHEDULE_EXACT_ALARM,
RECEIVE_BOOT_COMPLETED, CAMERA).

### Android
```bash
npm run app:apk      # build web → cap sync → gradle assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk  (~4.5 MB)
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
# hoặc mở bằng Android Studio:
npm run app:open
```
Yêu cầu: JDK 17+ (`JAVA_HOME`), Android SDK 35 (`ANDROID_HOME`). Nếu chưa có SDK thì cài Android Studio,
hoặc chỉ command-line tools:
```bash
sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"
```
`android/local.properties` phải trỏ `sdk.dir` tới SDK. Project nằm trong thư mục có dấu (DỰ ÁN) nên
`android/gradle.properties` đã bật `android.overridePathCheck=true`.

**Nhắc uống nước trong app native**: `utils/nativeReminders.js` dùng `@capacitor/local-notifications`
để đặt lịch của hệ điều hành (Ác quỷ = thông báo "dính" + rung mạnh), tự đặt lại mỗi khi cấu hình thay đổi.
Web vẫn dùng Web Push (server) — hai cơ chế bổ sung nhau.

### iOS (cần macOS + Xcode)
```bash
npm i @capacitor/ios
npx cap add ios
npm run app:sync          # build web rồi sync sang ios/
npx cap open ios          # mở Xcode → ký (Signing & Capabilities) → chạy máy thật
```
Trong Xcode bật **Background Modes → Remote notifications** nếu muốn push; thông báo local không cần.
Capacitor 7 yêu cầu iOS 13+, Pod cần `sudo gem install cocoapods`.

### Trỏ app vào backend
- Bản build web nhúng trong app gọi API theo `VITE_API_URL` (đặt trong `.env` trước khi `npm run build`),
  ví dụ `VITE_API_URL=https://api.ten-mien-cua-ban.com`.
- CORS backend đã cho phép `capacitor://localhost`, `https://localhost`, `http://localhost`
  (thêm origin khác qua `Cors:Origins` trong appsettings).
- Test nhanh trên điện thoại bằng tunnel HTTPS: `.\scripts\tunnel.ps1` → mở URL `https://…trycloudflare.com`.
  (Thông báo/push chỉ hoạt động trên HTTPS.)

### Ký bản phát hành (Play Store)
```bash
keytool -genkey -v -keystore drinkwater.keystore -alias drinkwater -keyalg RSA -keysize 2048 -validity 10000
# android/key.properties: storeFile/storePassword/keyAlias/keyPassword
npm run app:apk            # hoặc Build → Generate Signed Bundle (AAB) trong Android Studio
```
#   R e a r l y  
 