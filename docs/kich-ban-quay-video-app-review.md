# Kịch bản quay video — App Review (cụm quyền lõi)

> Dùng 1 video (1 lần quay, không cắt) cho cả 4 quyền: `pages_show_list` · `pages_manage_metadata` · `pages_messaging` · `public_profile`.
> Tải **cùng 1 file** này lên cho cả 4 ô video trong form App Review — không cần quay riêng từng cái.

## Chuẩn bị trước khi quay

- [ ] Trang test **Nobo Ai** đã kết nối app (đã làm ở Phase 0).
- [ ] Một **tài khoản Facebook thứ 2** (khác tài khoản admin) để đóng vai "khách hàng" nhắn tin — dùng điện thoại hoặc trình duyệt ẩn danh. *(Nếu không có, dùng luôn tài khoản của Lộc nhắn từ Messenger di động, miễn thấy được cả 2 phía: người nhắn + Trang trả lời.)*
- [ ] Phần mềm quay màn hình bất kỳ (Loom, OBS, hoặc quay màn hình sẵn có của máy).
- [ ] Card mô tả từng quyền đã điền sẵn text (mình đã đưa mẫu ở tin trước) — quay xong thì dán mô tả + gắn video vào từng ô tương ứng.

**Không cắt dựng, không tua nhanh** — Meta muốn thấy luồng thật, liền mạch. Tổng thời lượng ~60–90 giây là đủ.

---

## Kịch bản — 4 cảnh liên tục

### Cảnh 1 — Chọn Trang để kết nối (chứng minh `pages_show_list`)
**Quay:** màn hình lúc bấm "Kết nối trang" trên Meta App (mục Cài đặt API Messenger → phần "Tạo mã truy cập" → Kết nối) hoặc lại đúng bước OAuth "Chọn Trang bạn quản lý".

**Lời thoại (voiceover, nói khi quay hoặc lồng phụ đề sau):**
> "Đây là bước người quản trị Fanpage chọn đúng Trang muốn kết nối chatbot Novaon. Ứng dụng dùng quyền pages_show_list để hiển thị danh sách các Trang mà tài khoản này đang quản lý."

**Hành động:** cho thấy **danh sách Trang hiện ra** → **chọn Nobo Ai** → bấm tiếp tục.

---

### Cảnh 2 — Đăng ký webhook cho Trang (chứng minh `pages_manage_metadata`)
**Quay:** phần "Gói đăng ký Webhook" trong Messenger API Settings — nơi hiện dòng `messages và messaging_postbacks` đã đăng ký cho Trang Nobo Ai (đúng cái Lộc đã làm ở Phase 0).

**Lời thoại:**
> "Sau khi chọn Trang, ứng dụng dùng pages_manage_metadata để đăng ký Trang vào webhook, giúp hệ thống nhận được sự kiện tin nhắn mới theo thời gian thực."

**Hành động:** trỏ chuột vào dòng hiển thị Trang **Nobo Ai** kèm 2 field `messages`, `messaging_postbacks` đã bật.

---

### Cảnh 3 — Khách nhắn tin, bot trả lời (chứng minh `pages_messaging` + `public_profile`)
**Quay:** chia đôi hoặc quay lần lượt — (a) màn hình Messenger của "khách" nhắn vào Trang Nobo Ai, (b) tin nhắn Trang trả lời hiện ra.

**Lời thoại:**
> "Khi khách hàng nhắn tin cho Trang, ứng dụng dùng pages_messaging để nhận nội dung và gửi lại câu trả lời tự động từ AI. Ứng dụng cũng dùng public_profile để lấy tên hiển thị của khách, giúp trợ lý xưng hô đúng và cá nhân hóa cuộc trò chuyện."

**Hành động — gõ đúng các câu sau, để lộ rõ 3 tính năng lõi:**

1. Gõ: **"cho em hỏi đệm Sông Hồng có mấy loại?"**
   → Bot trả lời liệt kê sản phẩm (chứng minh AI trả lời dựa trên knowledge).
2. Gõ: **"cho xem ảnh đệm bông ép"**
   → Bot trả lời **kèm ảnh sản phẩm** (chứng minh tính năng gửi ảnh — nên giữ cảnh này dù không phải quyền đang xin, để reviewer thấy use case rõ ràng, tăng độ tin cậy hồ sơ).
3. Gõ: **"mình muốn mua đệm 1m6, sđt mình là 09xxxxxxxx"**
   → Bot xác nhận sẽ có nhân viên liên hệ (chứng minh bot không tự chốt, đúng chính sách, không spam).

---

### Cảnh 4 — Chốt cảnh (không bắt buộc, nhưng nên có)
**Quay:** quay lại màn hình Trang Facebook Nobo Ai, cho thấy đoạn hội thoại vừa rồi nằm trong hộp thư của Trang — chứng minh toàn bộ diễn ra qua đúng Trang đã kết nối, không phải giả lập.

**Lời thoại:**
> "Toàn bộ hội thoại diễn ra trong hộp thư Messenger của Trang, đúng theo phạm vi các quyền đã yêu cầu."

---

## Sau khi quay xong

1. Xuất file video (mp4/mov, không cần chỉnh sửa nhiều — có thể lồng phụ đề tiếng Việt hoặc tiếng Anh nếu muốn an toàn hơn với reviewer).
2. Vào từng ô quyền trong "Yêu cầu xét duyệt ứng dụng" → dán **mô tả tương ứng** (mẫu ở tin trước) + **tải cùng 1 file video này lên** → tick đồng ý → Lưu.
3. Lặp lại cho cả 4 quyền: `pages_show_list`, `pages_manage_metadata`, `pages_messaging`, `public_profile`.
4. Kiểm tra lại card "Xử lý dữ liệu" và "Hướng dẫn dành cho người xét duyệt" (2 bước sau "Cách sử dụng hợp lệ") trước khi Submit.

## Nhắc lại — quyền KHÔNG cần quay/xin ở đợt này

Nếu app đang hiện thêm `pages_read_engagement`, `pages_utility_messaging`, `business_management` mà bot **chưa làm luồng comment / chưa multi-tenant thật** → nên **gỡ khỏi yêu cầu gửi** (link "chỉnh sửa nội dung gửi" ở đầu trang) để hồ sơ gọn, tăng khả năng đậu nhanh. Xin lại sau khi luồng đó code xong và quay được video thật.
