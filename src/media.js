const ALLOWED_IMAGE_HOSTS = new Set([
  'songhonghanoi.vn',
  'songhong.info',
  'songhongonline.vn',
  'demxanh.com',
  'cdn.hstatic.net',
  'product.hstatic.net',
  'media.loveitopcdn.com',
]);

export function proxiedImageUrl(publicBaseUrl, sourceUrl) {
  if (!sourceUrl) return '';
  return `${publicBaseUrl}/assets/remote-image?url=${encodeURIComponent(sourceUrl)}`;
}

export function mountMediaRoutes(app) {
  app.get('/assets/remote-image', async (req, res) => {
    try {
      const sourceUrl = new URL(String(req.query.url || ''));
      if (!ALLOWED_IMAGE_HOSTS.has(sourceUrl.hostname)) return res.sendStatus(403);

      const upstream = await fetch(sourceUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 NovaonBotImageProxy',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      });
      if (!upstream.ok) return res.sendStatus(502);

      const contentType = upstream.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) return res.sendStatus(415);

      const buffer = Buffer.from(await upstream.arrayBuffer());
      res.set('Cache-Control', 'public, max-age=86400');
      res.type(contentType);
      res.send(buffer);
    } catch (e) {
      console.error('[media] Không proxy được ảnh:', e);
      res.sendStatus(400);
    }
  });
}
