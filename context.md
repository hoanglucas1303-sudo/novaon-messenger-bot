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
4. **Stack:** Node + Express (backend webhook), deploy Railway. Postgres (Railway) khi cần lưu knowledge/tenant. LLM qua OpenRouter: default Haiku (`anthropic/claude-haiku-4.5`) để tiết kiệm, premium fallback Sonnet (`anthropic/claude-sonnet-4.6`) cho câu phức tạp.
5. **Tầm nhìn HYBRID (bot + người):** bot lo phần lớn hành trình; ở **điểm chạm quan trọng gần cuối** thì con người quan trọng, nhưng **không phải lúc nào cũng cần người**. Cả 2 sẵn sàng, linh hoạt.
6. **PHẠM VI v1 (Lộc chốt 2026-07-20):** bot **KHÔNG chốt đơn, KHÔNG hứa hẹn thay Sale**. Vai trò v1 = *tư vấn + gợi mở → XIN & GHI NHẬN thông tin liên hệ → để Sale tiếp nối bất cứ lúc nào*. Minh bạch 2 phía: khách biết "sẽ có nhân viên liên hệ" (trong hội thoại), quản trị thấy lead trên dashboard. Live-takeover (Handover Protocol) để dành ver sau.

## Lộ trình (phase — dừng review từng bước)

- [x] **Phase 0 — Xương sống:** webhook verify + echo. Backend Express. ✅ VERIFIED 2026-07-20 (echo chạy thật trên page Nobo AI).
- [x] **Phase 1 — Trả lời bằng AI (A):** knowledge (persona+luật+catalog Sông Hồng) → LLM (OpenRouter). ✅ VERIFIED 2026-07-20.
- [x] **Phase 2 — Gửi ảnh:** LLM chèn dấu `##IMG:<id>` → backend gửi ảnh sản phẩm. ✅ VERIFIED 2026-07-20 (ảnh hiện thật trên Messenger).
- [ ] **➡️ ĐANG LÀM — Lát cắt #1: DB + Lead capture ("ghi nhận") + trang xem lead.** Code đã implement 2026-07-20; chờ gắn Railway Postgres + `DASHBOARD_PASSWORD` rồi test thật trên Messenger để verify.
- [ ] **➡️ ĐANG MỞ RỘNG — Platform foundation: Campaign Builder + Web Chat Test.** Code đã implement 2026-07-20: `/studio`, `/studio/demo`, `/chat/:slug`, `/api/chat`, campaign store DB/fallback. Mục tiêu: tạo campaign, nạp hướng dẫn chatbot, test full flow trên web FE và Messenger.
- [ ] **Phase 3 — RAG thật:** pgvector + tìm kiếm ngữ nghĩa (brainstorm thêm).
- [ ] **Phase 4 — Dashboard quản trị data:** persona/luật/catalog/ảnh (chuyển knowledge.js → DB) + xem lead + multi-tenant.
- [ ] **Phase 5 — Go-live:** Meta App Review + Business Verification (~1-2 tuần chờ Meta) + (tùy chọn) Handover Protocol (live-takeover).

## Kế hoạch v1 — Lead capture (lát cắt tiếp theo)

Hiện thực Quyết định #5–#6. Làm theo thứ tự, dừng review từng bước:
1. **DB (Postgres Railway)** — bảng `leads`. ✅ Implement: app tự tạo bảng khi có `DATABASE_URL`.
2. **Bot ghi nhận:** khi khách để lại SĐT / đồng ý để tư vấn liên hệ → LLM phát dấu `##LEAD:{...}` (giống cơ chế `##IMG` đã chạy tốt) → backend **lưu lead** + xác nhận minh bạch với khách. ✅ Implement code; chờ test thật.
3. **Trang xem lead** (mini dashboard) cho Sale: danh sách + chi tiết + ngữ cảnh hội thoại. ✅ Implement `/leads` có Basic Auth; chờ set `DASHBOARD_PASSWORD`.

**Field 1 lead (đề xuất, chờ Lộc chốt):** `Tên (nếu có)` · `SĐT` · `Sản phẩm quan tâm` · `Nhu cầu/Ghi chú` (bot tự tóm) · `Thời gian` · `Trạng thái` (mới / Sale đã liên hệ).
**KHÔNG có trong v1:** bot tự chốt, hứa giá/khuyến mại cụ thể, live-takeover.

## Trạng thái hiện tại

**Phase 0-1-2 — XONG & verified thật (2026-07-20).** Bot Nobo AI: tư vấn AI (persona+luật+catalog Sông Hồng) + gửi ảnh. Đủ 3 tính năng lõi brief. Giọng bot đã chỉnh về hướng "xin thông tin cho Sale, không tự chốt".

