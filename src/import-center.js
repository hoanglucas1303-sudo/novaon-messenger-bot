import { config } from './config.js';
import { requireAdminAuth } from './auth.js';
import {
  defaultCampaign,
  getCampaignBySlug,
  listCampaigns,
  saveCampaign,
} from './campaigns.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const drafts = new Map();

const sampleSource = `Brand: Đệm Sông Hồng

Sản phẩm: Đệm bông ép Sông Hồng
Nhóm: Đệm / Bông ép
Mô tả: Đệm làm từ 100% polyester cotton, bề mặt phẳng, nằm chắc lưng, gấp gọn 3 tấm, phù hợp gia đình cần đệm bền và dễ vệ sinh.
Phù hợp: gia đình trẻ, người thích nằm chắc, ngân sách vừa phải, cần gấp gọn.
Không phù hợp: khách muốn cảm giác ôm mềm như memory foam.
Giá tham khảo:
160x200cm dày 9cm: giá hãng 3.490.000đ, giá khuyến mại 2.443.000đ
180x200cm dày 9cm: giá hãng 3.940.000đ, giá khuyến mại 2.758.000đ
Ảnh chính: https://songhonghanoi.vn/media/product/31______m_b__ng___p_s__ng_h___ng_v____g___m.jpg

Sản phẩm: Back Essential
Nhóm: Đệm / Foam cao cấp
Mô tả: Dòng cao cấp kết hợp foam và memory foam, nâng đỡ cột sống, giảm áp lực vùng vai lưng hông.
Phù hợp: người đau lưng, phòng ngủ cao cấp, khách muốn đệm êm và nâng đỡ tốt.
Không phù hợp: khách cần gấp gọn hoặc ngân sách thấp.
Giá tham khảo:
160x200cm dày 17cm: giá hãng 10.510.000đ, giá khuyến mại 6.832.000đ
180x200cm dày 17cm: giá hãng 11.490.000đ, giá khuyến mại 7.469.000đ
Ảnh chính: https://songhonghanoi.vn/media/product/1182______m_back_essential.jpg

Chính sách tư vấn:
Nếu khách hỏi giá, báo là giá tham khảo và xin SĐT để Sale xác nhận khuyến mại thực tế.
Nếu khách đau lưng, ưu tiên tư vấn Back Essential, nhưng vẫn hỏi thêm ngân sách và sở thích nằm cứng/êm.
Nếu khách cần gấp gọn, ưu tiên đệm bông ép.`;

export function mountImportCenter(app) {
  app.get('/studio/import/demo', (_req, res) => {
    res.type('html').send(
      renderImportPage({
        title: 'Import Center Demo',
        body: renderImportForm({
          campaigns: [defaultCampaign()],
          action: '/studio/import/demo/analyze',
          sourceText: sampleSource,
          demo: true,
        }),
      })
    );
  });

  app.post('/studio/import/demo/analyze', route(async (req, res) => {
    const draft = await createDraftFromRequest(req.body, { demo: true });
    res.redirect(`/studio/import/demo/drafts/${draft.id}`);
  }));

  app.get('/studio/import/demo/drafts/:id', (req, res) => {
    const draft = drafts.get(req.params.id);
    if (!draft) return res.status(404).send('Draft not found');
    res.type('html').send(
      renderImportPage({
        title: 'Review Draft Demo',
        body: renderDraftReview(draft, {
          demo: true,
          publishAction: '#',
        }),
      })
    );
  });

  app.get('/studio/import', requireAdminAuth, route(async (_req, res) => {
    if (!ensureImportUnlocked(res)) return;
    const campaigns = await listCampaigns();
    res.type('html').send(
      renderImportPage({
        title: 'Import Center',
        body: renderImportForm({
          campaigns,
          action: '/studio/import/analyze',
          sourceText: '',
          demo: false,
        }),
      })
    );
  }));

  app.post('/studio/import/analyze', requireAdminAuth, route(async (req, res) => {
    if (!ensureImportUnlocked(res)) return;
    const draft = await createDraftFromRequest(req.body, { demo: false });
    res.redirect(`/studio/import/drafts/${draft.id}`);
  }));

  app.get('/studio/import/drafts/:id', requireAdminAuth, (req, res) => {
    if (!ensureImportUnlocked(res)) return;
    const draft = drafts.get(req.params.id);
    if (!draft) return res.status(404).send('Draft not found');
    res.type('html').send(
      renderImportPage({
        title: 'Review Draft',
        body: renderDraftReview(draft, {
          demo: false,
          publishAction: `/studio/import/drafts/${draft.id}/publish`,
        }),
      })
    );
  });

  app.post('/studio/import/drafts/:id/publish', requireAdminAuth, route(async (req, res) => {
    if (!ensureImportUnlocked(res)) return;
    const draft = drafts.get(req.params.id);
    if (!draft) return res.status(404).send('Draft not found');

    const campaign = await publishDraft(draft, req.body);
    res.redirect(`/studio/campaigns/${campaign.id}/edit?saved=1`);
  }));
}

