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
  if (config.dashboardPassword) return true;
  res.status(503).type('html').send(
    renderPage({
      title: 'Dashboard đang khóa',
      body: `
        <section class="empty">
          <h1>Dashboard đang khóa</h1>
          <p>Đặt <code>DASHBOARD_PASSWORD</code> để mở dashboard thật. Có thể xem bản demo tại <a href="/dashboard/demo">/dashboard/demo</a>.</p>
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
      <header class="hero">
        <div>
          <p class="eyebrow">Novaon Bot Platform${demo ? ' Demo' : ''}</p>
          <h1>Dashboard vận hành chatbot</h1>
          <p>Quản lý dự án, bật chat demo, cập nhật knowledge, import tài liệu và theo dõi lead trong một màn.</p>
        </div>
        <div class="hero-actions">
          <a class="button secondary" href="/studio/import${demo ? '/demo' : ''}">Import tài liệu</a>
          <a class="button" href="/studio/campaigns/new">Tạo dự án</a>
        </div>
      </header>

      ${saved ? '<p class="notice">Đã cập nhật knowledge cho campaign.</p>' : ''}

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
        --bg: #f4f6f8;
        --surface: #ffffff;
        --text: #17202a;
        --muted: #667085;
        --line: #d7dde5;
        --brand: #0f766e;
        --brand-dark: #115e59;
        --soft: #e6f4f1;
      }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--bg); color: var(--text); font-family: Arial, Helvetica, sans-serif; line-height: 1.5; }
      main { width: min(1240px, calc(100% - 32px)); margin: 28px auto 56px; }
      h1, h2, h3, p { margin: 0; }
      h1 { font-size: 30px; line-height: 1.2; }
      h2 { font-size: 20px; }
      h3 { font-size: 16px; }
      a { color: var(--brand-dark); font-weight: 700; text-decoration: none; }
      code { background: #eef2f6; border-radius: 4px; padding: 2px 5px; }
      .hero, section, .stat, .empty { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; }
      .hero { display: flex; justify-content: space-between; align-items: flex-end; gap: 18px; padding: 22px; margin-bottom: 16px; }
      .hero p { color: var(--muted); margin-top: 6px; max-width: 760px; }
      .eyebrow { color: var(--brand-dark) !important; font-weight: 700; margin-bottom: 6px; }
      .hero-actions, .row-actions, .section-head, .form-head { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
      .section-head, .form-head { justify-content: space-between; margin-bottom: 14px; }
      .section-head p, .form-head p, .muted, td span { color: var(--muted); }
      .button, button { display: inline-flex; align-items: center; justify-content: center; min-height: 40px; border: 1px solid var(--brand); border-radius: 6px; background: var(--brand); color: #fff; padding: 9px 14px; font: inherit; font-weight: 700; cursor: pointer; }
      .button.secondary { background: var(--surface); color: var(--brand-dark); border-color: var(--line); }
      .button.small { min-height: 32px; padding: 6px 9px; font-size: 13px; }
      .stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; background: transparent; border: 0; margin-bottom: 16px; }
      .stat { padding: 16px; }
      .stat strong { display: block; font-size: 28px; line-height: 1; margin-bottom: 6px; }
      .stat span { color: var(--muted); font-weight: 700; }
      section { padding: 18px; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; overflow: hidden; }
      th, td { padding: 12px 10px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
      th { color: var(--muted); font-size: 13px; }
      tr:last-child td { border-bottom: 0; }
      tr.selected td { background: #f8fbfb; }
      .pill { display: inline-flex; border-radius: 999px; padding: 3px 10px; background: #f2f4f7; color: #344054; font-size: 13px; font-weight: 700; }
      .pill.active { background: var(--soft); color: var(--brand-dark); }
      .knowledge-form { display: grid; gap: 14px; }
      label { display: grid; gap: 6px; color: var(--muted); font-size: 13px; font-weight: 700; }
      textarea { width: 100%; border: 1px solid var(--line); border-radius: 6px; padding: 10px 11px; color: var(--text); font: inherit; resize: vertical; }
      .notice { background: var(--soft); color: var(--brand-dark); border: 1px solid #a7d8d0; border-radius: 6px; padding: 10px 12px; margin-bottom: 16px; font-weight: 700; }
      .empty { padding: 18px; }
      .empty p { color: var(--muted); margin-top: 6px; }
      @media (max-width: 860px) {
        main { width: min(100% - 20px, 1240px); margin-top: 20px; }
        .hero, .section-head, .form-head { flex-direction: column; align-items: flex-start; }
        .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
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
