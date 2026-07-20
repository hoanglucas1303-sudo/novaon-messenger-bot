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
  console.log('[db] Bảng leads sẵn sàng ✅');
}

export async function createLead({ pageId, senderId, lead, conversation }) {
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

  const result = await db.query(
    `
      INSERT INTO leads (
        page_id,
        sender_id,
        customer_name,
        phone,
        product_interest,
        note,
        conversation
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      RETURNING *
    `,
    [
      pageId || null,
      senderId,
      normalized.customerName || null,
      normalized.phone,
      normalized.productInterest || null,
      normalized.note || null,
      JSON.stringify(conversation || []),
    ]
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
