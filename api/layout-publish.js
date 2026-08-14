import {
  bearerFrom,
  json,
  preflight,
  requireAllowedOrigin,
  verifySessionToken
} from '../server-lib/security.js';
import { commitChanges, createBlob, getHeadContext } from '../server-lib/github.js';
import { layoutSource, normalizeLayout, validateLayout } from '../server-lib/layout-manager.js';

export function OPTIONS(request) {
  return preflight(request);
}

export async function POST(request) {
  if (!requireAllowedOrigin(request)) {
    return json(request, { ok: false, error: '当前网站来源未被允许' }, 403);
  }
  if (!verifySessionToken(bearerFrom(request))) {
    return json(request, { ok: false, error: '登录已过期，请重新登录管理员后台' }, 401);
  }

  try {
    const body = await request.json();
    const error = validateLayout(body?.layout);
    if (error) return json(request, { ok: false, error }, 400);

    const layout = normalizeLayout(body.layout);
    const layoutPath = String(process.env.LAYOUT_DATA_PATH || 'layout-data.js')
      .split('/')
      .filter(Boolean)
      .join('/');

    const ctx = await getHeadContext();
    const blob = await createBlob(ctx, layoutSource(layout), 'utf-8');
    const message = String(body?.message || '更新 V10 可视化页面布局')
      .trim()
      .slice(0, 180);

    const commit = await commitChanges(
      ctx,
      [{ path: layoutPath, mode: '100644', type: 'blob', sha: blob.sha }],
      message
    );

    return json(request, {
      ok: true,
      message: '布局已发布到 GitHub。',
      layout,
      commit: {
        sha: commit.sha,
        url: `https://github.com/${ctx.owner}/${ctx.repo}/commit/${commit.sha}`
      }
    });
  } catch (error) {
    console.error('layout publish error', error);
    const status = [400, 401, 403, 404, 409].includes(error.status) ? error.status : 500;
    return json(request, {
      ok: false,
      error: error.message || '布局发布失败'
    }, status);
  }
}
