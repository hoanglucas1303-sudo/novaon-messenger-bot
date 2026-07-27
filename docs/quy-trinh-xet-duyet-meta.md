# Quy trình xét duyệt Meta — để bot nhắn được khách lạ

> Bot hiện chạy ở **Development mode**: chỉ tài khoản có vai trò trong App (Admin/Dev/**Tester**) mới nhận được trả lời của bot.
> Để bot trả lời **mọi khách lạ**, cần qua **2 cửa của Meta**: **Business Verification** + **App Review** (`pages_messaging`), rồi chuyển App sang **Live**.
> Không mất phí, chỉ mất **thời gian (~1–2 tuần, có thể vài vòng)**. Không chặn việc build — vẫn phát triển/test ở Dev mode tới lúc đó.

---

## 7 bước

### 1. Chuẩn bị hồ sơ App (làm trước, không cần chờ Meta)
- Điền đủ App Settings: **tên hiển thị, icon, category, app domain**.
- **Privacy Policy URL** — bắt buộc, trang công khai mô tả bot thu thập/dùng dữ liệu gì (SĐT khách, nội dung chat...).
- **Data Deletion** — hướng dẫn/callback xóa dữ liệu người dùng.

### 2. Business Verification — xác minh doanh nghiệp
- Trong Meta Business Manager: khai **tên pháp lý, địa chỉ, SĐT, website** (Novaon hoặc Client).
- Tải **giấy tờ**: Giấy ĐKKD / giấy phép kinh doanh.
- Meta có thể xác minh thêm qua **email tên miền** hoặc điện thoại.
- ⏳ Meta duyệt: **vài ngày** (có thể hỏi bổ sung).

### 3. Chuẩn bị bài nộp App Review
- Chọn quyền: **`pages_messaging`** (Advanced Access).
- Viết **mô tả use case** rõ ràng: bot làm gì, dùng quyền để làm gì.
- **Quay video screencast demo** luồng đầy đủ: khách nhắn page → bot trả lời → gửi ảnh → xin thông tin.
  - ⚠️ **Đây là phần hay bị fail nhất** — video không rõ luồng dùng quyền là bị trả lại.
- Cấp **tài khoản test** cho reviewer bấm thử (hoặc hướng dẫn test).

### 4. Submit for Review
- Bấm submit trong mục App Review → App chuyển trạng thái **"In Review"**.

### 5. Meta review
- Reviewer (người + tự động) xem video, test luồng, đối chiếu **Platform Policy**.
- ⏳ **Vài ngày → 1–2 tuần**. Có thể **nhiều vòng**: reject kèm lý do → sửa → nộp lại.

### 6. Kết quả
- **Approved** → được cấp **Advanced Access** cho `pages_messaging`.
- **Rejected** → Meta nêu **lý do cụ thể** → sửa đúng chỗ đó → nộp lại. Không mất phí.

### 7. Chuyển App sang "Live"
- Gạt toggle **Live** ở đầu App dashboard (sau khi approved + business verified).
- ✅ Bot nhắn được **mọi khách lạ**.

---

## Những thứ hay làm RỚT review (né sẵn)
- Privacy Policy thiếu hoặc link chết.
- Video demo không cho thấy rõ quyền được dùng để làm gì.
- Business chưa verified.
- Bot vi phạm policy: spam, thu thập dữ liệu quá mức, nài ép SĐT, nội dung cấm.
- Không tuân thủ luật **cửa sổ 24h** (khi Live).

---

## Điểm riêng cho Novaon (agency phục vụ nhiều Client)
- App đóng vai **"Tech Provider"**: 1 app phục vụ **nhiều Fanpage của nhiều Client**.
- **Duyệt cực 1 lần** cho app. Sau đó **mỗi Client mới chỉ cần chủ page kết nối + cấp quyền** (qua Business Manager) — **không review lại từ đầu**.
- → Chi phí duyệt là chi phí 1 lần, sau đó nhân bản cho nhiều Client rẻ.

---

## Chuẩn bị trước để duyệt nhanh & đậu (checklist)
- [ ] Dựng trang **Privacy Policy** (host trên Railway).
- [ ] Hoàn thiện bot mượt để **quay video demo** đẹp.
- [ ] Viết **mô tả use case** + kịch bản video.
- [ ] Chuẩn bị **giấy tờ doanh nghiệp** cho Business Verification.
- [ ] Set **App Secret** (verify chữ ký webhook — hardening).

---

## Trạng thái Dev mode trong lúc chờ (dùng ngay được)
- **Demo cho 1 Client:** add tài khoản Facebook của Client làm **Tester** → họ nhắn thử bot thật ngay, không cần review.
- **Human trả lời tay** từ hộp thư Trang: nhắn được **bất kỳ ai** bất kể Dev/Live (không bị giới hạn).
