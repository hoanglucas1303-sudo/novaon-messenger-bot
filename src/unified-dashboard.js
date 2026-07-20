import { config } from './config.js';
import { requireAdminAuth } from './auth.js';
import {
  defaultCampaign,
  getCampaignById,
  getCampaignBySlug,
  listCampaigns,
  productsTextarea,
  saveCampaign,
} from './campaigns.js';
import { hasDatabase, listLeads } from './db.js';

const demoLeads = [
  {
    id: 1001,
    customer_name: 'Anh Minh',
    phone: '09xx xxx 128',
    product_interest: 'Đệm bông ép Sông Hồng 1m6',
    note: 'Cần tư vấn loại nằm chắc lưng, hỏi thêm khuyến mại và thời gian giao hàng.',
    status: 'new',
    channel: 'web',
    created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  },
  {
    id: 1002,
    customer_name: 'Chị Hằng',
    phone: '08xx xxx 642',
    product_interest: 'Back Essential',
    note: 'Quan tâm dòng cao cấp, ưu tiên giảm đau lưng, giường 1m8.',
    status: 'new',
    channel: 'messenger',
    created_at: new Date(Date.now() - 1000 * 60 * 53).toISOString(),
  },
  {
    id: 1003,
    customer_name: 'Chưa có tên',
    phone: '03xx xxx 905',
    product_interest: 'Chăn ga gối Sông Hồng',
    note: 'Muốn mua đồng bộ với đệm, hỏi mẫu cotton và màu sáng.',
    status: 'contacted',
    channel: 'web',
    created_at: new Date(Date.now() - 1000 * 60 * 130).toISOString(),
  },
];

export function mountUnifiedDashboard(app) {
  app.get('/dashboard/demo', (_req, res) => {
    const campaigns = [defaultCampaign()];
    const selected = campaigns[0];
    res.type('html').send(
      renderDashboard({
        title: 'Novaon Bot Platform Demo',
        campaigns,
        selected,
        leads: demoLeads,
        demo: true,
        dbReady: false,
        saved: false,
      })
    );
  });

  app.get('/dashboard', requireAdminAuth, route(async (req, res) => {
    if (!ensureDashboardUnlocked(res)) return;
    const campaigns = await listCampaigns();
    const selectedSlug = String(req.query.campaign || campaigns[0]?.slug || defaultCampaign().slug);
    const selected = (await getCampaignBySlug(selectedSlug)) || campaigns[0] || defaultCampaign();
    const leads = hasDatabase() ? await listLeads({ status: 'all' }) : [];

    res.type('html').send(
      renderDashboard({
        title: 'Novaon Bot Platform',
        campaigns,
        selected,
        leads,
        demo: false,
        dbReady: hasDatabase(),
        saved: req.query.saved === '1',
      })
    );
  }));

  app.post('/dashboard/campaigns/:id/knowledge', requireAdminAuth, route(async (req, res) => {
    if (!ensureDashboardUnlocked(res)) return;
    const campaign = await getCampaignById(req.params.id);
    if (!campaign) return res.status(404).send('Campaign not found');

    const saved = await saveCampaign({
      ...campaign,
      brandName: campaign.brand_name,
      pageIds: campaign.page_ids.join('\n'),
      knowledge: String(req.body.knowledge || '').trim(),
      rules: String(req.body.rules || '').trim(),
      products: productsTextarea(campaign),
      active: campaign.active ? 'on' : '',
    });

    res.redirect(`/dashboard?campaign=${saved.slug}&saved=1`);
  }));
}

function ensureDashboardUnlocked(res) {
  if (!config.dashboardLocked || config.dashboardPassword) return true;
  res.status(503).type('html').send(
    renderPage({
      title: 'Dashboard đang khóa',
      body: `
        <section class="empty">
          <h1>Dashboard đang khóa</h1>
          <p>Đặt <code>DASHBOARD_LOCKED=true</code> và <code>DASHBOARD_PASSWORD</code> để mở dashboard có khóa. Có thể xem bản demo tại <a href="/dashboard/demo">/dashboard/demo</a>.</p>
        </section>
      `,
    })
  );
  return false;
}

