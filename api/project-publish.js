import {
  bearerFrom,
  json,
  preflight,
  requireAllowedOrigin,
  validateAIProjects,
  verifySessionToken
} from '../server-lib/security.js';
import { commitChanges, createBlob, getHeadContext, getRecursiveTree } from '../server-lib/github.js';
import {
  normalizeRelativePath,
  projectPrefix,
  projectsSource,
  validateManifest,
  validateProjectMeta
} from '../server-lib/project-manager.js';

export function OPTIONS(request) { return preflight(request); }

export async function POST(request) {
  if (!requireAllowedOrigin(request)) return json(request, { ok: false, error: '当前网站来源未被允许' }, 403);
  if (!verifySessionToken(bearerFrom(request))) return json(request, { ok: false, error: '登录已过期，请重新登录管理员后台' }, 401);

  try {
    const body = await request.json();
    const project = body?.project;
    const files = body?.files;
    const aiProjects = body?.aiProjects;
    const replace = Boolean(body?.replace);

    const projectError = validateProjectMeta(project);
    if (projectError) return json(request, { ok: false, error: projectError }, 400);
    const manifestError = validateManifest(files);
    if (manifestError) return json(request, { ok: false, error: manifestError }, 400);
    const aiError = validateAIProjects(aiProjects);
    if (aiError) return json(request, { ok: false, error: aiError }, 400);

    const canonical = aiProjects.find((item) => String(item.id) === String(project.id));
    if (!canonical || String(canonical.path) !== String(project.path)) {
      return json(request, { ok: false, error: '作品库中缺少与本次发布匹配的项目条目' }, 400);
    }

    const projectsPath = String(process.env.PROJECTS_DATA_PATH || 'projects-data.js').split('/').filter(Boolean).join('/');
    const ctx = await getHeadContext();
    const existingTree = await getRecursiveTree(ctx);
    const prefix = projectPrefix(project.path);
    const existingFiles = existingTree.filter((item) => item.type === 'blob' && String(item.path || '').startsWith(prefix));
    if (existingFiles.length && !replace) {
      return json(request, { ok: false, error: `项目目录 ${project.path} 已存在，请勾选“覆盖已有项目”后再发布` }, 409);
    }

    const newRelativePaths = new Set(files.map((item) => normalizeRelativePath(item.path)));
    const entries = [];
    for (const old of existingFiles) {
      const relative = old.path.slice(prefix.length);
      if (!newRelativePaths.has(relative)) entries.push({ path: old.path, mode: '100644', type: 'blob', sha: null });
    }
    for (const file of files) {
      entries.push({
        path: `${prefix}${normalizeRelativePath(file.path)}`,
        mode: '100644',
        type: 'blob',
        sha: file.sha
      });
    }

    const projectsBlob = await createBlob(ctx, projectsSource(aiProjects), 'utf-8');
    entries.push({ path: projectsPath, mode: '100644', type: 'blob', sha: projectsBlob.sha });

    const message = String(body?.message || `${existingFiles.length ? '更新' : '发布'} AI 作品：${project.title}`).trim().slice(0, 180);
    const commit = await commitChanges(ctx, entries, message);
    return json(request, {
      ok: true,
      message: existingFiles.length ? '项目文件与作品库已一次性更新。' : '新项目与作品库已一次性发布。',
      projectPath: `projects/${project.path}/`,
      fileCount: files.length,
      replacedFileCount: existingFiles.length,
      commit: {
        sha: commit.sha,
        url: `https://github.com/${ctx.owner}/${ctx.repo}/commit/${commit.sha}`,
        message
      }
    });
  } catch (error) {
    console.error('project publish error', error);
    const status = error.status === 409 ? 409 : error.status === 401 ? 401 : error.status === 403 ? 403 : 500;
    const hint = error.status === 403 ? '请确认 GitHub Fine-grained Token 对当前仓库拥有 Contents: Read and write。' : '';
    return json(request, { ok: false, error: error.message || '项目发布失败', hint }, status);
  }
}
