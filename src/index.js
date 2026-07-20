import express from 'express';
import crypto from 'node:crypto';
import { config, warnMissingConfig } from './config.js';
import { sendText, sendTypingOn } from './messenger.js';
import { generateReply } from './llm.js';

const app = express();

// Giữ lại raw body để verify chữ ký X-Hub-Signature-256 của Meta
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Health check (Railway + kiểm tra nhanh bằng trình duyệt)
app.get('/', (_req, res) => {
  res.send('Novaon Messenger Bot ✅ (Phase 0 — echo). Webhook tại /webhook');
});

// --- Xác minh webhook (Meta gọi 1 lần khi cấu hình) ---
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.verifyToken) {
    console.log('[webhook] Xác minh thành công ✅');
    return res.status(200).send(challenge);
  }
  console.warn('[webhook] Xác minh thất bại — sai verify_token');
  return res.sendStatus(403);
});

// --- Nhận sự kiện tin nhắn ---
app.post('/webhook', (req, res) => {
  // Kiểm tra chữ ký nếu đã cấu hình APP_SECRET
  if (config.appSecret && !verifySignature(req)) {
    console.warn('[webhook] Chữ ký không hợp lệ — bỏ qua');
    return res.sendStatus(403);
  }

  const body = req.body;
  if (body.object !== 'page') return res.sendStatus(404);

  // Trả 200 ngay để Meta không retry, xử lý bất đồng bộ sau
  res.status(200).send('EVENT_RECEIVED');

  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {
      handleEvent(event).catch((e) => console.error('[handleEvent]', e));
    }
  }
});

async function handleEvent(event) {
  const senderId = event.sender?.id;
  if (!senderId) return;

  // Phase 1: trả lời bằng AI (persona + luật + knowledge trong knowledge.js).
  if (event.message?.text) {
    const text = event.message.text;
    console.log(`[msg] ${senderId}: ${text}`);
    await sendTypingOn(senderId);
    const reply = await generateReply(senderId, text);
    await sendText(senderId, reply);
    console.log(`[bot] ${senderId}: ${reply}`);
  } else if (event.message?.attachments) {
    await sendText(senderId, 'Mình đã nhận được tệp đính kèm của bạn 👍');
  } else if (event.postback) {
    await sendText(senderId, `Bạn vừa bấm: ${event.postback.title || event.postback.payload}`);
  }
}

function verifySignature(req) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature || !req.rawBody) return false;
  const expected =
    'sha256=' +
    crypto.createHmac('sha256', config.appSecret).update(req.rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

app.listen(config.port, () => {
  warnMissingConfig();
  console.log(`[server] Novaon Messenger Bot chạy tại cổng ${config.port}`);
});
