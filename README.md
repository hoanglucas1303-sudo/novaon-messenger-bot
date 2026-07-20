# Novaon Messenger Bot

Nền tảng chatbot AI trên Facebook Messenger cho các Client của Novaon.
Xem [`context.md`](./context.md) để nắm đề bài, quyết định và lộ trình.

## Chạy local

```bash
npm install
cp .env.example .env   # điền PAGE_ACCESS_TOKEN sau khi có từ Meta
npm run dev            # cổng 3010
```

- `GET /` — health check
- `GET /dashboard` — unified dashboard thật: dự án, chat demo, knowledge, import, leads; mở mặc định cho sample
- `GET /dashboard/demo` — unified dashboard demo, không dùng lead thật
- `GET /webhook` — Meta gọi để xác minh (dùng `VERIFY_TOKEN`)
- `POST /webhook` — nhận sự kiện tin nhắn
- `GET /leads` — mini dashboard xem lead; cần `DATABASE_URL` để có dữ liệu thật
- `GET /leads/demo` — dashboard demo bằng dữ liệu mẫu, không hiển thị lead thật
- `GET /studio` — Campaign Builder thật, mở mặc định cho sample
- `GET /studio/demo` — xem GUI Campaign Builder bằng campaign mẫu
- `GET /studio/import` — Import Center thật: convert text/URL tài liệu thành draft data, mở mặc định cho sample
- `GET /studio/import/demo` — demo luồng import tài liệu → draft catalog/knowledge/rules
- `GET /chat/:campaignSlug` — web chat test full flow, ví dụ `/chat/song-hong-demo`
- `POST /api/chat` — API chat cho website/LDP

## Nối Facebook Messenger (Phase 0)

> Cần **URL https công khai** cho webhook → deploy Railway trước (localhost không nhận được).

1. **Deploy Railway** project này → được URL dạng `https://xxx.up.railway.app`.
2. **developers.facebook.com** → *Create App* → loại **Business** → thêm sản phẩm **Messenger**.
3. Trong Messenger settings → **Add/Connect a Page** → chọn Fanpage test → **Generate token** → copy vào biến `PAGE_ACCESS_TOKEN` (đặt trên Railway).
4. Lấy **App Secret** (App Settings → Basic) → đặt `APP_SECRET` trên Railway.
5. **Configure Webhooks:**
   - Callback URL: `https://xxx.up.railway.app/webhook`
   - Verify Token: đúng giá trị `VERIFY_TOKEN` trong env
   - Subscribe fields: **messages**, **messaging_postbacks**
6. **Subscribe Fanpage** vào webhook (nút Add Subscriptions ở mục Page).
7. Nhắn thử vào Fanpage bằng tài khoản admin/tester → bot echo lại.

> **Development mode:** chỉ tài khoản có vai trò trong App (admin/dev/tester) mới nhắn thử được.
> Khi go-live cho Client thật → nộp **App Review** xin quyền `pages_messaging`.

## Lead capture v1

Bot dùng cùng pattern với gửi ảnh: LLM chèn dòng nội bộ `##LEAD:{...}`, backend gỡ dòng này khỏi tin nhắn gửi khách và lưu vào Postgres.

Field lead hiện có:

- `customer_name`
- `phone`
- `product_interest`
- `note`
- `status` (`new` / `contacted`)
- `conversation` (ngữ cảnh hội thoại gần nhất)

Triển khai trên Railway:

1. Gắn Railway Postgres vào service để có `DATABASE_URL`.
2. Nếu đã có dữ liệu khách thật, đặt `DASHBOARD_LOCKED=true`, `DASHBOARD_USER` và `DASHBOARD_PASSWORD`.
3. Deploy lại service. App sẽ tự tạo bảng `leads` nếu chưa có.
4. Mở `/leads`; nếu đã bật khóa thì đăng nhập bằng Basic Auth.

Test nhanh trên Messenger: nhắn nhu cầu mua và để lại SĐT, ví dụ “Mình quan tâm đệm bông ép 1m6, gọi mình số 09xxxxxxxx”. Nếu AI phát lead đúng, dashboard sẽ có bản ghi mới.

Xem thử UI khi chưa cấu hình DB: mở `/leads/demo`. Đây chỉ là dữ liệu mẫu đã che SĐT, không phải lead thật.

## Campaign Builder + Web Chat

Campaign là "brain" dùng chung cho nhiều channel. Messenger chỉ là adapter đầu tiên; web chat/LDP dùng cùng persona, luật, tài liệu và catalog.

Dashboard chính để vận hành hằng ngày là `/dashboard`. Các route `/studio`, `/studio/import`, `/leads` vẫn tồn tại như màn chuyên sâu, nhưng đều được nối từ dashboard.

Mỗi campaign có:

