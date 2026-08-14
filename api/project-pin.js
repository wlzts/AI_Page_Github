import {
  bearerFrom,
  json,
  preflight,
  requireAllowedOrigin,
  validateAIProjects,
  verifySessionToken
} from '../server-lib/security.js';
import { commitChanges, createBlob, getHeadContext, getRecursiveTree, gh } from '../server-lib/github.js';
import { projectsSource } from '../server-lib/project-manager.js';

export function OPTIONS(request) { return preflight(request); }

function decodeBlobContent(content = '') {
  return Buffer.from(String(content).replace(/\n/g, ''), 'base64').toString('utf8');
}

function parseProjectsSource(source) {
  const match = String(source || '').match(/window\.AIProjects\s*=\s*([\s\S]*?)\s*;\s*$/);
  if (!match) throw new Error('无法解析 projects-data.js 中的 AIProjects 数据');
  const items = JSON.parse(match[1]);
  const error = validateAIProjects(items);
  if (error) throw new Error(error);
  return items;
}

function reorder(items, targetIndex, pin) {
  const next = items.map((item) => ({ ...item }));
  const [target] = next.splice(targetIndex, 1);
  target.pinned = Boolean(pin);

  if (pin) {
    // 最近一次置顶的项目放到所有置顶项目最前面。
    const firstUnpinned = next.findIndex((item) => !item.pinned);
    const insertAt = firstUnpinned === -1 ? next.length : firstUnpinned;
    next.splice(0, 0, target);
  } else {
    // 取消置顶后，放到置顶分组之后，普通项目之前。
    let insertAt = 0;
    while (insertAt < next.length && next[insertAt].pinned) insertAt++;
    next.splice(insertAt, 0, target);
  }
  return next;
}

export async function POST(request) {
  if (!requireAllowedOrigin(request)) return json(request, { ok: false, error: '当前网站来源未被允许' }, 403);
  if (!verifySessionToken(bearerFrom(request))) return json(request, { ok: false, error: '登录已过期，请重新登录管理员后台' }, 401);

  try {
    const body = await request.json();
    const id = String(body?.id || '').trim();
    const path = String(body?.path || '').trim();
    const pin = Boolean(body?.pinned);
    if (!id && !path) return json(request, { ok: false, error: '缺少项目 ID 或目录名' }, 400);

    const projectsPath = String(process.env.PROJECTS_DATA_PATH || 'projects-data.js').split('/').filter(Boolean).join('/');
    const ctx = await getHeadContext();
    const tree = await getRecursiveTree(ctx);
    const file = tree.find((item) => item.type === 'blob' && item.path === projectsPath);
    if (!file?.sha) return json(request, { ok: false, error: `仓库中未找到 ${projectsPath}` }, 404);

    const blob = await gh(`${ctx.base}/git/blobs/${file.sha}`, { headers: ctx.headers });
    const items = parseProjectsSource(decodeBlobContent(blob.content));
    const index = items.findIndex((item) => (id && String(item.id) === id) || (path && String(item.path) === path));
    if (index < 0) return json(request, { ok: false, error: '未找到要置顶的项目' }, 404);

    const targetTitle = items[index].title || items[index].id;
    const next = reorder(items, index, pin);
    const validationError = validateAIProjects(next);
    if (validationError) return json(request, { ok: false, error: validationError }, 400);

    const projectsBlob = await createBlob(ctx, projectsSource(next), 'utf-8');
    const message = `${pin ? '置顶' : '取消置顶'} AI 作品：${targetTitle}`.slice(0, 180);
    const commit = await commitChanges(ctx, [
      { path: projectsPath, mode: '100644', type: 'blob', sha: projectsBlob.sha }
    ], message);

    return json(request, {
      ok: true,
      pinned: pin,
      projects: next,
      message,
      commit: {
        sha: commit.sha,
        url: `https://github.com/${ctx.owner}/${ctx.repo}/commit/${commit.sha}`
      }
    });
  } catch (error) {
    console.error('project pin error', error);
    const status = [400, 401, 403, 404, 409].includes(error.status) ? error.status : 500;
    return json(request, { ok: false, error: error.message || '置顶操作失败' }, status);
  }
}
