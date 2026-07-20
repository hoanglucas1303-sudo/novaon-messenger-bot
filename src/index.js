import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, warnMissingConfig } from './config.js';
import { createLead, initDatabase } from './db.js';
import { findCampaignByPageId, initCampaignStore } from './campaigns.js';
import { mountDashboard } from './dashboard.js';
import { mountStudio } from './studio.js';
import { mountImportCenter } from './import-center.js';
import { mountMediaRoutes } from './media.js';
import { sendText, sendImages, sendTypingOn } from './messenger.js';
import { generateReply } from './llm.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Giữ lại raw body để verify chữ ký X-Hub-Signature-256 của Meta
app.use(
  express.json({
    limit: '2mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false, limit: '2mb' }));

// Phục vụ ảnh sản phẩm tự host: public/products/*.jpg -> /assets/products/*.jpg
// (Production: Client upload ảnh vào đây; hiện Phase 2 test dùng ảnh placeholder trong knowledge.js)
mountMediaRoutes(app);
app.use('/assets', express.static(path.join(__dirname, '..', 'public')));

// Health check (Railway + kiểm tra nhanh bằng trình duyệt)
app.get('/', (_req, res) => {
  res.send('Novaon Bot Platform ✅ Webhook: /webhook · Leads: /leads · Studio: /studio · Web test: /chat/song-hong-demo');
});

mountDashboard(app);
mountStudio(app);
mountImportCenter(app);

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

  // Phase 1+2: trả lời bằng AI (persona + luật + knowledge) và gửi ảnh khi cần.
  if (event.message?.text) {
    const text = event.message.text;
    const pageId = event.recipient?.id;
    const campaign = await findCampaignByPageId(pageId);
    console.log(`[msg] ${senderId}: ${text}`);
    await sendTypingOn(senderId);
    const { text: reply, images, lead, conversation, modelTier } = await generateReply(senderId, text, {
      campaign,
      conversationKey: `messenger:${campaign.slug}:${senderId}`,
      modelMode: 'auto',
    });
    await sendText(senderId, reply);
    if (images.length) await sendImages(senderId, images);
    if (lead) {
      const savedLead = await createLead({
        campaignId: campaign.slug,
        pageId,
        senderId,
        channel: 'messenger',
        lead,
        conversation,
      });
      if (savedLead) console.log(`[lead] Đã lưu lead #${savedLead.id} từ ${senderId}`);
    }
    console.log(
      `[bot] ${senderId}: ${reply}${images.length ? ` (+${images.length} ảnh)` : ''}${lead ? ' (+lead)' : ''}${modelTier ? ` (${modelTier})` : ''}`
    );
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

try {
  await initDatabase();
  await initCampaignStore();
} catch (e) {
  console.error('[boot] Không khởi tạo được DB/campaign store:', e);
}

export const server = app.listen(config.port, () => {
  warnMissingConfig();
  console.log(`[server] Novaon Messenger Bot chạy tại cổng ${config.port}`);
});

export { app };