- Tên, slug public và brand/client
- Page ID Messenger để backend map webhook vào đúng campaign
- Persona chatbot
- Luật trả lời
- Tài liệu/hướng dẫn thêm
- Catalog sản phẩm JSON, gồm cả URL ảnh
- Trạng thái active/inactive

Route chính:

- `/studio/demo` — xem Campaign Builder ngay, không lưu thay đổi
- `/studio` — tạo/sửa campaign thật, mở mặc định cho sample; khóa bằng `DASHBOARD_LOCKED=true`
- `/chat/song-hong-demo` — web chat test campaign Sông Hồng
- `/chat/song-hong-demo?model=haiku` — ép dùng model rẻ để test chất lượng
- `/chat/song-hong-demo?model=sonnet` — ép dùng Sonnet để so sánh
- `/chat/song-hong-demo?model=auto` — tự chọn Haiku/Sonnet theo độ khó câu hỏi

Khi có Postgres, campaign được lưu vào bảng `campaigns`. Nếu chưa có `DATABASE_URL`, app dùng campaign Sông Hồng trong bộ nhớ để vẫn test được web chat; dữ liệu tạo mới không bền sau redeploy.

## LLM Cost Strategy

Mặc định chatbot dùng `CHEAP_LLM_MODEL=anthropic/claude-haiku-4.5` để giảm chi phí cho các câu hỏi tư vấn thông thường. `PREMIUM_LLM_MODEL=anthropic/claude-sonnet-4.6` được giữ làm model premium cho câu hỏi dài/phức tạp hoặc khi web chat được ép `?model=sonnet`.

Chế độ `auto` sẽ dùng Sonnet khi tin nhắn có tín hiệu cần suy luận kỹ, ví dụ so sánh nhiều sản phẩm, hỏi nên chọn loại nào, đau lưng, người già/trẻ em, hoặc tin nhắn rất dài. Các câu hỏi giá, ảnh, size và xin lead thông thường chạy bằng Haiku.

## Product Catalog Test Data

Campaign Sông Hồng demo hiện có catalog giàu hơn để test hỏi giá/ảnh:

- Biến thể giá tham khảo cho đệm bông ép, siêu nảy Fiber, Back Essential và một số bộ chăn ga gối.
- Ảnh sản phẩm public từ các website bán hàng/đại lý, đi qua proxy `/assets/remote-image` trên backend để Messenger/web chat nhận ảnh từ domain Railway.
- Rule bot chỉ nói giá là tham khảo theo catalog, không cam kết khuyến mại còn hiệu lực và vẫn xin thông tin để Sale xác nhận khi khách muốn mua.

Các nguồn giá/ảnh hiện đang dùng gồm `demxanh.com`, `songhonghanoi.vn` và `songhongonline.vn`. Dữ liệu này phục vụ test flow, chưa phải nguồn giá chính thức để bán thật.

## Seed Data Cho Test Case Lớn

Đã có bộ tài liệu seed Sông Hồng tại `/seed/song-hong-large-test/overview.html`, README tại `/seed/song-hong-large-test/README.md`, và trong repo ở `public/seed/song-hong-large-test/`.

Bộ seed gồm:

- Project brief để tạo campaign mới.
- Catalog ban đầu có sản phẩm, giá theo size/độ dày và ảnh.
- FAQ/chính sách để test knowledge mềm.
- Sales playbook để test gợi ý có chủ đích và lead qualification.
- File update giá + thêm sản phẩm mới để test luồng cập nhật knowledge.
- Test prompts để kiểm tra web chat/Messenger.

Mở `/studio/import`, dùng panel “Seed tài liệu test” để điền nhanh URL import. Quy trình đề xuất: import `Catalog + giá + ảnh` trước, sau đó `FAQ + chính sách`, `Sales playbook`, cuối cùng import `Update giá + sản phẩm mới` để test cập nhật.

## Import Center

Import Center là lớp trung gian giữa tài liệu client và chatbot. MVP hiện hỗ trợ:

- Paste text catalogue, bảng giá, FAQ, policy hoặc script tư vấn.
- Nhập URL website để backend fetch nội dung text.
- AI extract thành draft `products`, `knowledge`, `rules`, `recommendationRules`.
- PM review/sửa JSON rồi publish vào campaign.
- Nếu thiếu OpenRouter key, hệ thống có heuristic fallback để demo luồng.

Route demo: `/studio/import/demo`.

Route thật: `/studio/import`, mở mặc định cho sample; khi có dữ liệu khách thật thì bật `DASHBOARD_LOCKED=true` + `DASHBOARD_PASSWORD`. Lưu ý: draft hiện lưu trong RAM, nên dùng thật bền vững cần `DATABASE_URL` và bước tiếp theo là lưu import drafts vào Postgres + upload PDF/Excel.