async function createDraftFromRequest(body, { demo }) {
  const campaignSlug = cleanSlug(body.campaignSlug) || defaultCampaign().slug;
  const sourceType = body.sourceType === 'url' ? 'url' : 'text';
  const sourceUrl = String(body.sourceUrl || '').trim();
  const rawText = sourceType === 'url' ? await fetchSourceText(sourceUrl) : String(body.sourceText || '');
  const sourceText = rawText.trim().slice(0, 45000);
  const extracted = await extractDraft({
    campaignSlug,
    sourceType,
    sourceUrl,
    sourceText,
    demo,
  });

  const draft = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    campaignSlug,
    sourceType,
    sourceUrl,
    sourceText,
    extracted,
    demo,
    createdAt: new Date().toISOString(),
  };
  drafts.set(draft.id, draft);
  return draft;
}

async function fetchSourceText(sourceUrl) {
  const url = new URL(sourceUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported URL');
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 NovaonBotImportCenter',
      Accept: 'text/html,text/plain,application/xhtml+xml',
    },
  });
  if (!res.ok) throw new Error(`Cannot fetch source URL: ${res.status}`);
  const html = await res.text();
  return htmlToText(html).slice(0, 45000);
}

async function extractDraft({ campaignSlug, sourceType, sourceUrl, sourceText, demo }) {
  if (!config.openrouterApiKey) {
    console.warn('[import] Thiếu OPENROUTER_API_KEY — dùng extractor heuristic.');
    return heuristicExtract({ campaignSlug, sourceType, sourceUrl, sourceText, demo });
  }

  const prompt = `Bạn là AI Data Converter cho một chatbot tư vấn bán hàng.

Nhiệm vụ: đọc tài liệu client và chuyển thành dữ liệu draft để PM review trước khi publish.

Yêu cầu:
- Chỉ trích xuất thông tin có trong tài liệu. Không bịa sản phẩm, giá, ảnh.
- Giá phải đưa vào variants nếu có size/độ dày. Nếu chỉ có khoảng giá, đưa vào price và priceNote.
- Ảnh/URL ảnh đưa vào images của đúng sản phẩm nếu suy luận trực tiếp được.
- Knowledge dùng cho RAG/tài liệu mềm: chính sách, hướng dẫn tư vấn, FAQ, lưu ý bán hàng.
- Rules là luật trả lời chatbot nên áp dụng.
- Recommendation rules là gợi ý có chủ đích dạng ngắn, ví dụ "Nếu khách đau lưng -> ưu tiên Back Essential".
- Trả về JSON hợp lệ, không markdown.

Schema:
{
  "summary": "Tóm tắt nguồn tài liệu",
  "products": [
    {
      "id": "slug",
      "name": "",
      "line": "",
      "description": "",
      "features": [],
      "sizes": [],
      "thickness": [],
      "price": "",
      "priceNote": "",
      "sourceUrl": "",
      "variants": [
        {"size": "", "thickness": "", "listPrice": 0, "salePrice": 0, "note": ""}
      ],
      "images": []
    }
  ],
  "knowledge": "",
  "rules": [],
  "recommendationRules": [],
  "warnings": []
}

Campaign slug: ${campaignSlug}
Nguồn: ${sourceType}${sourceUrl ? ` - ${sourceUrl}` : ''}

Tài liệu:
${sourceText}`;

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.openrouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.premiumLlmModel,
        messages: [
          { role: 'system', content: 'Bạn chỉ trả JSON hợp lệ để hệ thống parse bằng JSON.parse.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 2600,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      console.error('[import] OpenRouter lỗi:', res.status, await res.text());
      return heuristicExtract({ campaignSlug, sourceType, sourceUrl, sourceText, demo });
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || '{}';
    return normalizeExtractedDraft(JSON.parse(stripJsonFence(raw)), { sourceUrl });
  } catch (e) {
    console.error('[import] Không extract bằng AI được:', e);
    return heuristicExtract({ campaignSlug, sourceType, sourceUrl, sourceText, demo });
  }
}

function heuristicExtract({ sourceUrl, sourceText }) {
  const lines = sourceText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const productBlocks = sourceText
    .replace(/^(Sản phẩm:|San pham:|Product:)/i, '\n$1')
    .split(/\n(?=Sản phẩm:|San pham:|Product:)/i);
  const products = productBlocks
    .map((block) => heuristicProduct(block, sourceUrl))
    .filter(Boolean);
  if (!products.length) {
    const fallbackProduct = heuristicProductFromLines(lines, sourceUrl);
    if (fallbackProduct) products.push(fallbackProduct);
  }
  if (!products.length) {
    const directProduct = directProductFromText(sourceText, sourceUrl);
    if (directProduct) products.push(directProduct);
  }

  return normalizeExtractedDraft(
    {
      summary: 'Draft tạo bằng heuristic vì chưa gọi được AI extractor.',
      products,
      knowledge: lines.filter((line) => /chính sách|tu van|tư vấn|phù hợp|không phù hợp/i.test(line)).join('\n'),
      rules: lines.filter((line) => /^nếu |^neu |không |khong /i.test(line)).slice(0, 8),
      recommendationRules: lines.filter((line) => /ưu tiên|uu tien|phù hợp|phu hop/i.test(line)).slice(0, 8),
      warnings: ['Heuristic extractor chỉ phù hợp demo. Cần review kỹ trước khi publish.'],
    },
    { sourceUrl }
  );
}

function heuristicProduct(block, sourceUrl) {
  const name = firstMatch(block, /(?:Sản phẩm|San pham|Product):\s*(.+)/i);
  if (!name) return null;
  const description = firstMatch(block, /(?:Mô tả|Mo ta|Description):\s*(.+)/i) || '';
  const image = firstMatch(block, /Ảnh[^:]*:\s*(https?:\/\/\S+)/i);
  const variants = [...block.matchAll(/([\d]{3}x[\d]{3}cm|[\dmx\s]+cm).*?(?:dày|day)?\s*([\d]+cm)?.*?([\d.]+)\s*đ.*?([\d.]+)\s*đ/gi)].map((m) => ({
    size: m[1]?.replace(/\s+/g, ''),
    thickness: m[2] || '',
    listPrice: numberFromPrice(m[3]),
    salePrice: numberFromPrice(m[4]),
  }));
  const line = firstMatch(block, /(?:Nhóm|Nhom|Category):\s*(.+)/i) || '';
  return {
    id: cleanSlug(name),
    name,
    line,
    description,
    features: splitList(firstMatch(block, /Phù hợp:\s*(.+)/i)),
    sizes: [],
    thickness: [],
    price: variants.length ? 'Có giá theo biến thể' : '',
    priceNote: 'Giá do AI/heuristic trích xuất từ tài liệu, cần PM review.',
    sourceUrl,
    variants,
    images: image ? [image] : [],
  };
}

function heuristicProductFromLines(lines, sourceUrl) {
  const joined = lines.join('\n');
  const nameLine = lines.find((line) => /^(Sản phẩm|San pham|Product):/i.test(line)) || lines.find((line) => line.includes(':'));
  if (!nameLine) return null;
  const name = nameLine.replace(/^(Sản phẩm|San pham|Product):\s*/i, '').replace(/^[^:]{1,30}:\s*/, '').trim();
  if (!name) return null;
  const descriptionLine = lines.find((line) => /^(Mô tả|Mo ta|Description):/i.test(line));
  const imageLine = lines.find((line) => /^Ảnh/i.test(line));
  const variants = [...joined.matchAll(/([\d]{3}x[\d]{3}cm|[\dmx\s]+cm).*?(?:dày|day)?\s*([\d]+cm)?.*?([\d.]+)\s*đ.*?([\d.]+)\s*đ/gi)].map((m) => ({
    size: m[1]?.replace(/\s+/g, ''),
    thickness: m[2] || '',
    listPrice: numberFromPrice(m[3]),
    salePrice: numberFromPrice(m[4]),
  }));
  return {
    id: cleanSlug(name),
    name,
    line: '',
    description: descriptionLine?.replace(/^(Mô tả|Mo ta|Description):\s*/i, '').trim() || '',
    features: [],
    sizes: [],
    thickness: [],
    price: variants.length ? 'Có giá theo biến thể' : '',
    priceNote: 'Giá do AI/heuristic trích xuất từ tài liệu, cần PM review.',
    sourceUrl,
    variants,
    images: imageLine ? [imageLine.replace(/^Ảnh[^:]*:\s*/i, '').trim()].filter((url) => url.startsWith('http')) : [],
  };
}

function directProductFromText(sourceText, sourceUrl) {
  const text = String(sourceText || '');
  const name =
    firstMatch(text, /Sản phẩm:\s*([^\n\r]+)/i) ||
    firstMatch(text, /San pham:\s*([^\n\r]+)/i) ||
    firstMatch(text, /Product:\s*([^\n\r]+)/i) ||
    firstMatch(text, /^[^:\n\r]{1,30}:\s*([^\n\r]+)/i);
  if (!name) return null;
  const description =
    firstMatch(text, /Mô tả:\s*([^\n\r]+)/i) ||
    firstMatch(text, /Mo ta:\s*([^\n\r]+)/i) ||
    firstMatch(text, /Description:\s*([^\n\r]+)/i);
  const variants = [...text.matchAll(/([\d]{3}x[\d]{3}cm|[\dmx\s]+cm).*?(?:dày|day)?\s*([\d]+cm)?.*?([\d.]+)\s*đ.*?([\d.]+)\s*đ/gi)].map((m) => ({
    size: m[1]?.replace(/\s+/g, ''),
    thickness: m[2] || '',
    listPrice: numberFromPrice(m[3]),
    salePrice: numberFromPrice(m[4]),
  }));
  const image = firstMatch(text, /(https?:\/\/[^\s]+?\.(?:jpg|jpeg|png|webp))/i);
  return {
    id: cleanSlug(name),
    name,
    line: '',
    description,
    features: [],
    sizes: [],
    thickness: [],
    price: variants.length ? 'Có giá theo biến thể' : '',
    priceNote: 'Giá do heuristic trích xuất từ tài liệu, cần PM review.',
    sourceUrl,
    variants,
    images: image ? [image] : [],
  };
}

async function publishDraft(draft, body) {
  const targetSlug = cleanSlug(body.campaignSlug || draft.campaignSlug);
  const campaign = (await getCampaignBySlug(targetSlug)) || defaultCampaign();
  const approvedProducts = parseJsonArray(body.products);
  const productsToPublish = approvedProducts.length ? approvedProducts : draft.extracted.products || [];
  const approvedRules = String(body.rules || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
  const recommendationRules = String(body.recommendationRules || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
  const knowledge = String(body.knowledge || '').trim();

  const mergedProducts = mergeProducts(campaign.products, productsToPublish);
  const mergedRules = mergeTextLines(
    campaign.rules,
    [...approvedRules, ...recommendationRules.map((rule) => `Gợi ý có chủ đích: ${rule}`)]
  );
  const mergedKnowledge = [campaign.knowledge, knowledge].filter(Boolean).join('\n\n--- Imported knowledge ---\n');

  return saveCampaign({
    ...campaign,
    brandName: campaign.brand_name,
    pageIds: campaign.page_ids.join('\n'),
    rules: mergedRules,
    knowledge: mergedKnowledge,
    products: JSON.stringify(mergedProducts, null, 2),
    active: campaign.active ? 'on' : '',
  });
}

function mergeProducts(existingProducts, importedProducts) {
  const map = new Map();
  for (const product of existingProducts || []) map.set(product.id, product);
  for (const product of importedProducts || []) {
    if (!product?.id) continue;
    map.set(product.id, { ...(map.get(product.id) || {}), ...product });
  }
  return Array.from(map.values());
}

function mergeTextLines(existing, nextLines) {
  const seen = new Set();
  return String(existing || '')
    .split('\n')
    .concat(nextLines)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line || seen.has(line)) return false;
      seen.add(line);
      return true;
    })
    .join('\n');
}