**Lát cắt #1 — CODE IMPLEMENTED (2026-07-20), CHƯA VERIFY THẬT.** Đã thêm Postgres `leads`, marker `##LEAD:{...}`, lưu lead sau khi bot trả lời, mini dashboard thật `/leads`, và dashboard demo `/leads/demo` bằng dữ liệu mẫu đã che SĐT. Cần set `DATABASE_URL` + `DASHBOARD_PASSWORD` trên Railway rồi test lead thật bằng Messenger.

**Platform foundation — CODE IMPLEMENTED (2026-07-20), CHƯA VERIFY THẬT.** Đã thêm Campaign Builder `/studio` (cần `DASHBOARD_PASSWORD`), GUI demo `/studio/demo`, web chat public `/chat/song-hong-demo`, API `/api/chat`. Campaign là brain dùng chung cho Messenger + Web Chat. Messenger map campaign bằng Page ID (`event.recipient.id`). Nếu chưa có DB, app dùng campaign Sông Hồng fallback trong RAM; dùng thật cần Railway Postgres.

**Product catalog test data — CODE IMPLEMENTED (2026-07-20).** Đã enrich campaign Sông Hồng fallback bằng giá tham khảo/biến thể và ảnh public từ nguồn online (`demxanh.com`, `songhonghanoi.vn`, `songhongonline.vn`). Ảnh đi qua proxy `/assets/remote-image` với allowlist domain. Dữ liệu phục vụ test flow hỏi giá/ảnh, chưa phải nguồn giá chính thức để bán thật.

**Import Center — CODE IMPLEMENTED (2026-07-20), MVP.** Đã thêm `/studio/import` (auth) và `/studio/import/demo` (public demo). Luồng: paste text hoặc URL website → AI extractor dùng premium model → draft `products/knowledge/rules/recommendationRules` → PM review → publish merge vào campaign. Nếu thiếu OpenRouter key thì có heuristic fallback. Draft hiện lưu RAM; bước tiếp theo là lưu `import_drafts` vào Postgres và thêm upload PDF/Excel.

**Unified Dashboard — CODE IMPLEMENTED (2026-07-20).** Đã thêm `/dashboard` (auth) và `/dashboard/demo` (public demo). Gom quản lý dự án/campaign, nút bật chat demo, update knowledge nhanh, import tài liệu và lead gần nhất vào một màn. Các route `/studio`, `/studio/import`, `/leads` vẫn là màn chuyên sâu.

Cấu trúc:
```
src/index.js       webhook (verify + nhận sự kiện) + gửi text/ảnh + route /assets host ảnh
src/messenger.js   Send API: sendText / sendImage / sendImages / sendTypingOn
src/llm.js         gọi OpenRouter, build system prompt theo campaign, lịch sử RAM, parse ##IMG + ##LEAD
src/db.js          Postgres helper + tự tạo bảng leads + CRUD trạng thái
src/campaigns.js   campaign store DB/fallback + default campaign Sông Hồng
src/dashboard.js   mini dashboard /leads xem lead + chi tiết + đổi trạng thái; /leads/demo để xem UI bằng dữ liệu mẫu
src/unified-dashboard.js Dashboard chính /dashboard + /dashboard/demo
src/studio.js      Campaign Builder /studio + web chat /chat/:slug + API /api/chat
src/import-center.js Import Center: convert text/URL tài liệu thành draft data để review/publish
src/media.js       proxy ảnh public qua /assets/remote-image với allowlist domain
src/knowledge.js   persona + luật + catalog Sông Hồng (Kiểu A, human sửa)
src/config.js      đọc env
public/products/   6 ảnh placeholder PNG (sinh bằng scripts/gen-placeholders.mjs)
```

## Hạ tầng đã dựng (identifiers)

- **GitHub:** `hoanglucas1303-sudo/novaon-messenger-bot` (branch `main`, Railway auto-deploy).
- **Railway:** project **zealous-stillness** › service **novaon-messenger-bot**.
  - URL: `https://novaon-messenger-bot-production.up.railway.app` — webhook `/webhook`.
  - Env đã set: `PAGE_ACCESS_TOKEN`, `VERIFY_TOKEN=novaon-messenger-verify-2026`, `LLM_MODEL=anthropic/claude-sonnet-4.6` (nên đổi sang `anthropic/claude-haiku-4.5`), `OPENROUTER_API_KEY` (key Future Content, Lộc dán tay).
  - Env CHƯA set: `APP_SECRET` (verify chữ ký — hardening sau), `PUBLIC_BASE_URL` (mặc định = URL Railway), `DATABASE_URL` (cần cho lead capture), `DASHBOARD_PASSWORD` (cần để mở `/leads`).
