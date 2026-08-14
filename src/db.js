import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

let pool;

function getPool() {
  if (!config.databaseUrl) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

export function getDatabase() {
  return getPool();
}

export async function query(sql, params = []) {
  const db = getPool();
  if (!db) return null;
  return db.query(sql, params);
}

export function hasDatabase() {
  return Boolean(config.databaseUrl);
}

export async function initDatabase() {
  const db = getPool();
  if (!db) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT 'song-hong',
      campaign_id TEXT,
      page_id TEXT,
      sender_id TEXT NOT NULL,
      customer_name TEXT,
      phone TEXT NOT NULL,
      product_interest TEXT,
      note TEXT,
      source TEXT NOT NULL DEFAULT 'messenger',
      status TEXT NOT NULL DEFAULT 'new',
      conversation JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at DESC);
    CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (status);
    CREATE INDEX IF NOT EXISTS leads_sender_id_idx ON leads (sender_id);
  `);

  await db.query(`
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS campaign_id TEXT;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'messenger';
    CREATE INDEX IF NOT EXISTS leads_campaign_id_idx ON leads (campaign_id);
    CREATE INDEX IF NOT EXISTS leads_channel_idx ON leads (channel);
  `);

  // Lead là CHẮT LỌC từ 1 luồng chat, không phải sự kiện độc lập — "cha" của lead
  // luôn là luồng chat (conversation_key, định danh theo FB PSID/session). 1 luồng
  // chat chỉ tạo ra ĐÚNG 1 lead; khách nhắn lại nhiều lần / cung cấp lại SĐT chỉ
  // cập nhật lại cùng 1 dòng, không đẻ thêm lead mới (tránh trùng/spam khi báo Sale).
  // Index là PARTIAL (WHERE conversation_key IS NOT NULL) để lead cũ trước khi có
  // cột này (NULL) không bị vướng ràng buộc unique.
  await db.query(`
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS conversation_key TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS leads_conversation_key_idx
      ON leads (conversation_key) WHERE conversation_key IS NOT NULL;
  `);
  console.log('[db] Bảng leads sẵn sàng ✅');

  // Lịch sử hội thoại — lưu để sống sót qua redeploy (Railway build lại là RAM mất sạch).
  // RAM (llm.js) vẫn là cache chính lúc chạy, DB chỉ là nơi nạp lại lúc cold start.
  await db.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      conversation_key TEXT PRIMARY KEY,
      history JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('[db] Bảng conversations sẵn sàng ✅');
}

export async function loadConversation(conversationKey) {
  const db = getPool();
  if (!db) return null;
  const result = await db.query('SELECT history FROM conversations WHERE conversation_key = $1', [conversationKey]);
  return result.rows[0]?.history ?? null;
}

export async function saveConversation(conversationKey, history) {
  const db = getPool();
  if (!db) return;
  await db.query(
    `
      INSERT INTO conversations (conversation_key, history, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (conversation_key) DO UPDATE SET history = EXCLUDED.history, updated_at = NOW()
    `,
    [conversationKey, JSON.stringify(history || [])]
  );
}

export async function createLead({ campaignId, pageId, senderId, channel = 'messenger', conversationKey, lead, conversation }) {
  const normalized = normalizeLead(lead);
  if (!normalized.phone) {
    console.warn('[lead] Bỏ qua lead vì thiếu số điện thoại:', lead);
    return null;
  }

  const db = getPool();
  if (!db) {
    console.log('[lead] DATABASE_URL chưa có, lead chỉ log:', normalized);
    return null;
  }

  // Lead là chắt lọc từ 1 luồng chat (conversation_key = cha) — cùng luồng nhắn
  // lại nhiều lần chỉ cập nhật lại đúng 1 dòng, không đẻ thêm lead trùng.
  // Không có conversationKey (gọi cũ/thiếu) thì vẫn ghi được nhưng mất khả năng
  // dedupe cho lần đó — INSERT thường, không upsert.
  const params = [
    campaignId || null,
    pageId || null,
    senderId,
    channel,
    normalized.customerName || null,
    normalized.phone,
    normalized.productInterest || null,
    normalized.note || null,
    JSON.stringify(conversation || []),
    conversationKey || null,
  ];

  const result = await db.query(
    `
      INSERT INTO leads (
        campaign_id, page_id, sender_id, channel,
        customer_name, phone, product_interest, note, conversation, conversation_key
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
      ON CONFLICT (conversation_key) WHERE conversation_key IS NOT NULL DO UPDATE SET
        customer_name = EXCLUDED.customer_name,
        phone = EXCLUDED.phone,
        product_interest = EXCLUDED.product_interest,
        note = EXCLUDED.note,
        conversation = EXCLUDED.conversation,
        channel = EXCLUDED.channel,
        page_id = EXCLUDED.page_id,
        updated_at = NOW()
      RETURNING *, (xmax = 0) AS is_new_lead
    `,
    params
  );

  return result.rows[0];
}

export async function listLeads({ status } = {}) {
  const db = getPool();
  if (!db) return [];

  if (status && status !== 'all') {
    const result = await db.query(
      'SELECT * FROM leads WHERE status = $1 ORDER BY created_at DESC LIMIT 200',
      [status]
    );
    return result.rows;
  }

  const result = await db.query('SELECT * FROM leads ORDER BY created_at DESC LIMIT 200');
  return result.rows;
}

export async function getLead(id) {
  const db = getPool();
  if (!db) return null;

  const result = await db.query('SELECT * FROM leads WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function updateLeadStatus(id, status) {
  const allowed = new Set(['new', 'contacted']);
  if (!allowed.has(status)) throw new Error(`Invalid lead status: ${status}`);

  const db = getPool();
  if (!db) return null;

  const result = await db.query(
    'UPDATE leads SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
    [id, status]
  );
  return result.rows[0] || null;
}

function normalizeLead(lead = {}) {
  return {
    customerName: cleanText(lead.customerName || lead.name || lead.ten),
    phone: cleanPhone(lead.phone || lead.sdt || lead.so_dien_thoai),
    productInterest: cleanText(lead.productInterest || lead.product || lead.san_pham_quan_tam),
    note: cleanText(lead.note || lead.need || lead.ghi_chu),
  };
}

function cleanText(value) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 500);
}

function cleanPhone(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  const text = String(value).trim();
  const digits = text.replace(/[^\d+]/g, '');
  if (digits.replace(/\D/g, '').length < 8) return '';
  return digits.slice(0, 24);
}
