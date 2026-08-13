// ============================================================================
// KẾT NỐI TRANG FACEBOOK — Facebook Login (OAuth) thật.
// Thay việc gõ tay Page ID + tự bấm trong console Meta bằng:
//   Bấm "Kết nối Facebook" trong Campaign → chọn Trang → hệ thống tự lấy
//   Page Access Token CỦA TRANG ĐÓ + tự đăng ký webhook + lưu vào DB.
// Đây là nền multi-tenant: mỗi Campaign (Client) tự kết nối Trang riêng.
// ============================================================================
import crypto from 'node:crypto';
import { config } from './config.js';
import { query, hasDatabase } from './db.js';
import { getCampaignBySlug, saveCampaign } from './campaigns.js';
import { requireAdminAuth } from './auth.js';

const GRAPH = `https://graph.facebook.com/${config.graphApiVersion}`;
const OAUTH_DIALOG = 'https://www.facebook.com/v21.0/dialog/oauth';
// Chỉ xin đúng quyền bot đang thật sự dùng (khớp App Review đã nộp)
const SCOPES = 'pages_show_list,pages_messaging,pages_manage_metadata';

// ---- state ngắn hạn trong RAM: đủ cho 1 luồng OAuth, dọn sau 15 phút ----
const pendingStates = new Map(); // nonce -> { campaignSlug, createdAt }
const pendingPicks = new Map(); // nonce -> { campaignSlug, pages: [{id,name,access_token}], createdAt }
const TTL_MS = 15 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of pendingStates) if (now - val.createdAt > TTL_MS) pendingStates.delete(key);
  for (const [key, val] of pendingPicks) if (now - val.createdAt > TTL_MS) pendingPicks.delete(key);
}, 5 * 60 * 1000).unref?.();

function nonce() {
  return crypto.randomBytes(20).toString('hex');
}

// ---------------------------------------------------------------------------
// DB: page_connections — Page Access Token riêng từng Trang, gắn theo Campaign
// ---------------------------------------------------------------------------
export async function initPageConnections() {
  if (!hasDatabase()) return;
  await query(`
    CREATE TABLE IF NOT EXISTS page_connections (
      id BIGSERIAL PRIMARY KEY,
      page_id TEXT NOT NULL UNIQUE,
      page_name TEXT,
      page_access_token TEXT NOT NULL,
      campaign_slug TEXT,
      connected_by TEXT,
      connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS page_connections_campaign_idx ON page_connections (campaign_slug);
  `);
  console.log('[facebook] Bảng page_connections sẵn sàng ✅');
}

export async function getPageConnectionByPageId(pageId) {
  if (!pageId) return null;
  const result = await query('SELECT * FROM page_connections WHERE page_id = $1', [String(pageId)]);
  return result?.rows[0] || null;
}

export async function listPageConnectionsForCampaign(slug) {
  const result = await query(
    'SELECT id, page_id, page_name, connected_by, connected_at FROM page_connections WHERE campaign_slug = $1 ORDER BY connected_at DESC',
    [slug]
  );
  return result?.rows || [];
}

async function savePageConnection({ pageId, pageName, pageAccessToken, campaignSlug, connectedBy }) {
  const result = await query(
    `
      INSERT INTO page_connections (page_id, page_name, page_access_token, campaign_slug, connected_by)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (page_id) DO UPDATE SET
        page_name = EXCLUDED.page_name,
        page_access_token = EXCLUDED.page_access_token,
        campaign_slug = EXCLUDED.campaign_slug,
        connected_by = EXCLUDED.connected_by,
        updated_at = NOW()
      RETURNING *
    `,
    [pageId, pageName, pageAccessToken, campaignSlug, connectedBy || null]
  );
  return result?.rows[0] || null;
}

async function addPageIdToCampaign(slug, pageId) {
  const campaign = await getCampaignBySlug(slug);
  if (!campaign) return null;
  if (campaign.page_ids.includes(pageId)) return campaign;
  return saveCampaign({
    id: campaign.id,
    slug: campaign.slug,
    name: campaign.name,
    brandName: campaign.brand_name,
    persona: campaign.persona,
    rules: campaign.rules,
    knowledge: campaign.knowledge,
    products: campaign.products,
    page_ids: [...campaign.page_ids, pageId],
    active: campaign.active,
  });
}

