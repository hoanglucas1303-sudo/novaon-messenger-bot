import 'dotenv/config';

export const config = {
  port: process.env.PORT || 3010,
  pageAccessToken: process.env.PAGE_ACCESS_TOKEN || '',
  verifyToken: process.env.VERIFY_TOKEN || 'novaon-messenger-verify-2026',
  appSecret: process.env.APP_SECRET || '',
  graphApiVersion: 'v21.0',

  // LLM (Phase 1+)
  openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
  llmModel: process.env.CHEAP_LLM_MODEL || 'anthropic/claude-haiku-4.5',
  premiumLlmModel:
    process.env.PREMIUM_LLM_MODEL ||
    process.env.LLM_MODEL ||
    'anthropic/claude-sonnet-4.6',
  llmMaxTokens: Number(process.env.LLM_MAX_TOKENS || 350),

  // URL gốc công khai (để dựng link ảnh tự host cho Messenger fetch)
  publicBaseUrl:
    process.env.PUBLIC_BASE_URL || 'https://novaon-messenger-bot-production.up.railway.app',

  // DB + dashboard leads (Phase v1)
  databaseUrl: process.env.DATABASE_URL || '',
  dashboardLocked: process.env.DASHBOARD_LOCKED === 'true',
  dashboardUser: process.env.DASHBOARD_USER || 'novaon',
  dashboardPassword: process.env.DASHBOARD_PASSWORD || '',
};

// Cảnh báo sớm nếu thiếu cấu hình bắt buộc để gửi tin
export function warnMissingConfig() {
  if (!config.pageAccessToken) {
    console.warn('[config] ⚠️  PAGE_ACCESS_TOKEN chưa được đặt — bot sẽ nhận được tin nhưng KHÔNG gửi lại được.');
  }
  if (!config.databaseUrl) {
    console.warn('[config] ⚠️  DATABASE_URL chưa được đặt — lead capture sẽ chỉ log, chưa lưu DB.');
  }
  if (config.dashboardLocked && !config.dashboardPassword) {
    console.warn('[config] ⚠️  DASHBOARD_LOCKED=true nhưng thiếu DASHBOARD_PASSWORD — dashboard sẽ mở tạm để tránh tự khóa.');
  }
}
