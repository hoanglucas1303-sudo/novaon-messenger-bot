# Novaon Messenger Bot — Context

> Đọc file này trước khi làm bất cứ thứ gì trong project. Cập nhật sau mỗi phase.

## Đề bài

Nền tảng **chatbot AI trên Facebook Messenger** cho các **Client** của Novaon. Khách hàng của Client nhắn vào Fanpage → bot hỏi đáp về **sản phẩm của Client**, trả lời text **+ gửi được 1 hoặc nhiều ảnh** sản phẩm.

- **Đối tượng dùng bot:** khách hàng cuối của Client.
- **Chủ vận hành:** chủ Fanpage (Client), nhưng **backend đặt ở server Novaon** (multi-tenant về sau).
- **Kênh đầu tiên:** Facebook Messenger (test bằng Fanpage của Lộc trước).

## Quyết định đã chốt

1. **Cơ chế AI = Kiểu A**: human viết trước *persona + luật trả lời + câu mẫu*, bot tự chạy 100% theo đó. (Không phải duyệt-từng-tin, không phải takeover — để dành sau.)
2. **Ảnh sản phẩm:** backend Novaon tự host ảnh (URL public) → gửi qua Messenger bằng URL. LLM tự quyết gửi ảnh nào qua "tool".
3. **Meta:** giai đoạn đầu chạy **Development mode** (chỉ page + admin/tester) → **không cần App Review**. Chỉ nộp review `pages_messaging` khi go-live cho Client thật.
4. **Stack:** Node + Express (backend webhook), deploy Railway. Postgres (Railway) khi cần lưu knowledge/tenant. LLM = Claude qua OpenRouter (`anthropic/claude-sonnet-4.6`).

## Lộ trình (phase — dừng review từng bước)

- [x] **Phase 0 — Xương sống:** webhook verify + echo. Backend Express.
- [ ] **Phase 1 — Trả lời bằng AI (A):** knowledge đơn giản + persona/luật → LLM soạn câu trả lời.
- [ ] **Phase 2 — Gửi ảnh:** gắn ảnh vào sản phẩm, LLM tự quyết gửi.
- [ ] **Phase 3 — RAG thật:** pgvector + tìm kiếm ngữ nghĩa (brainstorm thêm).
- [ ] **Phase 4 — Admin cho human:** trang cấu hình persona/luật/sản phẩm/ảnh. Multi-tenant.
- [ ] **Phase 5 — Go-live:** Meta App Review + (tùy chọn) human takeover.

## Trạng thái hiện tại

**Phase 0 — scaffold xong, chờ nối Meta.**

Cấu trúc:
```
src/index.js       webhook GET (verify) + POST (nhận sự kiện) + echo
src/messenger.js   Send API: sendText / sendImage / sendImages / sendTypingOn
src/config.js      đọc env
.env.example       PAGE_ACCESS_TOKEN, VERIFY_TOKEN, APP_SECRET, OPENROUTER_API_KEY...
```

## Việc cần Lộc / còn treo

- **Fanpage test:** Lộc chọn/tạo page nào để test? (cần quyền admin)
- **Deploy Railway** để có URL https công khai cho webhook (Meta yêu cầu https).
- **Tạo Meta App + lấy PAGE_ACCESS_TOKEN + cấu hình Webhook:** Claude lái hộ qua trình duyệt, Lộc đăng nhập Facebook + bấm xác nhận.
- **Key OpenRouter:** dùng lại key Future Content hay cấp riêng? (Phase 1 mới cần.)

## Ghi chú kỹ thuật

- Webhook phải trả `200` nhanh, xử lý sự kiện bất đồng bộ (Meta retry nếu chậm).
- Verify chữ ký `X-Hub-Signature-256` bằng `APP_SECRET` (đã có, bỏ qua nếu chưa đặt secret).
- Development mode: chỉ tài khoản có vai trò trong App (admin/dev/tester) mới nhắn thử được.
