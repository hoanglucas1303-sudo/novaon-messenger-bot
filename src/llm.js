import { config } from './config.js';
import { brand, products } from './knowledge.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Ghép catalog thành text gọn cho system prompt
function renderCatalog() {
  return products
    .map((p, i) => {
      const hasImg = p.images?.length ? ` — có ${p.images.length} ảnh` : ' — chưa có ảnh';
      const lines = [
        `${i + 1}. ${p.name}${p.line ? ` (${p.line})` : ''} [mã: ${p.id}${hasImg}]`,
        `   - Mô tả: ${p.description}`,
      ];
      if (p.features?.length) lines.push(`   - Điểm nổi bật: ${p.features.join(', ')}`);
      if (p.sizes?.length) lines.push(`   - Kích thước: ${p.sizes.join(', ')}`);
      if (p.thickness?.length) lines.push(`   - Độ dày: ${p.thickness.join(', ')}`);
      if (p.price) lines.push(`   - Giá: ${p.price}`);
      return lines.join('\n');
    })
    .join('\n\n');
}

// Dựng system prompt từ persona + luật + catalog (Kiểu A)
function buildSystemPrompt() {
  const rules = brand.rules.map((r, i) => `${i + 1}. ${r}`).join('\n');
  return `${brand.persona}

# LUẬT TRẢ LỜI (bắt buộc tuân thủ)
${rules}

# DANH MỤC SẢN PHẨM (chỉ được dùng thông tin trong đây, không bịa thêm)
${renderCatalog()}

# GỬI ẢNH CHO KHÁCH
Khi khách muốn XEM ẢNH một sản phẩm (ví dụ "cho xem ảnh", "mẫu nào đẹp", "hình thực tế"...),
hãy trả lời bình thường, rồi THÊM một dòng RIÊNG ở CUỐI theo đúng cú pháp:
##IMG: <mã>
Ví dụ khách muốn xem đệm bông ép → thêm dòng cuối: ##IMG: bong-ep
Có thể gửi ảnh nhiều sản phẩm: ##IMG: bong-ep, back-essential
CHỈ thêm dòng này khi khách thật sự muốn xem ảnh, và chỉ dùng mã có trong danh mục.
KHÔNG nhắc tới "##IMG" hay việc gửi ảnh bằng cú pháp trong lời thoại với khách.`;
}

// Tách dấu ##IMG khỏi câu trả lời, tra ra URL ảnh của sản phẩm tương ứng
const IMG_MARKER = /##IMG:\s*([a-z0-9\-,\s]+)/i;
function extractImages(reply) {
  const m = reply.match(IMG_MARKER);
  const text = reply.replace(IMG_MARKER, '').trim();
  if (!m) return { text, images: [] };

  const ids = m[1]
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const images = [];
  for (const id of ids) {
    const p = products.find((x) => x.id === id);
    if (p?.images?.length) images.push(...p.images);
  }
  return { text, images };
}

// Bộ nhớ hội thoại ngắn hạn trong RAM (reset khi redeploy) — đủ cho MVP
const histories = new Map();
const MAX_TURNS = 8; // giữ tối đa 8 lượt (4 cặp hỏi–đáp)

function getHistory(senderId) {
  if (!histories.has(senderId)) histories.set(senderId, []);
  return histories.get(senderId);
}

/**
 * Sinh câu trả lời cho 1 tin nhắn của khách.
 * @returns {Promise<{text: string, images: string[]}>}
 */
export async function generateReply(senderId, userText) {
  if (!config.openrouterApiKey) {
    console.warn('[llm] Thiếu OPENROUTER_API_KEY — trả lời tạm.');
    return { text: brand.fallback, images: [] };
  }

  const history = getHistory(senderId);
  history.push({ role: 'user', content: userText });

  const messages = [{ role: 'system', content: buildSystemPrompt() }, ...history];

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.openrouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.llmModel,
        messages,
        temperature: 0.6,
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[llm] OpenRouter lỗi ${res.status}:`, err);
      history.pop(); // gỡ tin user vừa thêm để không kẹt lịch sử
      return { text: brand.fallback, images: [] };
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      history.pop();
      return { text: brand.fallback, images: [] };
    }

    const { text, images } = extractImages(raw);
    // Lưu lịch sử bản đã gỡ dấu ##IMG cho sạch
    const cleanText = text || 'Dạ em gửi anh/chị xem ảnh ạ 😊';
    history.push({ role: 'assistant', content: cleanText });
    if (history.length > MAX_TURNS) history.splice(0, history.length - MAX_TURNS);

    return { text: cleanText, images };
  } catch (e) {
    console.error('[llm] Lỗi gọi OpenRouter:', e);
    history.pop();
    return { text: brand.fallback, images: [] };
  }
}