function renderImportForm({ campaigns, action, sourceText, demo }) {
  const options = campaigns
    .map((campaign) => `<option value="${escapeHtml(campaign.slug)}">${escapeHtml(campaign.name)} (${escapeHtml(campaign.slug)})</option>`)
    .join('');
  return `
    <header class="topbar">
      <div>
        <a class="back" href="/studio">Studio</a>
        <h1>${demo ? 'Import Center Demo' : 'Import Center'}</h1>
        <p>Convert tài liệu client thành draft catalog, knowledge, rules và gợi ý tư vấn để PM review.</p>
      </div>
    </header>
    <form class="editor" method="post" action="${action}">
      <section>
        <h2>Nguồn dữ liệu</h2>
        <div class="grid">
          <label>Campaign
            <select name="campaignSlug">${options}</select>
          </label>
          <label>Loại nguồn
            <select name="sourceType">
              <option value="text">Text / bảng giá paste</option>
              <option value="url">URL website</option>
            </select>
          </label>
        </div>
        <label>URL website nếu chọn loại URL
          <input name="sourceUrl" placeholder="https://example.com/catalog">
        </label>
      </section>
      <section>
        <h2>Tài liệu / bảng giá / nội dung website đã copy</h2>
        <textarea name="sourceText" rows="18" spellcheck="false">${escapeHtml(sourceText)}</textarea>
      </section>
      <div class="actions">
        <button class="button" type="submit">Analyze & tạo draft</button>
        ${
          demo
            ? '<a class="button secondary" href="/chat/song-hong-demo?model=auto">Mở web chat test</a>'
            : '<a class="button secondary" href="/studio">Quay lại Studio</a>'
        }
      </div>
    </form>
  `;
}