function renderDashboard({ title, campaigns, selected, leads, demo, dbReady, saved }) {
  const activeCount = campaigns.filter((campaign) => campaign.active).length;
  const newLeads = leads.filter((lead) => lead.status === 'new').length;
  return renderPage({
    title,
    body: `
      <nav class="app-nav">
        <a class="brand-mark" href="/dashboard">
          <span>NB</span>
          Novaon Bot Platform
        </a>
        <div class="nav-links">
          <a href="#projects">Dự án</a>
          <a href="#knowledge">Knowledge</a>
          <a href="#leads">Lead</a>
          <a href="/studio/import${demo ? '/demo' : ''}">Import</a>
        </div>
      </nav>
      <header class="hero">
        <div>
          <p class="eyebrow">Operations Dashboard${demo ? ' · Demo mode' : ''}</p>
          <h1>Dashboard vận hành chatbot</h1>
          <p>Thiết lập dự án, nạp tài liệu, test flow tư vấn và theo dõi lead trong một màn đủ rõ để người mới cũng biết bước tiếp theo.</p>
        </div>
        <div class="hero-actions">
          <a class="button secondary" href="/studio/import${demo ? '/demo' : ''}">Nạp tài liệu</a>
          <a class="button" href="/studio/campaigns/new">Tạo dự án mới</a>
        </div>
      </header>

      ${saved ? '<p class="notice">Đã cập nhật knowledge cho campaign.</p>' : ''}

      ${renderWorkflow(selected, demo, dbReady)}

      <section class="stats">
        ${statCard('Dự án', campaigns.length)}
        ${statCard('Đang active', activeCount)}
        ${statCard('Lead mới', newLeads)}
        ${statCard('Tổng lead', leads.length)}
      </section>

      <section id="projects">
        <div class="section-head">
          <div>
            <h2>Quản lý dự án</h2>
            <p>Campaign là brain dùng chung cho Messenger và web chat.</p>
          </div>
          <a class="button secondary" href="/studio">Mở Campaign Builder</a>
        </div>
        ${renderProjectsTable(campaigns, selected, demo)}
      </section>

      <section id="knowledge">
        <div class="section-head">
          <div>
            <h2>Update knowledge nhanh</h2>
            <p>Chỉnh rules và tài liệu mềm cho campaign đang chọn. Catalog sản phẩm vẫn sửa sâu trong Campaign Builder.</p>
          </div>
          <a class="button secondary" href="/studio/import${demo ? '/demo' : ''}">Convert tài liệu</a>
        </div>
        ${renderKnowledgePanel(selected, demo)}
      </section>

      <section id="leads">
        <div class="section-head">
          <div>
            <h2>Lead gần nhất</h2>
            <p>${dbReady || demo ? 'Theo dõi khách đã để lại thông tin từ Messenger và web chat.' : 'Cần DATABASE_URL để xem lead thật.'}</p>
          </div>
          <a class="button secondary" href="${demo ? '/leads/demo' : '/leads'}">Mở lead detail</a>
        </div>
        ${renderLeadTable(leads, { demo, dbReady })}
      </section>
    `,
  });
}

