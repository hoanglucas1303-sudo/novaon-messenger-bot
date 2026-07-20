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
import { createLead } from './db.js';
import { generateReply } from './llm.js';

export function mountStudio(app) {
  app.get('/studio/demo', (_req, res) => {
    const campaign = defaultCampaign();
    res.type('html').send(
      renderStudioPage({
        title: 'Campaign Builder Demo',
        body: renderCampaignForm(campaign, {
          demo: true,
          action: '#',
          title: 'Campaign Builder Demo',
        }),
      })
    );
  });

  app.get('/studio', requireAdminAuth, route(async (_req, res) => {
    if (!ensureStudioUnlocked(res)) return;
    const campaigns = await listCampaigns();
    res.type('html').send(renderStudioPage({ title: 'Campaigns', body: renderCampaignList(campaigns) }));
  }));

  app.get('/studio/campaigns/new', requireAdminAuth, (req, res) => {
    if (!ensureStudioUnlocked(res)) return;
    res.type('html').send(
      renderStudioPage({
        title: 'Tạo chiến dịch',
        body: renderCampaignForm(defaultCampaign(), {
          action: '/studio/campaigns',
          title: 'Tạo chiến dịch chatbot',
        }),
      })
    );
  });

  app.post('/studio/campaigns', requireAdminAuth, route(async (req, res) => {
    if (!ensureStudioUnlocked(res)) return;
    const campaign = await saveCampaign(req.body);
    res.redirect(`/studio/campaigns/${campaign.id}/edit?saved=1`);
  }));

  app.get('/studio/campaigns/:id/edit', requireAdminAuth, route(async (req, res) => {
    if (!ensureStudioUnlocked(res)) return;
    const campaign = await getCampaignById(req.params.id);
    if (!campaign) return res.status(404).send('Campaign not found');
    res.type('html').send(
      renderStudioPage({
        title: campaign.name,
        body: renderCampaignForm(campaign, {
          action: '/studio/campaigns',
          title: `Cấu hình ${campaign.name}`,
          saved: req.query.saved === '1',
        }),
      })
    );
  }));

  app.get('/chat/:slug', route(async (req, res) => {
    const campaign = await getCampaignBySlug(req.params.slug);
    if (!campaign || !campaign.active) return res.status(404).send('Campaign not found');
    res.type('html').send(renderChatPage(campaign, normalizeModelMode(req.query.model)));
  }));

  app.post('/api/chat', route(async (req, res) => {
    const campaign = await getCampaignBySlug(req.body.campaignSlug);
    if (!campaign || !campaign.active) return res.status(404).json({ error: 'Campaign not found' });

    const sessionId = cleanSessionId(req.body.sessionId);
    const text = String(req.body.text || '').trim();
    if (!text) return res.status(400).json({ error: 'Missing text' });

    const result = await generateReply(sessionId, text, {
      campaign,
      conversationKey: `web:${campaign.slug}:${sessionId}`,
      modelMode: normalizeModelMode(req.body.modelMode),
    });

    if (result.lead) {
      await createLead({
        campaignId: campaign.slug,
        senderId: sessionId,
        channel: 'web',
        lead: result.lead,
        conversation: result.conversation,
      });
    }

    res.json({
      text: result.text,
      images: result.images,
      leadCaptured: Boolean(result.lead),
      model: result.model,
      modelTier: result.modelTier,
    });
  }));
}

