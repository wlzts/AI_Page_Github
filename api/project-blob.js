import { bearerFrom, json, preflight, requireAllowedOrigin, verifySessionToken } from '../server-lib/security.js';
import { createBlob, getRepoContext } from '../server-lib/github.js';
import { MAX_FILE_BYTES, validateBlobPayload } from '../server-lib/project-manager.js';

export function OPTIONS(request) { return preflight(request); }

export async function POST(request) {
  if (!requireAllowedOrigin(request)) return json(request, { ok: false, error: '当前网站来源未被允许' }, 403);
  if (!verifySessionToken(bearerFrom(request))) return json(request, { ok: false, error: '登录已过期，请重新登录管理员后台' }, 401);

  try {
    const body = await request.json();
    const error = validateBlobPayload(body);
    if (error) return json(request, { ok: false, error }, 400);

    const buffer = Buffer.from(String(body.contentBase64), 'base64');
    if (buffer.length !== Number(body.size)) return json(request, { ok: false, error: '文件大小校验失败，请重新选择文件' }, 400);
    if (buffer.length > MAX_FILE_BYTES) return json(request, { ok: false, error: '文件超过单文件限制' }, 413);

    const ctx = getRepoContext();
    const blob = await createBlob(ctx, String(body.contentBase64), 'base64');
    return json(request, { ok: true, sha: blob.sha, path: body.relativePath, size: buffer.length });
  } catch (error) {
    console.error('project blob error', error);
    return json(request, { ok: false, error: error.message || '文件上传失败' }, error.status === 401 ? 401 : 500);
  }
}
