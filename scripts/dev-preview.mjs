// Wrapper cho preview local (Browser pane) — chạy ở cổng riêng, không đụng
// PORT mặc định 3010 (đang bị isuzu-lead-tracker-lite chiếm trong launch.json gốc).
process.env.PORT = process.env.PORT || '3050';
await import('../src/index.js');