// ---------------------------------------------------------------------------
// OAuth routes
// ---------------------------------------------------------------------------
export function mountFacebookOAuth(app) {
  // Bước 1: bấm "Kết nối Facebook" từ Campaign → mở Facebook Login
  app.get('/oauth/facebook/connect', requireAdminAuth, (req, res) => {
    const campaignSlug = String(req.query.campaign || '').trim();
    if (!campaignSlug) return res.status(400).send('Thiếu campaign');
    if (!hasDatabase()) return res.status(400).send('Cần gắn Postgres (DATABASE_URL) trước khi kết nối Trang.');
    if (!config.appSecret) return res.status(400).send('Cần đặt APP_SECRET trên server trước khi kết nối Trang.');

    const state = nonce();
    pendingStates.set(state, { campaignSlug, createdAt: Date.now() });

    const redirectUri = `${config.publicBaseUrl}/oauth/facebook/callback`;
    const url = new URL(OAUTH_DIALOG);
    url.searchParams.set('client_id', config.metaAppId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('scope', SCOPES);
    url.searchParams.set('response_type', 'code');
    res.redirect(url.toString());
  });

  // Bước 2: Meta redirect về đây kèm code → đổi token, liệt kê Trang, cho chọn
  app.get('/oauth/facebook/callback', requireAdminAuth, route(async (req, res) => {
    const { code, state, error, error_description: errorDescription } = req.query;
    if (error) return res.status(400).send(renderMessage('Facebook từ chối', errorDescription || error));

    const pending = state && pendingStates.get(state);
    if (!pending) return res.status(400).send(renderMessage('Phiên hết hạn', 'Vui lòng bấm "Kết nối Facebook" lại từ đầu.'));
    pendingStates.delete(state);

    try {
      const redirectUri = `${config.publicBaseUrl}/oauth/facebook/callback`;

      // Đổi code lấy user access token (ngắn hạn)
      const tokenUrl = new URL(`${GRAPH}/oauth/access_token`);
      tokenUrl.searchParams.set('client_id', config.metaAppId);
      tokenUrl.searchParams.set('redirect_uri', redirectUri);
      tokenUrl.searchParams.set('client_secret', config.appSecret);
      tokenUrl.searchParams.set('code', code);
      const tokenRes = await fetch(tokenUrl);
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        console.error('[facebook] Đổi code lỗi:', tokenData);
        return res.status(400).send(renderMessage('Không lấy được token', JSON.stringify(tokenData.error || tokenData)));
      }

      // Đổi sang long-lived token (khuyến nghị, để token bền hơn)
      const longUrl = new URL(`${GRAPH}/oauth/access_token`);
      longUrl.searchParams.set('grant_type', 'fb_exchange_token');
      longUrl.searchParams.set('client_id', config.metaAppId);
      longUrl.searchParams.set('client_secret', config.appSecret);
      longUrl.searchParams.set('fb_exchange_token', tokenData.access_token);
      const longRes = await fetch(longUrl);
      const longData = await longRes.json();
      const userToken = longData.access_token || tokenData.access_token;

      // Lấy danh sách Trang người dùng quản lý (pages_show_list) — kèm token riêng từng Trang
      const pagesUrl = new URL(`${GRAPH}/me/accounts`);
      pagesUrl.searchParams.set('fields', 'id,name,access_token');
      pagesUrl.searchParams.set('access_token', userToken);
      const pagesRes = await fetch(pagesUrl);
      const pagesData = await pagesRes.json();
      const pages = Array.isArray(pagesData.data) ? pagesData.data : [];

      if (!pages.length) {
        return res
          .status(200)
          .send(renderMessage('Không có Trang nào', 'Tài khoản này chưa quản lý Trang Facebook nào, hoặc chưa cấp đủ quyền.'));
      }

      const pickToken = nonce();
      pendingPicks.set(pickToken, { campaignSlug: pending.campaignSlug, pages, createdAt: Date.now() });
      res.type('html').send(renderPickerPage({ pages, pickToken, campaignSlug: pending.campaignSlug }));
    } catch (e) {
      console.error('[facebook] Lỗi callback OAuth:', e);
      res.status(500).send(renderMessage('Có lỗi xảy ra', 'Vui lòng thử lại.'));
    }
  }));

  // Bước 3: chọn 1 Trang → tự đăng ký webhook + lưu kết nối
  app.post('/oauth/facebook/select', requireAdminAuth, route(async (req, res) => {
    const { pick, pageId } = req.body;
    const pending = pick && pendingPicks.get(pick);
    if (!pending) return res.status(400).send(renderMessage('Phiên hết hạn', 'Vui lòng kết nối lại từ đầu.'));
    pendingPicks.delete(pick);

    const page = pending.pages.find((p) => String(p.id) === String(pageId));
    if (!page) return res.status(400).send(renderMessage('Không tìm thấy Trang', 'Vui lòng thử lại.'));

    try {
      // Tự đăng ký webhook cho Trang (thay vì bấm tay trong console Meta)
      const subUrl = new URL(`${GRAPH}/${page.id}/subscribed_apps`);
      subUrl.searchParams.set('subscribed_fields', 'messages,messaging_postbacks');
      subUrl.searchParams.set('access_token', page.access_token);
      const subRes = await fetch(subUrl, { method: 'POST' });
      const subData = await subRes.json();
      if (!subRes.ok || !subData.success) {
        console.error('[facebook] Đăng ký webhook lỗi:', subData);
        return res.status(400).send(renderMessage('Không đăng ký được webhook', JSON.stringify(subData.error || subData)));
      }

      await savePageConnection({
        pageId: page.id,
        pageName: page.name,
        pageAccessToken: page.access_token,
        campaignSlug: pending.campaignSlug,
      });
      await addPageIdToCampaign(pending.campaignSlug, page.id);

      res.redirect(`/studio/campaigns/${pending.campaignSlug}/edit?fbConnected=${encodeURIComponent(page.name)}`);
    } catch (e) {
      console.error('[facebook] Lỗi hoàn tất kết nối:', e);
      res.status(500).send(renderMessage('Có lỗi xảy ra', 'Vui lòng thử lại.'));
    }
  }));
}

