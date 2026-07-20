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

- [x] **Phase 0 — Xương sống:** webhook verify + echo. Backend Express. ✅ VERIFIED 2026-07-20 (echo chạy thật trên page Nobo AI).
- [x] **Phase 1 — Trả lời bằng AI (A):** knowledge (persona+luật+catalog Sông Hồng) → LLM (OpenRouter). ✅ VERIFIED 2026-07-20.
- [x] **Phase 2 — Gửi ảnh:** LLM chèn dấu `##IMG:<id>` → backend gửi ảnh sản phẩm. ✅ VERIFIED 2026-07-20 (ảnh hiện thật trên Messenger).
- [ ] **Phase 3 — RAG thật:** pgvector + tìm kiếm ngữ nghĩa (brainstorm thêm).
- [ ] **Phase 4 — Admin cho human:** trang cấu hình persona/luật/sản phẩm/ảnh. Multi-tenant.
- [ ] **Phase 5 — Go-live:** Meta App Review + (tùy chọn) human takeover.

## Trạng thái hiện tại

**Phase 0 — XONG & chạy thật (2026-07-20).** Bot echo trả lời trên page Nobo AI.

Cấu trúc:
```
src/index.js       webhook GET (verify) + POST (nhận sự kiện) + echo
src/messenger.js   Send API: sendText / sendImage / sendImages / sendTypingOn
src/config.js      đọc env
.env.example       PAGE_ACCESS_TOKEN, VERIFY_TOKEN, APP_SECRET, OPENROUTER_API_KEY...
```

## Hạ tầng đã dựng (identifiers)

- **GitHub:** `hoanglucas1303-sudo/novaon-messenger-bot` (branch `main`, Railway auto-deploy).
- **Railway:** project **zealous-stillness** › service **novaon-messenger-bot**.
  - URL: `https://novaon-messenger-bot-production.up.railway.app` — webhook `/webhook`.
  - Env đã set: `PAGE_ACCESS_TOKEN`, `VERIFY_TOKEN=novaon-messenger-verify-2026`, `LLM_MODEL=anthropic/claude-sonnet-4.6`.
  - Env CHƯA set: `APP_SECRET` (verify chữ ký — hardening sau), `OPENROUTER_API_KEY` (Phase 1).
- **Meta App:** "Novaon Chatbot", **App ID `37150034544642460`** (Business, use case "Tương tác với khách hàng trên Messenger"). Đang **Development mode**.
- **Fanpage test:** **Nobo Ai** — Page ID `1220791817792373` (profile URL `facebook.com/profile.php?id=61592078012566`). Webhook subscribe: `messages`, `messaging_postbacks`.
- Token đưa vào Railway do **Lộc dán tay** (credential — Claude không nhập/đọc token).

## Việc còn treo

- **Key OpenRouter:** dùng lại key Future Content hay cấp riêng? (Phase 1 cần → set `OPENROUTER_API_KEY` trên Railway.)
- **APP_SECRET:** set sau để bật verify chữ ký webhook (hardening).
- **Go-live:** Meta App Review xin `pages_messaging` + verify business (khi bán cho Client thật).

## Ghi chú kỹ thuật

- Webhook phải trả `200` nhanh, xử lý sự kiện bất đồng bộ (Meta retry nếu chậm).
- Verify chữ ký `X-Hub-Signature-256` bằng `APP_SECRET` (đã có, bỏ qua nếu chưa đặt secret).
- Development mode: chỉ tài khoản có vai trò trong App (admin/dev/tester) mới nhắn thử được.
- **Gửi ảnh:** Facebook Send API KHÔNG fetch được ảnh từ `placehold.co` (lỗi #100 subcode 2018007 "không tải lên được"). → **PHẢI tự host ảnh** trên domain backend (`/assets/products/*.png`, phục vụ qua `express.static('public')`). Facebook fetch domain Railway của mình OK (cùng chỗ webhook). Ảnh placeholder sinh bằng `scripts/gen-placeholders.mjs`.
- **LLM quyết gửi ảnh** bằng cách chèn dòng `##IMG: <id>` ở cuối (llm.js parse + gỡ khỏi text). Đơn giản, chưa cần tool-calling.
- Persona/luật/catalog nằm trong `src/knowledge.js` (Kiểu A). Luật cấm markdown (Messenger hiện `*` thô).