function renderDraftReview(draft, { demo, publishAction }) {
  const extracted = draft.extracted;
  return `
    <header class="topbar">
      <div>
        <a class="back" href="${demo ? '/studio/import/demo' : '/studio/import'}">Import Center</a>
        <h1>Review draft</h1>
        <p>${escapeHtml(extracted.summary || 'Draft từ tài liệu client')} ${demo ? '· demo không publish' : ''}</p>
      </div>
      ${
        demo
          ? '<a class="button secondary" href="/studio/import/demo">Thử lại</a>'
          : `<button class="button" type="submit" form="publish-form">Publish vào campaign</button>`
      }
    </header>
    ${
      extracted.warnings?.length
        ? `<section class="warning"><h2>Cần review</h2><ul>${extracted.warnings.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>`
        : ''
    }
    <form id="publish-form" class="editor" method="post" action="${publishAction}">
      <section>
        <h2>Campaign đích</h2>
        <input name="campaignSlug" value="${escapeHtml(draft.campaignSlug)}">
      </section>
      <section>
        <h2>Products JSON</h2>
        <textarea name="products" rows="16" spellcheck="false">${escapeHtml(JSON.stringify(extracted.products || [], null, 2))}</textarea>
      </section>
      <section>
        <h2>Knowledge cho RAG / tài liệu mềm</h2>
        <textarea name="knowledge" rows="8">${escapeHtml(extracted.knowledge || '')}</textarea>
      </section>
      <section>
        <h2>Rules chatbot</h2>
        <textarea name="rules" rows="7">${escapeHtml((extracted.rules || []).join('\n'))}</textarea>
      </section>
      <section>
        <h2>Recommendation Rules</h2>
        <textarea name="recommendationRules" rows="7">${escapeHtml((extracted.recommendationRules || []).join('\n'))}</textarea>
      </section>
    </form>
    <section>
      <h2>Source excerpt</h2>
      <pre>${escapeHtml(draft.sourceText.slice(0, 5000))}</pre>
    </section>
  `;
}

function renderImportPage({ title, body }) {
  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} · Novaon Import Center</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f4f6f8;
        --surface: #ffffff;
        --text: #17202a;
        --muted: #667085;
        --line: #d7dde5;
        --brand: #0f766e;
        --brand-dark: #115e59;
        --warn-bg: #fff7ed;
        --warn-line: #fed7aa;
      }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--bg); color: var(--text); font-family: Arial, Helvetica, sans-serif; line-height: 1.5; }
      main { width: min(1180px, calc(100% - 32px)); margin: 28px auto 56px; }
      h1, h2, p { margin: 0; }
      h1 { font-size: 28px; line-height: 1.2; }
      h2 { font-size: 18px; margin-bottom: 14px; }
      a { color: var(--brand-dark); font-weight: 700; text-decoration: none; }
      .topbar { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 18px; }
      .topbar p, .muted { color: var(--muted); }
      .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
      .button, button { display: inline-flex; align-items: center; justify-content: center; min-height: 40px; border: 1px solid var(--brand); border-radius: 6px; background: var(--brand); color: #fff; padding: 9px 14px; font: inherit; font-weight: 700; cursor: pointer; }
      .button.secondary { background: var(--surface); color: var(--brand-dark); border-color: var(--line); }
      .back { display: inline-block; margin-bottom: 8px; }
      section { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 18px; margin-bottom: 16px; }
      section.warning { background: var(--warn-bg); border-color: var(--warn-line); }
      label { display: grid; gap: 6px; color: var(--muted); font-size: 13px; font-weight: 700; margin-bottom: 14px; }
      input, textarea, select { width: 100%; border: 1px solid var(--line); border-radius: 6px; padding: 10px 11px; color: var(--text); font: inherit; background: #fff; }
      textarea { resize: vertical; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
      ul { margin: 0; padding-left: 20px; }
      pre { white-space: pre-wrap; overflow-wrap: anywhere; margin: 0; color: #344054; }
      @media (max-width: 760px) {
        main { width: min(100% - 20px, 1180px); margin-top: 20px; }
        .topbar { flex-direction: column; align-items: flex-start; }
        .grid { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body><main>${body}</main></body>
</html>`;
}

function ensureImportUnlocked(res) {
  if (config.dashboardPassword) return true;
  res.status(503).type('html').send(
    renderImportPage({
      title: 'Import Center đang khóa',
      body: `
        <section>
          <h1>Import Center đang khóa</h1>
          <p>Đặt <code>DASHBOARD_PASSWORD</code> để mở bản thật. Có thể xem luồng demo tại <a href="/studio/import/demo">/studio/import/demo</a>.</p>
        </section>
      `,
    })
  );
  return false;
}

function route(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function normalizeExtractedDraft(value, { sourceUrl }) {
  const products = Array.isArray(value.products) ? value.products : [];
  return {
    summary: cleanText(value.summary, 500),
    products: products.map((product) => normalizeProduct(product, sourceUrl)).filter((product) => product.id && product.name),
    knowledge: cleanText(value.knowledge, 12000),
    rules: normalizeStringArray(value.rules).slice(0, 30),
    recommendationRules: normalizeStringArray(value.recommendationRules || value.recommendation_rules).slice(0, 30),
    warnings: normalizeStringArray(value.warnings).slice(0, 20),
  };
}

function normalizeProduct(product, sourceUrl) {
  return {
    id: cleanSlug(product.id || product.name),
    name: cleanText(product.name, 160),
    line: cleanText(product.line, 160),
    description: cleanText(product.description, 1000),
    features: normalizeStringArray(product.features),
    sizes: normalizeStringArray(product.sizes),
    thickness: normalizeStringArray(product.thickness),
    price: cleanText(product.price, 200),
    priceNote: cleanText(product.priceNote || product.price_note, 500),
    sourceUrl: cleanText(product.sourceUrl || product.source_url || sourceUrl, 500),
    variants: normalizeVariants(product.variants),
    images: normalizeStringArray(product.images),
  };
}

function normalizeVariants(items = []) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    size: cleanText(item.size, 120),
    thickness: cleanText(item.thickness, 120),
    listPrice: normalizeNumber(item.listPrice || item.list_price),
    salePrice: normalizeNumber(item.salePrice || item.sale_price),
    note: cleanText(item.note, 240),
  }));
}

function parseJsonArray(text) {
  try {
    const parsed = JSON.parse(String(text || '[]'));
    return Array.isArray(parsed) ? parsed.map((item) => normalizeProduct(item, '')).filter((item) => item.id && item.name) : [];
  } catch {
    return [];
  }
}

function htmlToText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripJsonFence(text) {
  return String(text || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function splitList(text) {
  return String(text || '')
    .split(/[,;·]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function firstMatch(text, pattern) {
  return (String(text || '').match(pattern) || [])[1]?.trim() || '';
}

function numberFromPrice(value) {
  const number = Number(String(value || '').replace(/[^\d]/g, ''));
  if (!Number.isFinite(number) || number <= 0) return null;
  return number < 100000 ? number * 1000 : number;
}

function normalizeNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const number = Number(String(value || '').replace(/[^\d]/g, ''));
  return Number.isFinite(number) && number > 0 ? number : null;
}

function cleanSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function normalizeStringArray(value = []) {
  if (typeof value === 'string') return splitList(value);
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