function route(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

// ---------------------------------------------------------------------------
// HTML nhẹ, đồng bộ tông màu với Studio
// ---------------------------------------------------------------------------
const PAGE_STYLE = `
  :root{color-scheme:light;--bg:#f5f6f8;--surface:#fff;--text:#111318;--muted:#626873;--line:#e2e6ec;--brand:#ff5a0a;--brand-dark:#d9480f;--ink:#070707}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--text);font-family:Arial,Helvetica,sans-serif;line-height:1.5;display:flex;justify-content:center;padding:40px 16px}
  main{width:min(520px,100%)}
  h1{font-size:22px;margin:0 0 6px}
  p{color:var(--muted);margin:0 0 20px}
  .card{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:18px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;gap:12px}
  .card strong{display:block}
  .card span{color:var(--muted);font-size:13px}
  button{border:1px solid var(--brand);border-radius:8px;background:var(--brand);color:#fff;padding:9px 16px;font:inherit;font-weight:800;cursor:pointer}
  .back{display:inline-block;margin-top:16px;color:var(--brand-dark);font-weight:700;text-decoration:none}
`;

function renderPickerPage({ pages, pickToken, campaignSlug }) {
  const items = pages
    .map(
      (p) => `
      <form class="card" method="post" action="/oauth/facebook/select">
        <input type="hidden" name="pick" value="${escapeHtml(pickToken)}">
        <input type="hidden" name="pageId" value="${escapeHtml(p.id)}">
        <div><strong>${escapeHtml(p.name)}</strong><span>ID: ${escapeHtml(p.id)}</span></div>
        <button type="submit">Kết nối</button>
      </form>`
    )
    .join('');

  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Chọn Trang Facebook</title><style>${PAGE_STYLE}</style></head>
<body><main>
  <h1>Chọn Trang để kết nối</h1>
  <p>Chọn Trang Facebook muốn gắn với campaign <strong>${escapeHtml(campaignSlug)}</strong>. Hệ thống sẽ tự đăng ký webhook cho Trang này.</p>
  ${items}
  <a class="back" href="/studio/campaigns/${escapeHtml(campaignSlug)}/edit">← Huỷ, quay lại</a>
</main></body></html>`;
}

function renderMessage(title, detail) {
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title><style>${PAGE_STYLE}</style></head>
<body><main>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(String(detail || ''))}</p>
  <a class="back" href="/studio">← Quay lại Campaigns</a>
</main></body></html>`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
