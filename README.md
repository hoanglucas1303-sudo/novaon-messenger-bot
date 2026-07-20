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
