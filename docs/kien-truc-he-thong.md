# Mô hình chatbot Messenger — Cần xây những gì?

> Trả lời câu hỏi: "Một hệ thống chatbot + Meta App + đấu nối/cấp quyền Fanpage — mình phải xây gì?"
> Đúng, gồm **3 mảng lớn** (A, B, C) + **1 mảng vận hành** (D). Dưới đây là bức tranh đầy đủ, kèm **cái đã có vs còn phải xây**.

---

## Sơ đồ luồng (nhìn 1 phát hiểu)

```
                          (C) ĐẤU NỐI + CẤP QUYỀN
Khách hàng cuối                    │  Page Access Token
   │ nhắn tin                      ▼
   ▼                        ┌──────────────┐
Fanpage Client ──────►  (B) │   Meta App   │ ──► webhook event
                            └──────────────┘         │
                                                     ▼
                        ┌─────────────────────────────────────────┐
                        │      (A) HỆ THỐNG CHATBOT (server Novaon) │
                        │  webhook → map campaign theo Page ID      │
                        │        → "não" LLM (persona+luật+catalog) │
                        │        → trả text/ảnh  → Send API         │
                        │        → bắt & lưu Lead → DB              │
                        └─────────────────────────────────────────┘
                                   │                    │
                                   ▼                    ▼
                          Khách nhận trả lời      (D) Dashboard: Sale xem lead,
                                                   PM sửa knowledge, go-live
```

Một câu: **Khách nhắn → Fanpage → Meta App → backend Novaon (não AI) → trả lời + ghi lead → Dashboard cho người thật.**

---

## (A) HỆ THỐNG CHATBOT — phần Novaon tự xây (chiếm ~80% công sức)

Đây là "sản phẩm" thật. Các thành phần:

| # | Thành phần | Vai trò | Trạng thái |
|---|-----------|---------|-----------|
| A1 | **Backend server** (Node/Express, Railway) | Nơi chạy mọi thứ | ✅ có |
| A2 | **Webhook** (verify + nhận sự kiện) | Cửa nhận tin từ Meta | ✅ có |
| A3 | **Send layer** (Messenger Send API) | Gửi text / 1 hoặc nhiều ảnh / typing | ✅ có |
| A4 | **Não LLM** | Ghép persona+luật+catalog → gọi LLM → parse dấu `##IMG`/`##LEAD` | ✅ có |
| A5 | **Kho knowledge / Campaign** | persona, luật, catalog, tài liệu theo từng brand/campaign | ✅ có (bảng `campaigns`) |
| A6 | **Tự host ảnh** | Ảnh sản phẩm có URL public để Meta fetch được | ✅ có (`/assets` + media proxy) |
| A7 | **Lead capture + DB** | Bắt SĐT/nhu cầu → lưu bảng `leads` | ✅ có |
| A8 | **Dashboard quản trị** | Sale xem lead; PM sửa campaign; import tài liệu; test chat | ✅ có (dashboard/studio/import) |
| A9 | **Import Center** | Tài liệu client (text/URL) → draft catalog/knowledge/luật | ✅ có (MVP) |
| A10 | **Web chat adapter** | Dùng lại "não" cho web/LDP, không chỉ Messenger | ✅ có (`/chat/:slug`, `/api/chat`) |
| A11 | **Chiến lược chi phí LLM** | Câu thường dùng model rẻ (Haiku), câu khó dùng Sonnet | ✅ có |
| A12 | **Multi-tenant** (mỗi Client 1 không gian + token riêng) | Cô lập data + token từng Client | ⚠️ một phần (map theo Page ID); **quản lý token nhiều Client = còn xây** |
| A13 | **RAG** (kho lớn → tìm ngữ nghĩa) | Khi catalog/tài liệu quá lớn | ❌ chưa (Phase 3) |
| A14 | **Handover** (người thật chiếm quyền, bot lùi) | Điểm chạm cần con người | ❌ chưa (ver sau) |

**Bản đồ code hiện tại** (`src/`): `index.js` (webhook+orchestrate) · `messenger.js` (Send API) · `llm.js` (não) · `knowledge.js` (sample brain) · `campaigns.js` (campaign store) · `db.js` (Postgres) · `dashboard.js` + `unified-dashboard.js` + `studio.js` + `import-center.js` (quản trị) · `media.js` (ảnh) · `auth.js` (khóa dashboard) · `config.js` (env).

