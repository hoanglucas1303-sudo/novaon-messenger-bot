import 'dotenv/config';

export const config = {
  port: process.env.PORT || 3010,
  pageAccessToken: process.env.PAGE_ACCESS_TOKEN || '',
  verifyToken: process.env.VERIFY_TOKEN || 'novaon-messenger-verify-2026',
  appSecret: process.env.APP_SECRET || '',
  graphApiVersion: 'v21.0',

  // LLM (Phase 1)
  openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
  llmModel: process.env.LLM_MODEL || 'anthropic/claude-sonnet-4.6',
};

// Cảnh báo sớm nếu thiếu cấu hình bắt buộc để gửi tin
export function warnMissingConfig() {
  if (!config.pageAccessToken) {
    console.warn('[config] ⚠️  PAGE_ACCESS_TOKEN chưa được đặt — bot sẽ nhận được tin nhưng KHÔNG gửi lại được.');
  }
}
