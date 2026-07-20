import { config } from './config.js';
import { requireAdminAuth } from './auth.js';
import { getLead, hasDatabase, listLeads, updateLeadStatus } from './db.js';

export function mountDashboard(app) {
  app.get('/leads/demo', (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : 'all';
    res.type('html').send(
      renderPage({
        title: 'Demo Leads',
        body: renderLeadList(filterDemoLeads(status), status, { basePath: '/leads/demo', demo: true }),
      })
    );
  });

  app.get('/leads/demo/:id', (req, res) => {
    const lead = demoLeads.find((item) => String(item.id) === String(req.params.id));
    if (!lead) return res.status(404).type('html').send(renderPage({ title: 'Không tìm thấy lead demo', body: '<p>Lead demo không tồn tại.</p>' }));
    res.type('html').send(
      renderPage({
        title: `Demo Lead #${lead.id}`,
        body: renderLeadDetail(lead, { basePath: '/leads/demo', canEdit: false, demo: true }),
      })
    );
  });

  app.get('/leads', requireAdminAuth, route(async (req, res) => {
    if (!ensureDashboardReady(res)) return;
    const status = typeof req.query.status === 'string' ? req.query.status : 'all';
    const leads = await listLeads({ status });
    res.type('html').send(renderPage({ title: 'Leads', body: renderLeadList(leads, status) }));
  }));

  app.get('/leads/:id', requireAdminAuth, route(async (req, res) => {
    if (!ensureDashboardReady(res)) return;
    const lead = await getLead(req.params.id);
    if (!lead) return res.status(404).type('html').send(renderPage({ title: 'Không tìm thấy lead', body: '<p>Lead không tồn tại.</p>' }));
    res.type('html').send(renderPage({ title: `Lead #${lead.id}`, body: renderLeadDetail(lead) }));
  }));

  app.post('/leads/:id/status', requireAdminAuth, route(async (req, res) => {
    if (!ensureDashboardReady(res)) return;
    try {
      await updateLeadStatus(req.params.id, req.body.status);
    } catch {
      return res.status(400).send('Invalid status');
    }
    res.redirect(`/leads/${req.params.id}`);
  }));
}

const demoLeads = [
  {
    id: 1001,
    customer_name: 'Anh Minh',
    phone: '09xx xxx 128',
    product_interest: 'Đệm bông ép Sông Hồng 1m6',
    note: 'Cần tư vấn loại nằm chắc lưng, hỏi thêm khuyến mại và thời gian giao hàng.',
    status: 'new',
    sender_id: 'demo_psid_1001',
    created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    conversation: [
      { role: 'user', content: 'Nhà mình muốn mua đệm bông ép 1m6, có mẫu nào nằm chắc lưng không?' },
      { role: 'assistant', content: 'Dạ với nhu cầu nằm chắc lưng, anh/chị có thể tham khảo đệm bông ép Sông Hồng ạ. Dòng này phẳng, êm vừa và gấp gọn tiện lợi.' },
      { role: 'user', content: 'Gọi mình tư vấn nhé, số 09xx xxx 128.' },
      { role: 'assistant', content: 'Dạ em đã ghi nhận thông tin, bộ phận tư vấn sẽ liên hệ hỗ trợ anh/chị ạ.' },
    ],
  },
  {
    id: 1002,
    customer_name: 'Chị Hằng',
    phone: '08xx xxx 642',
    product_interest: 'Back Essential',
    note: 'Quan tâm dòng cao cấp, ưu tiên giảm đau lưng, giường 1m8.',
    status: 'new',
    sender_id: 'demo_psid_1002',
    created_at: new Date(Date.now() - 1000 * 60 * 53).toISOString(),
    conversation: [
      { role: 'user', content: 'Mình hay đau lưng, muốn xem dòng cao cấp hơn.' },
      { role: 'assistant', content: 'Dạ anh/chị có thể xem dòng Back Essential, có foam và memory foam để nâng đỡ cột sống tốt hơn ạ.' },
      { role: 'user', content: 'Mình nằm giường 1m8, để nhân viên gọi lại giúp.' },
      { role: 'assistant', content: 'Dạ anh/chị cho em xin số điện thoại để bộ phận tư vấn liên hệ hỗ trợ kỹ hơn ạ.' },
    ],
  },
  {
    id: 1003,
    customer_name: 'Chưa có tên',
    phone: '03xx xxx 905',
    product_interest: 'Chăn ga gối Sông Hồng',
    note: 'Muốn mua đồng bộ với đệm, hỏi mẫu cotton và màu sáng.',
    status: 'contacted',
    sender_id: 'demo_psid_1003',
    created_at: new Date(Date.now() - 1000 * 60 * 130).toISOString(),
    conversation: [
      { role: 'user', content: 'Có bộ chăn ga gối màu sáng không shop?' },
      { role: 'assistant', content: 'Dạ Sông Hồng có nhiều bộ chăn ga gối cotton mềm, phù hợp phối đồng bộ với đệm ạ.' },
      { role: 'user', content: 'Số mình 03xx xxx 905, tư vấn mẫu giúp.' },
      { role: 'assistant', content: 'Dạ em ghi nhận rồi ạ, nhân viên tư vấn sẽ liên hệ anh/chị để hỗ trợ chọn mẫu phù hợp.' },
    ],
  },
];