---

## (B) META APP — "hộ chiếu" để nói chuyện với Messenger

Không phải code, là **đăng ký + cấu hình** trên developers.facebook.com. Cần:

| # | Việc | Trạng thái |
|---|------|-----------|
| B1 | Tạo App (loại Business) + thêm sản phẩm **Messenger** | ✅ đã tạo ("Novaon Chatbot", App ID 37150034544642460) |
| B2 | Cấu hình **Webhook** (Callback URL + Verify Token + subscribe `messages`, `messaging_postbacks`) | ✅ có |
| B3 | **App Secret** (verify chữ ký webhook) | ⚠️ chưa set (hardening) |
| B4 | **App Roles** (Admin/Developer/Tester) cho giai đoạn Dev | ✅ dùng được |
| B5 | Quyền **`pages_messaging`** (Advanced Access) | ❌ cần App Review |
| B6 | **Privacy Policy URL** + icon + category | ❌ cần chuẩn bị |
| B7 | **Business Verification** + **App Review** → chuyển **Live** | ❌ khi go-live |
| B8 | **Tech Provider** (app phục vụ nhiều page của nhiều Client) | ❌ khi mở rộng nhiều Client |

> Chi tiết quy trình duyệt: xem [`quy-trinh-xet-duyet-meta.md`](./quy-trinh-xet-duyet-meta.md).

---

## (C) ĐẤU NỐI + CẤP QUYỀN FANPAGE — làm cho **mỗi Client**

Đây là bước lặp lại cho từng Fanpage/Client mới:

| # | Việc | Ghi chú |
|---|------|---------|
| C1 | Chủ page **cấp quyền** cho App (OAuth "Kết nối trang") | Chủ Fanpage tự bấm đồng ý |
| C2 | Sinh **Page Access Token** (riêng từng page) | Là "chìa khóa" để backend gửi tin thay page đó |
| C3 | **Subscribe page** vào webhook của App | Để tin của page chảy về backend |
| C4 | **Lưu token an toàn** theo tenant | Hiện: 1 token trong env (1 page). **Nhiều Client → cần bảng lưu token/tenant = còn xây (A12)** |
| C5 | Map **Page ID → Campaign** | Để backend biết tin này thuộc brain của Client nào |

> Hiện đã làm xong cho **1 page test (Nobo Ai)**. Để phục vụ nhiều Client thật, cần nâng phần **lưu & quản lý token nhiều page** (A12) thay vì 1 token cứng trong env.

---

## (D) VẬN HÀNH & GO-LIVE

| # | Việc | Trạng thái |
|---|------|-----------|
| D1 | Trang **Privacy Policy** (bắt buộc để review) | ❌ cần dựng |
| D2 | **Video demo** + mô tả use case cho App Review | ❌ khi nộp |
| D3 | **Business Verification** | ❌ khi go-live |
| D4 | Bảo mật: App Secret, khóa dashboard (Basic Auth), che SĐT | ⚠️ một phần |
| D5 | Theo dõi log / lỗi Send API / chi phí LLM | ⚠️ cơ bản (log Railway) |
| D6 | Tuân thủ luật **cửa sổ 24h** khi Live | ❌ khi Live |

---

## Tóm tắt: ĐÃ CÓ vs CÒN XÂY

**Đã có (chạy thật ở Dev mode):** toàn bộ mảng (A) cho 1 Client — bot tư vấn AI, gửi ảnh, bắt lead, dashboard, campaign builder, import, web chat, cost routing. Mảng (B) + (C) xong cho 1 page test.

**Còn phải xây để bán thật cho nhiều Client:**
1. **Multi-tenant token management** (A12/C4) — lưu & dùng token riêng từng Fanpage, không hardcode 1 token.
2. **Go-live Meta** (B5–B7, D1–D3) — Privacy Policy + Business Verification + App Review → Live.
3. **RAG** (A13) — khi kho tài liệu lớn.
4. **Handover** (A14) — người thật chiếm quyền khi cần.
5. **Bền hóa** — lưu import drafts vào DB, upload PDF/Excel, hardening bảo mật.

> Nói ngắn: **"bộ não + kênh Messenger" đã xong cho 1 Client; việc còn lại chủ yếu là (1) nhân bản cho nhiều Client (token/tenant) và (2) qua cửa duyệt Meta để mở cho khách lạ.**