- **Meta App:** "Novaon Chatbot", **App ID `37150034544642460`** (Business, use case "Tương tác với khách hàng trên Messenger"). Đang **Development mode**.
- **Fanpage test:** **Nobo Ai** — Page ID `1220791817792373` (profile URL `facebook.com/profile.php?id=61592078012566`). Webhook subscribe: `messages`, `messaging_postbacks`.
- Token đưa vào Railway do **Lộc dán tay** (credential — Claude không nhập/đọc token).

## Việc còn treo

- **Key OpenRouter:** dùng lại key Future Content hay cấp riêng? (Phase 1 cần → set `OPENROUTER_API_KEY` trên Railway.)
- **APP_SECRET:** set sau để bật verify chữ ký webhook (hardening).
- **Railway Postgres:** cần gắn DB vào service để có `DATABASE_URL`, rồi deploy lại.
- **Dashboard leads:** cần set `DASHBOARD_PASSWORD` (và tuỳ chọn `DASHBOARD_USER`, mặc định `novaon`) trước khi mở `/leads`.
- **Campaign Builder:** `/studio` dùng cùng `DASHBOARD_PASSWORD`; `/studio/demo` và `/chat/song-hong-demo` xem được UI/test web channel nhanh.
- **Campaign DB:** bảng `campaigns` tự tạo khi có `DATABASE_URL`. Chưa có DB thì chỉ dùng fallback RAM, không bền sau redeploy.
- **LLM cost strategy:** code default mới là `CHEAP_LLM_MODEL=anthropic/claude-haiku-4.5`, `PREMIUM_LLM_MODEL=anthropic/claude-sonnet-4.6`, `LLM_MAX_TOKENS=350`. Web chat test được `?model=haiku|sonnet|auto`. Biến `LLM_MODEL` cũ nếu còn trên Railway chỉ được dùng làm premium fallback, không còn ép default route sang Sonnet.
- **Go-live:** Meta App Review xin `pages_messaging` + verify business (khi bán cho Client thật).

## Ghi chú kỹ thuật

- Webhook phải trả `200` nhanh, xử lý sự kiện bất đồng bộ (Meta retry nếu chậm).
- Verify chữ ký `X-Hub-Signature-256` bằng `APP_SECRET` (đã có, bỏ qua nếu chưa đặt secret).
- Development mode: chỉ tài khoản có vai trò trong App (admin/dev/tester) mới nhắn thử được.
- **Whitelist / Dev mode (làm rõ 2026-07-20):** *human trả lời* (từ hộp thư Trang) nhắn được **bất kỳ ai, luôn luôn** — không bị Dev mode giới hạn. Nhưng *bot trả lời* (qua Send API) chỉ tới được người có **vai trò app** (Admin/Dev/**Tester**). Human chat lại KHÔNG whitelist người đó cho bot. Muốn 1 người cụ thể chat được với bot ngay → **add làm Tester** (App Roles). Muốn mọi khách lạ → **App Review + Live**. (Khi Live còn luật cửa sổ 24h cho bot nhắn chủ động.)
- **Gửi ảnh:** Facebook Send API KHÔNG fetch được ảnh từ `placehold.co` (lỗi #100 subcode 2018007 "không tải lên được"). → **PHẢI tự host ảnh** trên domain backend (`/assets/products/*.png`, phục vụ qua `express.static('public')`). Facebook fetch domain Railway của mình OK (cùng chỗ webhook). Ảnh placeholder sinh bằng `scripts/gen-placeholders.mjs`.
- **LLM quyết gửi ảnh** bằng cách chèn dòng `##IMG: <id>` ở cuối (llm.js parse + gỡ khỏi text). Đơn giản, chưa cần tool-calling.
- **LLM ghi nhận lead** bằng cách chèn dòng `##LEAD: {"customerName":"...","phone":"...","productInterest":"...","note":"..."}` ở cuối khi đã có SĐT. Backend parse + gỡ khỏi text + lưu bảng `leads`; nếu chưa có `DATABASE_URL` thì chỉ log.
- **Campaign model:** campaign chứa persona, rules, knowledge, products, page_ids, active. Core LLM dùng campaign; Messenger/Web Chat chỉ là adapter.
- **Giá/ảnh sản phẩm:** catalog hiện có `variants`, `priceNote`, `sourceUrl`, `images`. Bot được phép báo giá tham khảo trong catalog nhưng không cam kết khuyến mại/chốt giá thay Sale.
- **Import Center:** MVP nhận text/URL, chưa upload file nhị phân. Dữ liệu giá/sản phẩm extract phải qua human review trước khi publish.
- Persona/luật/catalog nằm trong `src/knowledge.js` (Kiểu A). Luật cấm markdown (Messenger hiện `*` thô).
