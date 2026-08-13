import { config } from './config.js';

const sendApiUrl = (accessToken) =>
  `https://graph.facebook.com/${config.graphApiVersion}/me/messages?access_token=${accessToken}`;

/**
 * Gọi Send API của Messenger.
 * @param {string} recipientId - PSID người nhận
 * @param {object} body - phần "message" hoặc "sender_action" của request
 * @param {string} [accessToken] - Page Access Token riêng của Trang (multi-tenant).
 *   Bỏ trống thì dùng PAGE_ACCESS_TOKEN trong env (Trang test cũ, single-tenant).
 */
async function callSendAPI(recipientId, body, accessToken) {
  const token = accessToken || config.pageAccessToken;
  if (!token) {
    console.error('[messenger] Không thể gửi: thiếu Page Access Token (env hoặc page_connections)');
    return;
  }
  const res = await fetch(sendApiUrl(token), {
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
export function sendText(recipientId, text, accessToken) {
  return callSendAPI(recipientId, { message: { text } }, accessToken);
}

/** Gửi 1 ảnh theo URL public (dùng ở Phase 2) */
export function sendImage(recipientId, imageUrl, accessToken) {
  return callSendAPI(
    recipientId,
    { message: { attachment: { type: 'image', payload: { url: imageUrl, is_reusable: true } } } },
    accessToken
  );
}

/** Gửi nhiều ảnh lần lượt (dùng ở Phase 2) */
export async function sendImages(recipientId, imageUrls = [], accessToken) {
  for (const url of imageUrls) {
    await sendImage(recipientId, url, accessToken);
  }
}

/** Hiển thị trạng thái "đang soạn tin..." cho UX tự nhiên hơn */
export function sendTypingOn(recipientId, accessToken) {
  return callSendAPI(recipientId, { sender_action: 'typing_on' }, accessToken);
}
