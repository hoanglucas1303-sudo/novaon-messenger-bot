import { query } from './db.js';
import { brand, products as defaultProducts } from './knowledge.js';

const DEFAULT_PAGE_ID = '1220791817792373';
const DEFAULT_CAMPAIGN_SLUG = 'song-hong-demo';

const memoryCampaigns = new Map();

export function defaultCampaign() {
  return normalizeCampaign({
    id: 'default',
    slug: DEFAULT_CAMPAIGN_SLUG,
    name: 'Sông Hồng Demo',
    brand_name: brand.name,
    persona: brand.persona,
    rules: brand.rules.join('\n'),
    knowledge:
      'Chiến dịch demo tư vấn sản phẩm Đệm Sông Hồng. Bot có nhiệm vụ tư vấn, gợi mở nhu cầu và ghi nhận thông tin liên hệ cho Sale.',
    products: defaultProducts,
    page_ids: [DEFAULT_PAGE_ID],
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

export async function initCampaignStore() {
  const result = await query(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id BIGSERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      brand_name TEXT,
      persona TEXT NOT NULL,
      rules TEXT NOT NULL DEFAULT '',
      knowledge TEXT NOT NULL DEFAULT '',
      products JSONB NOT NULL DEFAULT '[]'::jsonb,
      page_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS campaigns_slug_idx ON campaigns (slug);
    CREATE INDEX IF NOT EXISTS campaigns_active_idx ON campaigns (active);
    CREATE INDEX IF NOT EXISTS campaigns_page_ids_idx ON campaigns USING GIN (page_ids);
  `);

  if (!result) {
    seedMemoryCampaigns();
    return;
  }

  await query(
    `
      INSERT INTO campaigns (
        slug,
        name,
        brand_name,
        persona,
        rules,
        knowledge,
        products,
        page_ids,
        active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, TRUE)
      ON CONFLICT (slug) DO NOTHING
    `,
    [
      DEFAULT_CAMPAIGN_SLUG,
      'Sông Hồng Demo',
      brand.name,
      brand.persona,
      brand.rules.join('\n'),
      'Chiến dịch demo tư vấn sản phẩm Đệm Sông Hồng. Bot tư vấn, gợi mở nhu cầu và ghi nhận lead cho Sale.',
      JSON.stringify(defaultProducts),
      JSON.stringify([DEFAULT_PAGE_ID]),
    ]
  );
  console.log('[campaigns] Campaign store sẵn sàng ✅');
}

export async function listCampaigns() {
  const result = await query('SELECT * FROM campaigns ORDER BY created_at DESC');
  if (!result) return Array.from(memoryCampaigns.values()).map(normalizeCampaign);
  return result.rows.map(normalizeCampaign);
}

export async function getCampaignBySlug(slug) {
  const cleanSlug = String(slug || '').trim();
  const result = await query('SELECT * FROM campaigns WHERE slug = $1', [cleanSlug]);
  if (!result) return normalizeCampaign(memoryCampaigns.get(cleanSlug) || defaultCampaign());
  return normalizeCampaign(result.rows[0] || null);
}

export async function getCampaignById(id) {
  const result = await query('SELECT * FROM campaigns WHERE id = $1', [id]);
  if (!result) {
    const campaign = Array.from(memoryCampaigns.values()).find((item) => String(item.id) === String(id));
    return normalizeCampaign(campaign || null);
  }
  return normalizeCampaign(result.rows[0] || null);
}

export async function findCampaignByPageId(pageId) {
  const cleanPageId = String(pageId || '').trim();
  if (!cleanPageId) return defaultCampaign();

  const result = await query(
    'SELECT * FROM campaigns WHERE active = TRUE AND page_ids ? $1 ORDER BY created_at DESC LIMIT 1',
    [cleanPageId]
  );
  if (!result) {
    return (
      Array.from(memoryCampaigns.values()).find((item) => item.active && item.page_ids.includes(cleanPageId)) ||
      defaultCampaign()
    );
  }
  return normalizeCampaign(result.rows[0] || defaultCampaign());
}

export async function saveCampaign(input) {
  const campaign = campaignFromInput(input);
  const result = await query(
    `
      INSERT INTO campaigns (
        slug,
        name,
        brand_name,
        persona,
        rules,
        knowledge,
        products,
        page_ids,
        active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9)
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        brand_name = EXCLUDED.brand_name,
        persona = EXCLUDED.persona,
        rules = EXCLUDED.rules,
        knowledge = EXCLUDED.knowledge,
        products = EXCLUDED.products,
        page_ids = EXCLUDED.page_ids,
        active = EXCLUDED.active,
        updated_at = NOW()
      RETURNING *
    `,
    [
      campaign.slug,
      campaign.name,
      campaign.brand_name,
      campaign.persona,
      campaign.rules,
      campaign.knowledge,
      JSON.stringify(campaign.products),
      JSON.stringify(campaign.page_ids),
      campaign.active,
    ]
  );

  if (!result) {
    const stored = { ...campaign, id: campaign.id || campaign.slug, updated_at: new Date().toISOString() };
    memoryCampaigns.set(stored.slug, stored);
    return normalizeCampaign(stored);
  }

  return normalizeCampaign(result.rows[0]);
}

export function campaignToPromptData(campaign) {
  const normalized = normalizeCampaign(campaign) || defaultCampaign();
  return {
    ...normalized,
    rulesList: normalized.rules
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
  };
}

export function productsTextarea(campaign) {
  return JSON.stringify(normalizeProducts(campaign?.products || []), null, 2);
}

function campaignFromInput(input = {}) {
  const name = cleanText(input.name, 120) || 'Chiến dịch mới';
  const slug = cleanSlug(input.slug || name);
  const pageIds = String(input.pageIds || input.page_ids || '')
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

  return normalizeCampaign({
    id: input.id,
    slug,
    name,
    brand_name: cleanText(input.brandName || input.brand_name, 120),
    persona: cleanText(input.persona, 6000) || brand.persona,
    rules: cleanText(input.rules, 8000) || brand.rules.join('\n'),
    knowledge: cleanText(input.knowledge, 12000),
    products: parseProducts(input.products),
    page_ids: pageIds,
    active: input.active === 'on' || input.active === true || input.active === 'true',
  });
}

function parseProducts(value) {
  if (Array.isArray(value)) return normalizeProducts(value);
  const text = String(value || '').trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return normalizeProducts(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
}

function normalizeCampaign(campaign) {
  if (!campaign) return null;
  return {
    ...campaign,
    slug: cleanSlug(campaign.slug || campaign.name || DEFAULT_CAMPAIGN_SLUG),
    name: cleanText(campaign.name, 120) || 'Chiến dịch',
    brand_name: cleanText(campaign.brand_name || campaign.brandName, 120),
    persona: cleanText(campaign.persona, 6000) || brand.persona,
    rules: Array.isArray(campaign.rules)
      ? campaign.rules.join('\n')
      : cleanText(campaign.rules, 8000) || brand.rules.join('\n'),
    knowledge: cleanText(campaign.knowledge, 12000),
    products: normalizeProducts(campaign.products),
    page_ids: normalizePageIds(campaign.page_ids || campaign.pageIds),
    active: campaign.active !== false,
  };
}

function normalizeProducts(items = []) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      id: cleanSlug(item.id || item.name),
      name: cleanText(item.name, 160),
      line: cleanText(item.line, 160),
      description: cleanText(item.description, 1000),
      features: normalizeStringArray(item.features),
      sizes: normalizeStringArray(item.sizes),
      thickness: normalizeStringArray(item.thickness),
      price: cleanText(item.price, 200),
      images: normalizeStringArray(item.images),
    }))
    .filter((item) => item.id && item.name);
}

function normalizePageIds(value = []) {
  if (typeof value === 'string') {
    try {
      return normalizeStringArray(JSON.parse(value));
    } catch {
      return normalizeStringArray(value.split(/[,\n]/));
    }
  }
  return normalizeStringArray(value);
}

function normalizeStringArray(value = []) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function seedMemoryCampaigns() {
  if (!memoryCampaigns.size) {
    const campaign = defaultCampaign();
    memoryCampaigns.set(campaign.slug, campaign);
  }
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

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}