function renderProjectsTable(campaigns, selected, demo) {
  if (!campaigns.length) {
    return '<div class="empty"><h3>Chưa có dự án</h3><p>Tạo campaign đầu tiên để bắt đầu setup chatbot.</p></div>';
  }

  const rows = campaigns
    .map((campaign) => {
      const isSelected = campaign.slug === selected?.slug;
      return `
        <tr class="${isSelected ? 'selected' : ''}">
          <td>
            <strong>${escapeHtml(campaign.name)}</strong>
            <span>${escapeHtml(campaign.brand_name || campaign.slug)}</span>
          </td>
          <td><code>${escapeHtml(campaign.slug)}</code></td>
          <td>${campaign.page_ids.length ? campaign.page_ids.map(escapeHtml).join('<br>') : '<span class="muted">Chưa gắn Page ID</span>'}</td>
          <td>${campaign.products?.length || 0}</td>
          <td><span class="pill ${campaign.active ? 'active' : ''}">${campaign.active ? 'Active' : 'Off'}</span></td>
          <td>
            <div class="row-actions">
              <a class="button small" href="/chat/${campaign.slug}?model=auto" target="_blank" rel="noreferrer">Bật chat demo</a>
              <a class="button small secondary" href="${demo ? '/dashboard/demo' : `/dashboard?campaign=${campaign.slug}`}#knowledge">Update knowledge</a>
              <a class="button small secondary" href="/studio/campaigns/${campaign.id}/edit">Sửa full</a>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <table>
      <thead>
        <tr>
          <th>Dự án</th>
          <th>Slug</th>
          <th>Messenger Page</th>
          <th>SP</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderKnowledgePanel(campaign, demo) {
  if (!campaign) return '<div class="empty"><p>Chọn campaign để cập nhật knowledge.</p></div>';
  return `
    <form class="knowledge-form" method="post" action="${demo ? '#' : `/dashboard/campaigns/${campaign.id}/knowledge`}">
      <div class="form-head">
        <div>
          <h3>${escapeHtml(campaign.name)}</h3>
          <p><code>${escapeHtml(campaign.slug)}</code> · ${campaign.products?.length || 0} sản phẩm trong catalog</p>
        </div>
        <div class="row-actions">
          <a class="button secondary" href="/chat/${campaign.slug}?model=auto" target="_blank" rel="noreferrer">Test chat</a>
          <a class="button secondary" href="/studio/campaigns/${campaign.id}/edit">Sửa catalog</a>
          ${demo ? '' : '<button class="button" type="submit">Lưu knowledge</button>'}
        </div>
      </div>
      <label>Rules chatbot
        <textarea name="rules" rows="8">${escapeHtml(campaign.rules || '')}</textarea>
      </label>
      <label>Knowledge / tài liệu mềm
        <textarea name="knowledge" rows="10">${escapeHtml(campaign.knowledge || '')}</textarea>
      </label>
    </form>
  `;
}

function renderWorkflow(campaign, demo, dbReady) {
  const chatHref = campaign ? `/chat/${campaign.slug}?model=auto` : '/chat/song-hong-demo?model=auto';
  return `
    <section class="workflow">
      <article>
        <span class="step">1</span>
        <h3>Tạo hoặc chọn dự án</h3>
        <p>Campaign là bộ não dùng chung cho Messenger, web chat và LDP.</p>
        <a href="/studio">Mở Campaign Builder</a>
      </article>
      <article>
        <span class="step">2</span>
        <h3>Nạp knowledge</h3>
        <p>Dùng Import Center để convert tài liệu, bảng giá, FAQ thành draft data.</p>
        <a href="/studio/import${demo ? '/demo' : ''}?seed=initial-catalog">Dùng seed Sông Hồng</a>
      </article>
      <article>
        <span class="step">3</span>
        <h3>Test tư vấn</h3>
        <p>Chạy web chat để kiểm tra trả lời, gợi ý sản phẩm, ảnh và lead capture.</p>
        <a href="${chatHref}" target="_blank" rel="noreferrer">Bật chat demo</a>
      </article>
      <article>
        <span class="step">4</span>
        <h3>Theo dõi lead</h3>
        <p>${dbReady || demo ? 'Lead mới sẽ hiện ở đây để Sale tiếp nối.' : 'Gắn Railway Postgres để lưu lead thật.'}</p>
        <a href="${demo ? '/leads/demo' : '/leads'}">Mở lead board</a>
      </article>
    </section>
  `;
}

function renderLeadTable(leads, { demo, dbReady }) {
  if (!demo && !dbReady) {
    return `
      <div class="empty">
        <h3>Chưa kết nối DB</h3>
        <p>Đặt <code>DATABASE_URL</code> từ Railway Postgres để lưu và xem lead thật.</p>
      </div>
    `;
  }

  if (!leads.length) {
    return '<div class="empty"><h3>Chưa có lead</h3><p>Khi khách để lại SĐT, lead sẽ hiện ở đây.</p></div>';
  }

  const rows = leads
    .slice(0, 12)
    .map((lead) => `
      <tr>
        <td><a href="${demo ? `/leads/demo/${lead.id}` : `/leads/${lead.id}`}">#${lead.id}</a></td>
        <td>${escapeHtml(lead.customer_name || 'Chưa có tên')}</td>
        <td>${escapeHtml(lead.phone || '')}</td>
        <td>${escapeHtml(lead.product_interest || '')}</td>
        <td>${escapeHtml(lead.channel || 'messenger')}</td>
        <td><span class="pill ${lead.status === 'new' ? 'active' : ''}">${lead.status === 'new' ? 'Mới' : 'Đã liên hệ'}</span></td>
        <td>${formatDate(lead.created_at)}</td>
      </tr>
    `)
    .join('');

  return `
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Tên</th>
          <th>SĐT</th>
          <th>Sản phẩm</th>
          <th>Channel</th>
          <th>Status</th>
          <th>Thời gian</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function statCard(label, value) {
  return `
    <article class="stat">
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(label)}</span>
    </article>
  `;
}

function renderPage({ title, body }) {
  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} · Novaon Bot Platform</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f5f6f8;
        --surface: #ffffff;
        --text: #111318;
        --muted: #626873;
        --line: #e2e6ec;
        --brand: #ff5a0a;
        --brand-dark: #d9480f;
        --ink: #070707;
        --teal: #0f766e;
        --soft: #fff1e8;
        --teal-soft: #e6f4f1;
      }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--bg); color: var(--text); font-family: Arial, Helvetica, sans-serif; line-height: 1.5; }
      main { width: min(1180px, calc(100% - 32px)); margin: 20px auto 56px; }
      h1, h2, h3, p { margin: 0; }
      h1 { font-size: clamp(34px, 5vw, 58px); line-height: 1.02; max-width: 760px; }
      h2 { font-size: 22px; }
      h3 { font-size: 16px; }
      a { color: var(--brand-dark); font-weight: 700; text-decoration: none; }
      code { background: #eef2f6; border-radius: 4px; padding: 2px 5px; }
      .app-nav { height: 64px; display: flex; align-items: center; justify-content: space-between; gap: 18px; }
      .brand-mark { display: inline-flex; align-items: center; gap: 10px; color: var(--text); }
      .brand-mark span { display: inline-grid; place-items: center; width: 34px; height: 34px; border-radius: 8px; background: var(--ink); color: #fff; font-size: 13px; }
      .nav-links { display: flex; gap: 18px; flex-wrap: wrap; font-size: 14px; }
      .nav-links a { color: var(--muted); }
      .hero, section, .stat, .empty { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; }
      .hero {
        position: relative;
        overflow: hidden;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: end;
        gap: 24px;
        min-height: 300px;
        padding: 38px;
        margin-bottom: 16px;
        color: #fff;
        background:
          radial-gradient(70% 70% at 76% 120%, rgb(255 90 10 / .75), transparent 58%),
          linear-gradient(135deg, #070707 0%, #111318 58%, #201008 100%);
        border-color: #15171c;
      }
      .hero p { color: #d8dde6; margin-top: 12px; max-width: 720px; font-size: 17px; }
      .eyebrow { color: #ffb088 !important; font-weight: 800; margin-bottom: 10px; text-transform: uppercase; font-size: 12px; letter-spacing: .08em; }
      .hero-actions, .row-actions, .section-head, .form-head { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
      .section-head, .form-head { justify-content: space-between; margin-bottom: 14px; }
      .section-head p, .form-head p, .muted, td span { color: var(--muted); }
      .button, button { display: inline-flex; align-items: center; justify-content: center; min-height: 42px; border: 1px solid var(--brand); border-radius: 8px; background: var(--brand); color: #fff; padding: 10px 14px; font: inherit; font-weight: 800; cursor: pointer; }
      .button.secondary { background: var(--surface); color: var(--text); border-color: var(--line); }
      .hero .button.secondary { background: rgb(255 255 255 / .1); color: #fff; border-color: rgb(255 255 255 / .25); }
      .button.small { min-height: 32px; padding: 6px 9px; font-size: 13px; }
      .workflow { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; background: transparent; border: 0; padding: 0; margin-bottom: 16px; }
      .workflow article { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 16px; }
      .workflow h3 { margin: 12px 0 6px; }
      .workflow p { color: var(--muted); min-height: 64px; }
      .workflow a { display: inline-block; margin-top: 12px; }
      .step { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; background: var(--ink); color: #fff; font-weight: 800; }
      .stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0; background: var(--brand); border: 0; margin-bottom: 16px; overflow: hidden; }
      .stat { padding: 18px; background: transparent; border: 0; border-right: 1px solid rgb(255 255 255 / .25); color: #fff; }
      .stat:last-child { border-right: 0; }
      .stat strong { display: block; font-size: 28px; line-height: 1; margin-bottom: 6px; }
      .stat span { color: rgb(255 255 255 / .82); font-weight: 800; }
      section { padding: 20px; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; overflow: hidden; }
      th, td { padding: 12px 10px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
      th { color: var(--muted); font-size: 13px; }
      tr:last-child td { border-bottom: 0; }
      tr.selected td { background: #f8fbfb; }
      .pill { display: inline-flex; border-radius: 999px; padding: 3px 10px; background: #f2f4f7; color: #344054; font-size: 13px; font-weight: 700; }
      .pill.active { background: var(--teal-soft); color: var(--teal); }
      .knowledge-form { display: grid; gap: 14px; }
      label { display: grid; gap: 6px; color: var(--muted); font-size: 13px; font-weight: 700; }
      textarea { width: 100%; border: 1px solid var(--line); border-radius: 6px; padding: 10px 11px; color: var(--text); font: inherit; resize: vertical; }
      .notice { background: var(--soft); color: var(--brand-dark); border: 1px solid #ffd1b8; border-radius: 8px; padding: 10px 12px; margin-bottom: 16px; font-weight: 800; }
      .empty { padding: 18px; }
      .empty p { color: var(--muted); margin-top: 6px; }
      @media (max-width: 860px) {
        main { width: min(100% - 20px, 1240px); margin-top: 20px; }
        .app-nav { height: auto; align-items: flex-start; flex-direction: column; margin-bottom: 14px; }
        .hero { grid-template-columns: 1fr; min-height: auto; padding: 24px; }
        .section-head, .form-head { flex-direction: column; align-items: flex-start; }
        .workflow { grid-template-columns: 1fr; }
        .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .stat:nth-child(2) { border-right: 0; }
        table { display: block; overflow-x: auto; }
      }
    </style>
  </head>
  <body><main>${body}</main></body>
</html>`;
}

function route(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
