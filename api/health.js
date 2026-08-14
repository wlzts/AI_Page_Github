import { json, preflight, requireAllowedOrigin } from '../server-lib/security.js';

export function OPTIONS(request) {
  return preflight(request);
}

export async function GET(request) {
  if (!requireAllowedOrigin(request)) {
    return json(request, { ok: false, error: '当前网站来源未被允许' }, 403);
  }

  const configured = Boolean(
    process.env.GITHUB_TOKEN &&
    process.env.GITHUB_OWNER &&
    process.env.GITHUB_REPO &&
    process.env.ADMIN_PASSWORD &&
    process.env.SESSION_SECRET
  );

  return json(request, {
    ok: true,
    configured,
    service: 'AI_Page V8 Admin API',
    repository: configured
      ? `${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}`
      : ''
  });
}
