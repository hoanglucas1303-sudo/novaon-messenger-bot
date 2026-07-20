import { config } from './config.js';

export function requireAdminAuth(req, res, next) {
  if (!config.dashboardPassword) return next();

  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme !== 'Basic' || !encoded) return requestAuth(res);

  const [user, password] = Buffer.from(encoded, 'base64').toString('utf8').split(':');
  if (user === config.dashboardUser && password === config.dashboardPassword) return next();
  return requestAuth(res);
}

export function requestAuth(res) {
  res.set('WWW-Authenticate', 'Basic realm="Novaon Bot Platform"');
  return res.status(401).send('Authentication required');
}