function filterDemoLeads(status) {
  if (!status || status === 'all') return demoLeads;
  return demoLeads.filter((lead) => lead.status === status);
}

function route(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function ensureDashboardReady(res) {
  if (!hasDatabase()) {
    res.status(503).type('html').send(
      renderPage({
        title: 'Chưa có DATABASE_URL',
        body: `
          <section class="empty">
            <h2>Chưa kết nối DB</h2>
            <p>Đặt <code>DATABASE_URL</code> từ Railway Postgres để bắt đầu lưu và xem lead.</p>
          </section>
        `,
      })
    );
    return false;
  }

  return true;
}

function renderLeadList(leads, status, options = {}) {
  const basePath = options.basePath || '/leads';
  const rows = leads
    .map(
      (lead) => `
        <tr>
          <td><a href="${basePath}/${lead.id}">#${lead.id}</a></td>
          <td>${escapeHtml(lead.customer_name || 'Chưa có tên')}</td>
          <td>${escapeHtml(lead.phone)}</td>
          <td>${escapeHtml(lead.product_interest || '')}</td>
          <td><span class="status ${lead.status}">${statusLabel(lead.status)}</span></td>
          <td>${formatDate(lead.created_at)}</td>
        </tr>
      `
    )
    .join('');

  return `
    <header class="topbar">
      <div>
        <h1>${options.demo ? 'Lead Messenger Demo' : 'Lead Messenger'}</h1>
        <p>${leads.length} lead gần nhất${options.demo ? ' - dữ liệu mẫu' : ''}</p>
      </div>
      <nav>
        ${filterLink('all', 'Tất cả', status, basePath)}
        ${filterLink('new', 'Mới', status, basePath)}
        ${filterLink('contacted', 'Đã liên hệ', status, basePath)}
      </nav>
    </header>

    ${
      leads.length
        ? `
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên</th>
                <th>SĐT</th>
                <th>Sản phẩm</th>
                <th>Trạng thái</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `
        : '<section class="empty"><h2>Chưa có lead</h2><p>Khi khách để lại SĐT trên Messenger, lead sẽ hiện ở đây.</p></section>'
    }
  `;
}

function renderLeadDetail(lead, options = {}) {
  const basePath = options.basePath || '/leads';
  const canEdit = options.canEdit !== false;
  const conversation = Array.isArray(lead.conversation) ? lead.conversation : [];
  return `
    <header class="topbar">
      <div>
        <a class="back" href="${basePath}">Quay lại danh sách</a>
        <h1>${options.demo ? 'Demo lead' : 'Lead'} #${lead.id}</h1>
        <p>${formatDate(lead.created_at)}${options.demo ? ' - dữ liệu mẫu' : ''}</p>
      </div>
      ${
        canEdit
          ? `
            <form method="post" action="${basePath}/${lead.id}/status">
              <select name="status">
                <option value="new" ${lead.status === 'new' ? 'selected' : ''}>Mới</option>
                <option value="contacted" ${lead.status === 'contacted' ? 'selected' : ''}>Sale đã liên hệ</option>
              </select>
              <button type="submit">Lưu</button>
            </form>
          `
          : `<span class="status ${lead.status}">${statusLabel(lead.status)}</span>`
      }
    </header>

    <section class="detail">
      <dl>
        <div><dt>Tên</dt><dd>${escapeHtml(lead.customer_name || 'Chưa có')}</dd></div>
        <div><dt>SĐT</dt><dd>${escapeHtml(lead.phone)}</dd></div>
        <div><dt>Sản phẩm quan tâm</dt><dd>${escapeHtml(lead.product_interest || 'Chưa rõ')}</dd></div>
        <div><dt>Nhu cầu/Ghi chú</dt><dd>${escapeHtml(lead.note || 'Chưa có')}</dd></div>
        <div><dt>Sender ID</dt><dd>${escapeHtml(lead.sender_id)}</dd></div>
      </dl>
    </section>

    <section>
      <h2>Ngữ cảnh hội thoại</h2>
      <div class="conversation">
        ${
          conversation.length
            ? conversation.map(renderMessage).join('')
            : '<p class="muted">Chưa có ngữ cảnh.</p>'
        }
      </div>
    </section>
  `;
}

function renderMessage(message) {
  const role = message.role === 'assistant' ? 'Bot' : 'Khách';
  return `
    <article class="message ${message.role}">
      <strong>${role}</strong>
      <p>${escapeHtml(message.content || '')}</p>
    </article>
  `;
}

function renderPage({ title, body }) {
  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} · Novaon Messenger Bot</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f6f7f9;
        --surface: #ffffff;
        --text: #17202a;
        --muted: #667085;
        --line: #d7dde5;
        --brand: #0f766e;
        --brand-strong: #115e59;
        --warning: #9a3412;
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family: Arial, Helvetica, sans-serif;
        line-height: 1.5;
      }
      main {
        width: min(1120px, calc(100% - 32px));
        margin: 32px auto;
      }
      .topbar {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 20px;
      }
      h1, h2, p { margin: 0; }
      h1 { font-size: 28px; line-height: 1.2; }
      h2 { font-size: 18px; margin-bottom: 12px; }
      .topbar p, .muted { color: var(--muted); }
      nav {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      a {
        color: var(--brand-strong);
        text-decoration: none;
        font-weight: 700;
      }
      nav a, button, select {
        border: 1px solid var(--line);
        border-radius: 6px;
        background: var(--surface);
        color: var(--text);
        min-height: 38px;
        padding: 8px 12px;
        font: inherit;
      }
      nav a.active, button {
        border-color: var(--brand);
        background: var(--brand);
        color: #fff;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 8px;
        overflow: hidden;
      }
      th, td {
        padding: 12px 14px;
        border-bottom: 1px solid var(--line);
        text-align: left;
        vertical-align: top;
      }
      th {
        color: var(--muted);
        font-size: 13px;
        font-weight: 700;
      }
      tr:last-child td { border-bottom: 0; }
      .status {
        display: inline-flex;
        border-radius: 999px;
        padding: 3px 10px;
        font-size: 13px;
        font-weight: 700;
        background: #e6f4f1;
        color: var(--brand-strong);
      }
      .status.contacted {
        background: #f2f4f7;
        color: #344054;
      }
      .empty, .detail, section {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 18px;
        margin-bottom: 18px;
      }
      .back {
        display: inline-block;
        margin-bottom: 10px;
      }
      form {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      dl {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
        margin: 0;
      }
      dt {
        color: var(--muted);
        font-size: 13px;
        font-weight: 700;
      }
      dd {
        margin: 4px 0 0;
        overflow-wrap: anywhere;
      }
      .conversation {
        display: grid;
        gap: 10px;
      }
      .message {
        border-left: 3px solid var(--line);
        padding: 10px 12px;
        background: #fafafa;
      }
      .message.assistant {
        border-left-color: var(--brand);
      }
      .message p {
        margin-top: 4px;
        white-space: pre-wrap;
      }
      code {
        background: #eef2f6;
        padding: 2px 5px;
        border-radius: 4px;
      }
      @media (max-width: 720px) {
        main { width: min(100% - 20px, 1120px); margin: 20px auto; }
        .topbar { align-items: flex-start; flex-direction: column; }
        table { display: block; overflow-x: auto; }
        dl { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <main>${body}</main>
  </body>
</html>`;
}

function filterLink(value, label, current, basePath = '/leads') {
  const active = current === value || (!current && value === 'all') ? 'active' : '';
  return `<a class="${active}" href="${basePath}?status=${value}">${label}</a>`;
}

function statusLabel(status) {
  if (status === 'contacted') return 'Đã liên hệ';
  return 'Mới';
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
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
