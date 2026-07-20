import { config } from './config.js';

const SEND_API = () =>
  `https://graph.facebook.com/${config.graphApiVersion}/me/messages?access_token=${config.pageAccessToken}`;

/**
 * Gọi Send API của Messenger.
 * @param {object} messagePayload - phần "message" hoặc "sender_action" của request
 */
async function callSendAPI(recipientId, body) {
  if (!config.pageAccessToken) {
    console.error('[messenger] Không thể gửi: thiếu PAGE_ACCESS_TOKEN');
    return;
  }
  const res = await fetch(SEND_API(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: recipientId }, ...body }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`[messenger] Send API lỗi ${res.status}:`, err);
  }
  return res;
}

/** Gửi tin nhắn văn bản */
export function sendText(recipientId, text) {
  return callSendAPI(recipientId, { message: { text } });
}

/** Gửi 1 ảnh theo URL public (dùng ở Phase 2) */
export function sendImage(recipientId, imageUrl) {
  return callSendAPI(recipientId, {
    message: {
      attachment: { type: 'image', payload: { url: imageUrl, is_reusable: true } },
    },
  });
}

/** Gửi nhiều ảnh lần lượt (dùng ở Phase 2) */
export async function sendImages(recipientId, imageUrls = []) {
  for (const url of imageUrls) {
    await sendImage(recipientId, url);
  }
}

/** Hiển thị trạng thái "đang soạn tin..." cho UX tự nhiên hơn */
export function sendTypingOn(recipientId) {
  return callSendAPI(recipientId, { sender_action: 'typing_on' });
}
