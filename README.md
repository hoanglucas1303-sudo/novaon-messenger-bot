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
- `GET /webhook` — Meta gọi để xác minh (dùng `VERIFY_TOKEN`)
- `POST /webhook` — nhận sự kiện tin nhắn
- `GET /leads` — mini dashboard xem lead, cần `DASHBOARD_PASSWORD`
- `GET /leads/demo` — dashboard demo bằng dữ liệu mẫu, không hiển thị lead thật
- `GET /studio` — Campaign Builder thật, cần `DASHBOARD_PASSWORD`
- `GET /studio/demo` — xem GUI Campaign Builder bằng campaign mẫu
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
2. Đặt `DASHBOARD_USER` và `DASHBOARD_PASSWORD`.
3. Deploy lại service. App sẽ tự tạo bảng `leads` nếu chưa có.
4. Mở `/leads` và đăng nhập bằng Basic Auth.

Test nhanh trên Messenger: nhắn nhu cầu mua và để lại SĐT, ví dụ “Mình quan tâm đệm bông ép 1m6, gọi mình số 09xxxxxxxx”. Nếu AI phát lead đúng, dashboard sẽ có bản ghi mới.

Xem thử UI khi chưa cấu hình DB/password: mở `/leads/demo`. Đây chỉ là dữ liệu mẫu đã che SĐT, không phải lead thật.

## Campaign Builder + Web Chat

Campaign là "brain" dùng chung cho nhiều channel. Messenger chỉ là adapter đầu tiên; web chat/LDP dùng cùng persona, luật, tài liệu và catalog.

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
- `/studio` — tạo/sửa campaign thật, cần `DASHBOARD_PASSWORD`
- `/chat/song-hong-demo` — web chat test campaign Sông Hồng
- `/chat/song-hong-demo?model=haiku` — ép dùng model rẻ để test chất lượng
- `/chat/song-hong-demo?model=sonnet` — ép dùng Sonnet để so sánh
- `/chat/song-hong-demo?model=auto` — tự chọn Haiku/Sonnet theo độ khó câu hỏi

Khi có Postgres, campaign được lưu vào bảng `campaigns`. Nếu chưa có `DATABASE_URL`, app dùng campaign Sông Hồng trong bộ nhớ để vẫn test được web chat; dữ liệu tạo mới không bền sau redeploy.

## LLM Cost Strategy

Mặc định chatbot dùng `LLM_MODEL=anthropic/claude-haiku-4.5` để giảm chi phí cho các câu hỏi tư vấn thông thường. `PREMIUM_LLM_MODEL=anthropic/claude-sonnet-4.6` được giữ làm model premium cho câu hỏi dài/phức tạp hoặc khi web chat được ép `?model=sonnet`.

Chế độ `auto` sẽ dùng Sonnet khi tin nhắn có tín hiệu cần suy luận kỹ, ví dụ so sánh nhiều sản phẩm, hỏi nên chọn loại nào, đau lưng, người già/trẻ em, hoặc tin nhắn rất dài. Các câu hỏi giá, ảnh, size và xin lead thông thường chạy bằng Haiku.

## Product Catalog Test Data

Campaign Sông Hồng demo hiện có catalog giàu hơn để test hỏi giá/ảnh:

- Biến thể giá tham khảo cho đệm bông ép, siêu nảy Fiber, Back Essential và một số bộ chăn ga gối.
- Ảnh sản phẩm public từ các website bán hàng/đại lý, đi qua proxy `/assets/remote-image` trên backend để Messenger/web chat nhận ảnh từ domain Railway.
- Rule bot chỉ nói giá là tham khảo theo catalog, không cam kết khuyến mại còn hiệu lực và vẫn xin thông tin để Sale xác nhận khi khách muốn mua.

Các nguồn giá/ảnh hiện đang dùng gồm `demxanh.com`, `songhonghanoi.vn` và `songhongonline.vn`. Dữ liệu này phục vụ test flow, chưa phải nguồn giá chính thức để bán thật.
