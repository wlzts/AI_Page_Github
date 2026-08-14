import { json, preflight, requireAllowedOrigin } from '../server-lib/security.js';

export function OPTIONS(request) {
  return preflight(request);
}

export async function POST(request) {
  if (!requireAllowedOrigin(request)) {
    return json(request, { ok: false, error: '当前网站来源未被允许' }, 403);
  }
  return json(request, {
    ok: false,
    error: 'V9 置顶功能已停用。请使用首页 V10「页面设计」调整项目顺序和卡片大小。'
  }, 410);
}
