import {
  bearerFrom,
  json,
  preflight,
  requireAllowedOrigin,
  validateAIProjects,
  verifySessionToken
} from '../server-lib/security.js';
import { commitChanges, createBlob, getHeadContext, getRecursiveTree } from '../server-lib/github.js';
import { projectPrefix, projectsSource, validateSlug } from '../server-lib/project-manager.js';

export function OPTIONS(request) { return preflight(request); }

export async function POST(request) {
  if (!requireAllowedOrigin(request)) return json(request, { ok: false, error: '当前网站来源未被允许' }, 403);
  if (!verifySessionToken(bearerFrom(request))) return json(request, { ok: false, error: '登录已过期，请重新登录管理员后台' }, 401);

  try {
    const body = await request.json();
    const slug = String(body?.slug || '').trim();
    const slugError = validateSlug(slug);
    if (slugError) return json(request, { ok: false, error: slugError }, 400);
    const aiProjects = body?.aiProjects;
    const aiError = validateAIProjects(aiProjects);
    if (aiError) return json(request, { ok: false, error: aiError }, 400);
    if (aiProjects.some((item) => String(item.path) === slug)) {
      return json(request, { ok: false, error: '删除项目目录前，请先从提交的作品库数据中移除对应条目' }, 400);
    }

    const projectsPath = String(process.env.PROJECTS_DATA_PATH || 'projects-data.js').split('/').filter(Boolean).join('/');
    const ctx = await getHeadContext();
    const existingTree = await getRecursiveTree(ctx);
    const prefix = projectPrefix(slug);
    const existingFiles = existingTree.filter((item) => item.type === 'blob' && String(item.path || '').startsWith(prefix));
    const entries = existingFiles.map((item) => ({ path: item.path, mode: '100644', type: 'blob', sha: null }));
    const projectsBlob = await createBlob(ctx, projectsSource(aiProjects), 'utf-8');
    entries.push({ path: projectsPath, mode: '100644', type: 'blob', sha: projectsBlob.sha });

    const message = String(body?.message || `删除 AI 作品：${slug}`).trim().slice(0, 180);
    const commit = await commitChanges(ctx, entries, message);
    return json(request, {
      ok: true,
      message: existingFiles.length ? '项目目录与作品库条目已删除。' : 'GitHub 中未找到项目目录，作品库条目已删除。',
      deletedFiles: existingFiles.length,
      commit: {
        sha: commit.sha,
        url: `https://github.com/${ctx.owner}/${ctx.repo}/commit/${commit.sha}`,
        message
      }
    });
  } catch (error) {
    console.error('project delete error', error);
    const status = error.status === 401 ? 401 : error.status === 403 ? 403 : 500;
    return json(request, { ok: false, error: error.message || '删除项目失败' }, status);
  }
}
