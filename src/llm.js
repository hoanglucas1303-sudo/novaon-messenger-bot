import { config } from './config.js';
import { brand, products } from './knowledge.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Ghép catalog thành text gọn cho system prompt
function renderCatalog() {
  return products
    .map((p, i) => {
      const lines = [
        `${i + 1}. ${p.name}${p.line ? ` (${p.line})` : ''}`,
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
${renderCatalog()}`;
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
 * @returns {Promise<string>} nội dung trả lời (đã có fallback nếu lỗi)
 */
export async function generateReply(senderId, userText) {
  if (!config.openrouterApiKey) {
    console.warn('[llm] Thiếu OPENROUTER_API_KEY — trả lời tạm.');
    return brand.fallback;
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
      return brand.fallback;
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      history.pop();
      return brand.fallback;
    }

    history.push({ role: 'assistant', content: reply });
    // Cắt bớt lịch sử cho gọn
    if (history.length > MAX_TURNS) history.splice(0, history.length - MAX_TURNS);

    return reply;
  } catch (e) {
    console.error('[llm] Lỗi gọi OpenRouter:', e);
    history.pop();
    return brand.fallback;
  }
}
