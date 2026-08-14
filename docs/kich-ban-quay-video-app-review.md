# Kịch bản quay video — App Review (cụm quyền lõi)

> Dùng **1 video** (1 lần quay, không cắt dựng) cho cả 4 quyền: `pages_show_list` · `pages_manage_metadata` · `pages_messaging` · `public_profile`.
> Tải **cùng 1 file** này lên cho cả 4 ô video trong form App Review — không cần quay riêng từng cái.
>
> **Khác bản kịch bản cũ:** trước đây giả định thao tác trong console Meta. Giờ hệ thống đã có
> **Novaon Bot Studio** (dashboard riêng) — toàn bộ luồng kết nối Trang diễn ra ngay trong sản phẩm
> thật, không cần mở Meta Developer console. Đây chính là luồng reviewer cần thấy: một khách hàng
> Novaon dùng sản phẩm thật, không phải nhân viên kỹ thuật vọc console.

## Chuẩn bị trước khi quay (bắt buộc, làm đúng thứ tự)

- [ ] **Gỡ quyền app cũ trước:** vào Facebook → Cài đặt & quyền riêng tư → Cài đặt →
      Ứng dụng và trang web → tìm **"Novaon Chatbot"** → Xoá. *(Bắt buộc — nếu không làm bước
      này, Facebook sẽ nhớ lần cấp quyền trước và nhảy thẳng qua các màn "Tiếp tục dưới tên…",
      "Chọn Trang bạn quản lý" mà không hỏi lại → video thiếu mất đúng những màn reviewer cần
      xem nhất.)*
- [ ] Trong Studio, vào campaign **Sông Hồng Demo**, nếu Trang Nobo Ai đang hiện "Đã kết nối" —
      không cần gỡ trong DB, cứ bấm kết nối lại là ghi đè token mới, không lỗi gì.
- [ ] Trang test **Nobo Ai** đã là Trang Lộc quản lý (đã đúng từ trước).
- [ ] Một **tài khoản Facebook thứ 2** (khác tài khoản admin) để đóng vai "khách hàng" nhắn tin —
      dùng điện thoại hoặc trình duyệt ẩn danh. *(Không có thì dùng luôn tài khoản của Lộc nhắn
      từ Messenger di động, miễn thấy được cả 2 phía: người nhắn + Trang trả lời.)*
- [ ] Phần mềm quay màn hình bất kỳ (Loom, OBS, hoặc quay màn hình sẵn có của máy). Nếu quay được
      cả **màn hình máy tính (Studio) + điện thoại (Messenger khách)** trong cùng khung hình thì
      tốt nhất — không thì quay lần lượt, miễn liền mạch không cắt.
- [ ] Đăng nhập sẵn Studio (`/studio`, tài khoản `novaon` — password Lộc đang giữ) trước khi bấm
      Record, để khỏi lộ màn login Basic Auth trong video (không cần thiết cho reviewer).

**Không cắt dựng, không tua nhanh** — Meta muốn thấy luồng thật, liền mạch một lần quay.
Tổng thời lượng ~70–100 giây là đủ.

---

## Kịch bản — 6 cảnh liên tục, không dừng quay giữa chừng

### Cảnh 1 — Mở trang cấu hình dự án trong Studio
**Quay:** màn hình Studio đang mở sẵn ở `/studio/campaigns/1/edit` (campaign Sông Hồng Demo),
cuộn xuống đúng khối **"Kết nối Trang Facebook"**.

**Lời thoại:**
> "Đây là Novaon Bot Studio — trang quản trị nội bộ nơi khách hàng của Novaon thiết lập chatbot
> cho Trang Facebook của họ. Để bắt đầu, quản trị viên bấm nút Kết nối với Facebook."

**Hành động:** trỏ chuột vào nút xanh **"Kết nối với Facebook"** (nền `#1877F2`, có logo Facebook)
→ bấm.

---

### Cảnh 2 — Facebook hỏi xác nhận đăng nhập (chứng minh khởi động đúng luồng OAuth chuẩn)
**Quay:** màn hình Facebook Login dialog hiện ra — **"Tiếp tục dưới tên Lê Hoàng Lộc?"**

**Lời thoại:**
> "Vì đã gỡ quyền trước khi quay, Facebook hiển thị đầy đủ màn xác nhận danh tính chuẩn OAuth."

**Hành động:** bấm nút xanh **"Tiếp tục dưới tên..."**.

---

### Cảnh 3 — Chọn Trang để cấp quyền (chứng minh `pages_show_list`)
**Quay:** màn hình Facebook hỏi **chọn Trang** muốn cấp quyền cho app (danh sách các Trang tài
khoản đang quản lý, có thể chọn 1 hoặc nhiều).

**Lời thoại:**
> "Facebook yêu cầu người dùng chọn đúng Trang muốn cấp quyền — đây là bước Facebook tự kiểm
> soát, đảm bảo chỉ Trang được chọn mới cấp dữ liệu cho ứng dụng."

**Hành động:** tick chọn Trang **Nobo Ai** → bấm Tiếp tục → (nếu có thêm màn tổng hợp quyền
"Xem lại quyền" thì bấm Tiếp tục lần nữa) → **Xong/Hoàn tất**.

---

