import { config } from './config.js';
import { brand, products } from './knowledge.js';
import { campaignToPromptData, defaultCampaign } from './campaigns.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Ghép catalog thành text gọn cho system prompt
function renderCatalog(catalogProducts) {
  return catalogProducts
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
function buildSystemPrompt(campaign) {
  const promptData = campaignToPromptData(campaign || defaultCampaign());
  const rules = promptData.rulesList.map((r, i) => `${i + 1}. ${r}`).join('\n');
  const knowledge = promptData.knowledge
    ? `
# TÀI LIỆU / HƯỚNG DẪN THÊM
${promptData.knowledge}
`
    : '';

  return `${promptData.persona}

# LUẬT TRẢ LỜI (bắt buộc tuân thủ)
${rules}
${knowledge}

# DANH MỤC SẢN PHẨM (chỉ được dùng thông tin trong đây, không bịa thêm)
${renderCatalog(promptData.products)}

# GỬI ẢNH CHO KHÁCH
Khi khách muốn XEM ẢNH một sản phẩm (ví dụ "cho xem ảnh", "mẫu nào đẹp", "hình thực tế"...),
hãy trả lời bình thường, rồi THÊM một dòng RIÊNG ở CUỐI theo đúng cú pháp:
##IMG: <mã>
Ví dụ khách muốn xem đệm bông ép → thêm dòng cuối: ##IMG: bong-ep
Có thể gửi ảnh nhiều sản phẩm: ##IMG: bong-ep, back-essential
CHỈ thêm dòng này khi khách thật sự muốn xem ảnh, và chỉ dùng mã có trong danh mục.
KHÔNG nhắc tới "##IMG" hay việc gửi ảnh bằng cú pháp trong lời thoại với khách.

# GHI NHẬN LEAD CHO SALE
Khi khách đã cung cấp số điện thoại, hoặc đồng ý để nhân viên tư vấn liên hệ và đã có số điện thoại trong hội thoại,
hãy xác nhận minh bạch rằng bộ phận tư vấn sẽ liên hệ hỗ trợ, rồi THÊM một dòng RIÊNG ở CUỐI theo đúng cú pháp JSON:
##LEAD: {"customerName":"<tên nếu biết>","phone":"<số điện thoại>","productInterest":"<sản phẩm quan tâm>","note":"<nhu cầu/ghi chú ngắn>"}
Nếu chưa có số điện thoại thì KHÔNG thêm ##LEAD; hãy hỏi xin tên và số điện thoại một cách lịch sự.
CHỈ dùng dữ liệu khách đã nói hoặc suy luận trực tiếp từ hội thoại, không bịa tên, số điện thoại, nhu cầu.
KHÔNG nhắc tới "##LEAD" hay việc lưu bằng cú pháp trong lời thoại với khách.`;
}

// Tách dấu ##IMG khỏi câu trả lời, tra ra URL ảnh của sản phẩm tương ứng
const IMG_MARKER = /^##IMG:\s*([a-z0-9\-,\s]+)$/im;
const LEAD_MARKER = /^##LEAD:\s*(\{.*\})$/im;

export function parseReplyMarkers(reply, catalogProducts = products) {
  const { text: withoutLead, lead } = extractLead(reply);
  const { text, images } = extractImages(withoutLead, catalogProducts);
  return { text, images, lead };
}

function extractImages(reply, catalogProducts) {
  const m = reply.match(IMG_MARKER);
  const text = reply.replace(IMG_MARKER, '').trim();
  if (!m) return { text, images: [] };

  const ids = m[1]
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const images = [];
  for (const id of ids) {
    const p = catalogProducts.find((x) => x.id === id);
    if (p?.images?.length) images.push(...p.images);
  }
  return { text, images };
}

function extractLead(reply) {
  const m = reply.match(LEAD_MARKER);
  const text = reply.replace(LEAD_MARKER, '').trim();
  if (!m) return { text, lead: null };

  try {
    const lead = JSON.parse(m[1]);
    return { text, lead };
  } catch (e) {
    console.warn('[llm] Không parse được ##LEAD:', e);
    return { text, lead: null };
  }
}

// Bộ nhớ hội thoại ngắn hạn trong RAM (reset khi redeploy) — đủ cho MVP
const histories = new Map();
const MAX_TURNS = 8; // giữ tối đa 8 lượt (4 cặp hỏi–đáp)

function getHistory(conversationKey) {
  if (!histories.has(conversationKey)) histories.set(conversationKey, []);
  return histories.get(conversationKey);
}

/**
 * Sinh câu trả lời cho 1 tin nhắn của khách.
 * @returns {Promise<{text: string, images: string[], lead: object | null, conversation: object[]}>}
 */
export async function generateReply(senderId, userText, options = {}) {
  const campaign = campaignToPromptData(options.campaign || defaultCampaign());
  const conversationKey = options.conversationKey || `${campaign.slug}:${senderId}`;

  if (!config.openrouterApiKey) {
    console.warn('[llm] Thiếu OPENROUTER_API_KEY — trả lời tạm.');
    return { text: brand.fallback, images: [], lead: null, conversation: [] };
  }

  const history = getHistory(conversationKey);
  history.push({ role: 'user', content: userText });

  const messages = [{ role: 'system', content: buildSystemPrompt(campaign) }, ...history];

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
      return { text: brand.fallback, images: [], lead: null, conversation: history.slice() };
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      history.pop();
      return { text: brand.fallback, images: [], lead: null, conversation: history.slice() };
    }

    const { text, images, lead } = parseReplyMarkers(raw, campaign.products);
    // Lưu lịch sử bản đã gỡ dấu nội bộ cho sạch
    const cleanText = text || 'Dạ em gửi anh/chị xem ảnh ạ 😊';
    history.push({ role: 'assistant', content: cleanText });
    if (history.length > MAX_TURNS) history.splice(0, history.length - MAX_TURNS);

    return { text: cleanText, images, lead, conversation: history.slice() };
  } catch (e) {
    console.error('[llm] Lỗi gọi OpenRouter:', e);
    history.pop();
    return { text: brand.fallback, images: [], lead: null, conversation: history.slice() };
  }
}