function route(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function ensureStudioUnlocked(res) {
  if (!config.dashboardLocked || config.dashboardPassword) return true;
  res.status(503).type('html').send(
    renderStudioPage({
      title: 'Studio đang khóa',
      body: `
        <section class="empty">
          <h1>Studio đang khóa</h1>
          <p>Đặt <code>DASHBOARD_LOCKED=true</code> và <code>DASHBOARD_PASSWORD</code> để mở Campaign Builder có khóa. Có thể xem bản demo tại <a href="/studio/demo">/studio/demo</a> và test web chat tại <a href="/chat/song-hong-demo">/chat/song-hong-demo</a>.</p>
        </section>
      `,
    })
  );
  return false;
}

function renderCampaignList(campaigns) {
  const rows = campaigns
    .map(
      (campaign) => `
        <tr>
          <td><a href="/studio/campaigns/${campaign.id}/edit">${escapeHtml(campaign.name)}</a></td>
          <td>${escapeHtml(campaign.slug)}</td>
          <td>${escapeHtml(campaign.brand_name || '')}</td>
          <td>${campaign.page_ids.map(escapeHtml).join('<br>')}</td>
          <td><span class="pill ${campaign.active ? 'active' : ''}">${campaign.active ? 'Active' : 'Off'}</span></td>
          <td><a href="/chat/${campaign.slug}">Web test</a></td>
        </tr>
      `
    )
    .join('');

  return `
    <nav class="app-nav">
      <a class="brand-mark" href="/dashboard"><span>ST</span> Bot Studio</a>
      <div class="nav-links">
        <a href="/dashboard">Dashboard</a>
        <a href="/studio/import">Import</a>
        <a href="/chat/song-hong-demo?model=auto" target="_blank" rel="noreferrer">Chat demo</a>
      </div>
    </nav>
    <header class="topbar">
      <div>
        <h1>Campaign Builder</h1>
        <p>Tạo campaign, nạp hướng dẫn chatbot và test đa kênh. Mỗi campaign là một bộ não riêng cho một dự án/client.</p>
      </div>
      <div class="actions">
        <a class="button secondary" href="/studio/import">Import tài liệu</a>
        <a class="button" href="/studio/campaigns/new">Tạo campaign</a>
      </div>
    </header>
    <section class="help-strip">
      <article><strong>1. Tạo campaign</strong><span>Đặt tên, slug và brand/client.</span></article>
      <article><strong>2. Nạp brain</strong><span>Persona, rules, knowledge và catalog.</span></article>
      <article><strong>3. Gắn kênh</strong><span>Page ID Messenger hoặc web chat/LDP.</span></article>
    </section>
    <section>
      <div class="section-title">
        <h2>Danh sách campaign</h2>
        <p>Chọn một campaign để sửa cấu hình hoặc mở web chat test.</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Campaign</th>
            <th>Slug</th>
            <th>Brand</th>
            <th>Page ID</th>
            <th>Trạng thái</th>
            <th>Test</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  `;
}

function renderCampaignForm(campaign, options = {}) {
  const pageIds = campaign.page_ids.join('\n');
  return `
    <nav class="app-nav">
      <a class="brand-mark" href="/dashboard"><span>ST</span> Bot Studio</a>
      <div class="nav-links">
        <a href="/dashboard">Dashboard</a>
        <a href="/studio/import">Import</a>
        <a href="/studio">Campaigns</a>
      </div>
    </nav>
    <header class="topbar">
      <div>
        <a class="back" href="${options.demo ? '/studio' : '/studio'}">Campaigns</a>
        <h1>${escapeHtml(options.title || campaign.name)}</h1>
        <p>${options.demo ? 'Bản demo chỉ để xem GUI, không lưu thay đổi.' : 'Cấu hình brain dùng chung cho Messenger và Web Chat.'}</p>
      </div>
      <div class="actions">
        <a class="button secondary" href="/chat/${campaign.slug}">Mở web chat</a>
        ${
          options.demo
            ? ''
            : '<button class="button" type="submit" form="campaign-form">Lưu campaign</button>'
        }
      </div>
    </header>
    ${options.saved ? '<p class="notice">Đã lưu campaign.</p>' : ''}
    <section class="help-strip">
      <article><strong>Thông tin</strong><span>Định danh dự án và kênh Messenger.</span></article>
      <article><strong>Hành vi</strong><span>Persona + luật để kiểm soát giọng bot.</span></article>
      <article><strong>Dữ liệu</strong><span>Knowledge mềm và catalog sản phẩm/ảnh.</span></article>
    </section>
    <form id="campaign-form" class="editor" method="post" action="${options.action}">
      <input type="hidden" name="id" value="${escapeHtml(campaign.id || '')}">
      <section>
        <div class="section-title">
          <h2>Thông tin chiến dịch</h2>
          <p>Phần này quyết định campaign xuất hiện ở URL nào và map với fanpage nào.</p>
        </div>
        <div class="grid">
          <label>Tên campaign<input name="name" value="${escapeHtml(campaign.name)}"></label>
          <label>Slug public<input name="slug" value="${escapeHtml(campaign.slug)}"></label>
          <label>Brand / Client<input name="brandName" value="${escapeHtml(campaign.brand_name || '')}"></label>
          <label>Page ID Messenger<textarea name="pageIds" rows="3">${escapeHtml(pageIds)}</textarea></label>
        </div>
        <label class="checkbox"><input type="checkbox" name="active" ${campaign.active ? 'checked' : ''}> Active</label>
      </section>

      <section>
        <div class="section-title">
          <h2>Persona chatbot</h2>
          <p>Định nghĩa bot là ai, xưng hô thế nào, được làm gì và không được làm gì.</p>
        </div>
        <textarea name="persona" rows="8">${escapeHtml(campaign.persona)}</textarea>
      </section>

      <section>
        <div class="section-title">
          <h2>Luật trả lời</h2>
          <p>Rules càng rõ thì bot càng ít bịa, đặc biệt với giá, khuyến mại và lead.</p>
        </div>
        <textarea name="rules" rows="8">${escapeHtml(campaign.rules)}</textarea>
      </section>

      <section>
        <div class="section-title">
          <h2>Tài liệu / hướng dẫn thêm</h2>
          <p>FAQ, chính sách, script tư vấn và các ghi chú mềm chưa nằm trong catalog.</p>
        </div>
        <textarea name="knowledge" rows="8">${escapeHtml(campaign.knowledge || '')}</textarea>
      </section>

      <section>
        <div class="section-title">
          <h2>Catalog sản phẩm JSON</h2>
          <p>Mỗi sản phẩm có mô tả, giá theo biến thể và ảnh. Có thể dùng Import Center để tạo draft thay vì nhập tay.</p>
        </div>
        <textarea name="products" rows="14" spellcheck="false">${escapeHtml(productsTextarea(campaign))}</textarea>
      </section>
    </form>
  `;
}

function renderStudioPage({ title, body }) {
  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} · Novaon Bot Studio</title>
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
        --teal-soft: #e6f4f1;
      }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--bg); color: var(--text); font-family: Arial, Helvetica, sans-serif; line-height: 1.5; }
      main { width: min(1180px, calc(100% - 32px)); margin: 20px auto 56px; }
      h1, h2, p { margin: 0; }
      h1 { font-size: clamp(34px, 5vw, 56px); line-height: 1.02; }
      h2 { font-size: 20px; }
      a { color: var(--brand-dark); font-weight: 700; text-decoration: none; }
      .app-nav { height: 64px; display: flex; align-items: center; justify-content: space-between; gap: 18px; }
      .brand-mark { display: inline-flex; align-items: center; gap: 10px; color: var(--text); }
      .brand-mark span { display: inline-grid; place-items: center; width: 34px; height: 34px; border-radius: 8px; background: var(--ink); color: #fff; font-size: 13px; }
      .nav-links { display: flex; gap: 18px; flex-wrap: wrap; font-size: 14px; }
      .nav-links a { color: var(--muted); }
      .topbar {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 16px;
        margin-bottom: 16px;
        padding: 34px;
        border-radius: 8px;
        border: 1px solid #15171c;
        color: #fff;
        background:
          radial-gradient(65% 75% at 84% 115%, rgb(255 90 10 / .72), transparent 60%),
          linear-gradient(135deg, #070707 0%, #111318 58%, #201008 100%);
      }
      .topbar p { color: #d8dde6; margin-top: 10px; max-width: 760px; }
      .muted { color: var(--muted); }
      .actions { display: flex; gap: 10px; flex-wrap: wrap; }
      .button, button { display: inline-flex; align-items: center; justify-content: center; min-height: 42px; border: 1px solid var(--brand); border-radius: 8px; background: var(--brand); color: #fff; padding: 10px 14px; font: inherit; font-weight: 800; cursor: pointer; }
      .button.secondary { background: var(--surface); color: var(--brand-dark); border-color: var(--line); }
      .topbar .button.secondary { background: rgb(255 255 255 / .1); color: #fff; border-color: rgb(255 255 255 / .25); }
      .back { display: inline-block; margin-bottom: 8px; }
      .notice { background: #fff1e8; color: var(--brand-dark); border: 1px solid #ffd1b8; border-radius: 8px; padding: 10px 12px; margin-bottom: 16px; font-weight: 800; }
      section, table { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; }
      section { padding: 20px; margin-bottom: 16px; }
      .section-title { margin-bottom: 14px; }
      .section-title p { color: var(--muted); margin-top: 4px; }
      .help-strip { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; background: transparent; border: 0; padding: 0; }
      .help-strip article { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 16px; }
      .help-strip strong { display: block; margin-bottom: 4px; }
      .help-strip span { color: var(--muted); }
      table { width: 100%; border-collapse: collapse; overflow: hidden; }
      th, td { padding: 12px 14px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
      th { color: var(--muted); font-size: 13px; }
      tr:last-child td { border-bottom: 0; }
      label { display: grid; gap: 6px; color: var(--muted); font-size: 13px; font-weight: 700; }
      input, textarea { width: 100%; border: 1px solid var(--line); border-radius: 6px; padding: 10px 11px; color: var(--text); font: inherit; background: #fff; }
      textarea { resize: vertical; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
      .checkbox { display: flex; align-items: center; gap: 8px; margin-top: 14px; }
      .checkbox input { width: auto; }
      .pill { display: inline-flex; border-radius: 999px; padding: 3px 10px; background: #f2f4f7; color: #344054; font-size: 13px; font-weight: 700; }
      .pill.active { background: var(--teal-soft); color: var(--teal); }
      .empty { padding: 22px; }
      code { background: #eef2f6; padding: 2px 5px; border-radius: 4px; }
      @media (max-width: 760px) {
        main { width: min(100% - 20px, 1180px); margin-top: 20px; }
        .app-nav { height: auto; align-items: flex-start; flex-direction: column; margin-bottom: 14px; }
        .topbar { flex-direction: column; align-items: flex-start; }
        .grid { grid-template-columns: 1fr; }
        .help-strip { grid-template-columns: 1fr; }
        table { display: block; overflow-x: auto; }
      }
    </style>
  </head>
  <body><main>${body}</main></body>
</html>`;
}

function renderChatPage(campaign, modelMode = 'auto') {
  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(campaign.name)} · Web Chat Test</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f5f7fa;
        --surface: #ffffff;
        --text: #17202a;
        --muted: #667085;
        --line: #d7dde5;
        --brand: #0f766e;
        --soft: #e6f4f1;
      }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; background: linear-gradient(135deg, #f5f7fa 0%, #fff7ed 100%); color: var(--text); font-family: Arial, Helvetica, sans-serif; }
      .shell { min-height: 100vh; display: grid; grid-template-rows: auto 1fr auto; width: min(940px, 100%); margin: 0 auto; background: var(--surface); border-left: 1px solid var(--line); border-right: 1px solid var(--line); }
      header { padding: 16px 18px; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; gap: 12px; align-items: center; background: #070707; color: #fff; }
      h1, p { margin: 0; }
      h1 { font-size: 20px; }
      header p { color: var(--muted); font-size: 14px; }
      header p { color: #cfd5df; }
      nav { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
      nav a { border: 1px solid var(--line); border-radius: 6px; color: var(--text); padding: 7px 10px; text-decoration: none; font-weight: 700; font-size: 13px; }
      nav a.active { border-color: var(--brand); background: var(--brand); color: #fff; }
      #messages { padding: 18px; overflow-y: auto; display: grid; align-content: start; gap: 12px; }
      .quick-start { border: 1px solid var(--line); border-radius: 8px; padding: 12px; background: #fbfcfd; }
      .quick-start strong { display: block; margin-bottom: 8px; }
      .prompt-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
      .prompt { min-height: 38px; border: 1px solid var(--line); border-radius: 8px; background: #fff; color: var(--text); padding: 8px 10px; text-align: left; font-size: 13px; font-weight: 700; cursor: pointer; }
      .prompt:hover { border-color: var(--brand); background: var(--soft); }
      .msg { max-width: 78%; border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere; }
      .user { justify-self: end; background: var(--brand); color: #fff; border-color: var(--brand); }
      .bot { justify-self: start; background: #fff; }
      .images { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; margin-top: 8px; }
      .images img { width: 100%; border: 1px solid var(--line); border-radius: 6px; display: block; }
      form { display: grid; grid-template-columns: 1fr auto; gap: 10px; padding: 14px; border-top: 1px solid var(--line); background: #fff; }
      input, button { min-height: 44px; border-radius: 6px; font: inherit; }
      input { border: 1px solid var(--line); padding: 0 12px; }
      button { border: 1px solid var(--brand); background: var(--brand); color: #fff; padding: 0 16px; font-weight: 700; cursor: pointer; }
      .lead { display: inline-flex; margin-top: 8px; border-radius: 999px; padding: 3px 9px; background: var(--soft); color: #115e59; font-size: 13px; font-weight: 700; }
      @media (max-width: 640px) {
        .shell { border: 0; }
        .msg { max-width: 90%; }
        .prompt-grid { grid-template-columns: 1fr; }
        header { flex-direction: column; align-items: flex-start; }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <header>
        <div>
          <h1>${escapeHtml(campaign.name)}</h1>
          <p>Web chat test · ${escapeHtml(campaign.brand_name || campaign.slug)} · model ${escapeHtml(modelMode)}</p>
        </div>
        <nav>
          <a class="${modelMode === 'auto' ? 'active' : ''}" href="/chat/${campaign.slug}?model=auto">Auto</a>
          <a class="${modelMode === 'haiku' ? 'active' : ''}" href="/chat/${campaign.slug}?model=haiku">Haiku</a>
          <a class="${modelMode === 'sonnet' ? 'active' : ''}" href="/chat/${campaign.slug}?model=sonnet">Sonnet</a>
        </nav>
      </header>
      <main id="messages">
        <section class="quick-start">
          <strong>Prompt test nhanh</strong>
          <div class="prompt-grid">
            <button class="prompt" type="button" data-prompt="Nhà mình giường 1m6, thích nằm chắc lưng, ngân sách tầm 3 triệu thì nên xem dòng nào?">Tư vấn theo nhu cầu</button>
            <button class="prompt" type="button" data-prompt="Đệm bông ép 160x200 dày 9cm giá bao nhiêu?">Hỏi giá theo size</button>
            <button class="prompt" type="button" data-prompt="Cho mình xem ảnh Back Essential.">Xin ảnh sản phẩm</button>
            <button class="prompt" type="button" data-prompt="Mình muốn mua đệm bông ép 1m6, gọi mình số 0912345678 nhé, mình tên Nam.">Test lead capture</button>
          </div>
        </section>
        <div class="msg bot">Dạ em chào anh/chị ạ. Anh/chị đang quan tâm sản phẩm hoặc nhu cầu nào để em tư vấn nhanh hơn?</div>
      </main>
      <form id="chat-form">
        <input id="message-input" autocomplete="off" placeholder="Nhập tin nhắn test...">
        <button type="submit">Gửi</button>
      </form>
    </div>
    <script>
      const campaignSlug = ${JSON.stringify(campaign.slug)};
      const modelMode = ${JSON.stringify(modelMode)};
      const sessionKey = 'novaon-chat-session-' + campaignSlug;
      let sessionId = localStorage.getItem(sessionKey);
      if (!sessionId) {
        sessionId = 'web_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(sessionKey, sessionId);
      }

      const messages = document.querySelector('#messages');
      const form = document.querySelector('#chat-form');
      const input = document.querySelector('#message-input');
      document.querySelectorAll('.prompt').forEach((button) => {
        button.addEventListener('click', () => {
          input.value = button.dataset.prompt || '';
          input.focus();
        });
      });

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        addMessage('user', text);
        const waiting = addMessage('bot', 'Đang soạn tin...');
        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaignSlug, sessionId, text, modelMode }),
          });
          const data = await res.json();
          waiting.remove();
          addMessage('bot', data.text || 'Dạ hệ thống đang bận một chút ạ.', data.images || [], data.leadCaptured, data.modelTier);
        } catch {
          waiting.remove();
          addMessage('bot', 'Dạ hệ thống đang bận một chút, anh/chị thử lại giúp em ạ.');
        }
      });

      function addMessage(role, text, images = [], leadCaptured = false, modelTier = '') {
        const item = document.createElement('div');
        item.className = 'msg ' + role;
        item.textContent = text;
        if (images.length) {
          const grid = document.createElement('div');
          grid.className = 'images';
          for (const url of images) {
            const img = document.createElement('img');
            img.src = url;
            img.alt = 'Ảnh sản phẩm';
            grid.appendChild(img);
          }
          item.appendChild(grid);
        }
        if (leadCaptured) {
          const badge = document.createElement('span');
          badge.className = 'lead';
          badge.textContent = 'Đã ghi nhận lead';
          item.appendChild(badge);
        }
        if (role === 'bot' && modelTier) {
          const model = document.createElement('span');
          model.className = 'lead';
          model.textContent = 'Model: ' + modelTier;
          item.appendChild(model);
        }
        messages.appendChild(item);
        messages.scrollTop = messages.scrollHeight;
        return item;
      }
    </script>
  </body>
</html>`;
}

function cleanSessionId(value) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 80) || `web_${Date.now()}`;
}

function normalizeModelMode(value) {
  const mode = String(value || 'auto').toLowerCase();
  if (mode === 'haiku' || mode === 'sonnet') return mode;
  return 'auto';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