### Cảnh 4 — Ứng dụng lấy danh sách Trang, quản trị viên chọn Trang để kết nối
**Quay:** Facebook redirect thẳng về trang của mình — **"Chọn Trang để kết nối"** (`/oauth/facebook/select`),
danh sách hiện Trang Nobo Ai (dùng chính `pages_show_list` vừa cấp để lấy về).

**Lời thoại:**
> "Ứng dụng dùng quyền pages_show_list để lấy danh sách các Trang vừa được cấp quyền, hiển thị
> lại để quản trị viên xác nhận lần cuối đúng Trang muốn gắn chatbot."

**Hành động:** bấm nút **"Kết nối"** cạnh Trang Nobo Ai.

---

### Cảnh 5 — Kết nối thành công, webhook tự đăng ký (chứng minh `pages_manage_metadata`)
**Quay:** trang tự động quay lại `/studio/campaigns/1/edit`, hiện dòng thông báo xanh
**"Đã kết nối Trang Facebook "Nobo Ai" ✅"** và bảng liệt kê Trang đã kết nối (tên, ID, trạng thái,
thời điểm kết nối).

**Lời thoại:**
> "Ngay khi kết nối, hệ thống dùng pages_manage_metadata để tự động đăng ký Trang vào webhook
> messages và messaging_postbacks — không cần quản trị viên thao tác gì thêm trong Meta console."

**Hành động:** trỏ chuột vào dòng "Đã kết nối" + timestamp, giữ khung hình 2–3 giây cho reviewer
đọc rõ.

*(Tuỳ chọn, nếu muốn thêm bằng chứng: mở nhanh Meta App → Messenger → Cài đặt API → mục "Gói
đăng ký Webhook" cho thấy dòng Nobo Ai đã tick sẵn `messages`, `messaging_postbacks` — chứng minh
việc tự đăng ký ở Cảnh 5 là thật, không phải chỉ hiện UI.)*

---

### Cảnh 6 — Khách nhắn tin, bot trả lời (chứng minh `pages_messaging` + `public_profile`)
**Quay:** chuyển sang điện thoại/tab khác — tài khoản "khách" mở Messenger, nhắn vào Trang
**Nobo Ai**, quay cả câu hỏi lẫn câu trả lời hiện ra.

**Lời thoại:**
> "Khi khách hàng nhắn tin cho Trang, ứng dụng dùng pages_messaging để nhận nội dung và gửi lại
> câu trả lời tự động từ AI. Ứng dụng cũng dùng public_profile để lấy tên hiển thị của khách,
> giúp trợ lý xưng hô đúng và cá nhân hóa cuộc trò chuyện."

**Hành động — gõ đúng các câu sau, để lộ rõ 3 tính năng lõi:**

1. Gõ: **"cho em hỏi đệm Sông Hồng có mấy loại?"**
   → Bot trả lời liệt kê sản phẩm (chứng minh AI trả lời dựa trên knowledge).
2. Gõ: **"cho xem ảnh đệm bông ép"**
   → Bot trả lời **kèm ảnh sản phẩm** (chứng minh tính năng gửi ảnh — nên giữ cảnh này dù không
   phải quyền đang xin, để reviewer thấy use case rõ ràng, tăng độ tin cậy hồ sơ).
3. Gõ: **"mình muốn mua đệm 1m6, sđt mình là 09xxxxxxxx"**
   → Bot xác nhận sẽ có nhân viên liên hệ (chứng minh bot không tự chốt, đúng chính sách, không
   spam).

---

### Cảnh 7 — Chốt cảnh (không bắt buộc, nhưng nên có)
**Quay:** quay lại màn hình Trang Facebook Nobo Ai (Meta Business Suite hoặc hộp thư Trang), cho
thấy đoạn hội thoại vừa rồi nằm trong hộp thư thật của Trang — chứng minh toàn bộ diễn ra qua
đúng Trang đã kết nối ở Cảnh 4–5, không phải giả lập.

**Lời thoại:**
> "Toàn bộ hội thoại diễn ra trong hộp thư Messenger của Trang, đúng theo phạm vi các quyền đã
> yêu cầu."

---

## Sau khi quay xong

1. Xuất file video (mp4/mov, không cần chỉnh sửa nhiều — có thể lồng phụ đề tiếng Việt hoặc
   tiếng Anh nếu muốn an toàn hơn với reviewer).
2. Vào từng ô quyền trong "Yêu cầu xét duyệt ứng dụng" → dán **mô tả tương ứng** (mẫu đã đưa
   trước đó) → **tải cùng 1 file video này lên** → tick đồng ý → Lưu.
3. Lặp lại cho cả 4 quyền: `pages_show_list`, `pages_manage_metadata`, `pages_messaging`,
   `public_profile`.
4. Kiểm tra lại card "Xử lý dữ liệu" và "Hướng dẫn dành cho người xét duyệt" (2 bước sau "Cách
   sử dụng hợp lệ") trước khi Submit.

## Nhắc lại — quyền KHÔNG cần quay/xin ở đợt này

Nếu app đang hiện thêm `pages_read_engagement`, `pages_utility_messaging`, `business_management`
mà bot **chưa làm luồng comment / chưa multi-tenant thật** → nên **gỡ khỏi yêu cầu gửi** (link
"chỉnh sửa nội dung gửi" ở đầu trang) để hồ sơ gọn, tăng khả năng đậu nhanh. Xin lại sau khi
luồng đó code xong và quay được video thật.
