import {
  bearerFrom,
  json,
  preflight,
  requireAllowedOrigin,
  validateAIProjects,
  validateResumeData,
  verifySessionToken
} from '../server-lib/security.js';

const API_VERSION = '2026-03-10';

function headers(token) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': API_VERSION,
    'User-Agent': 'cao-jixian-ai-page-v8-admin',
    'Content-Type': 'application/json'
  };
}

async function gh(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }
  if (!response.ok) {
    const e = new Error(data.message || `GitHub API ${response.status}`);
    e.status = response.status;
    e.details = data;
    throw e;
  }
  return data;
}

function cleanPath(path) {
  return String(path || '').split('/').filter(Boolean).join('/');
}

function resumeSource(data) {
  return `/* 由 V8 在线管理员后台发布。请勿在此文件存放密钥。 */\nwindow.ResumeData = ${JSON.stringify(data, null, 2)};\n`;
}

function projectsSource(items) {
  return `/* 由 V8 在线管理员后台发布。AI_Page 首页与可玩简历共享此数据。 */\nwindow.AIProjects = ${JSON.stringify(items, null, 2)};\n`;
}

export function OPTIONS(request) {
  return preflight(request);
}

export async function POST(request) {
  if (!requireAllowedOrigin(request)) {
    return json(request, { ok: false, error: '当前网站来源未被允许' }, 403);
  }

  try {
    if (!verifySessionToken(bearerFrom(request))) {
      return json(request, { ok: false, error: '登录已过期，请重新登录管理员后台' }, 401);
    }

    const token = process.env.GITHUB_TOKEN || '';
    const owner = process.env.GITHUB_OWNER || '';
    const repo = process.env.GITHUB_REPO || '';
    const branch = process.env.GITHUB_BRANCH || 'main';
    const resumePath = cleanPath(
      process.env.RESUME_DATA_PATH || 'projects/playable-resume/resume-data.js'
    );
    const projectsPath = cleanPath(process.env.PROJECTS_DATA_PATH || 'projects-data.js');

    if (!token || !owner || !repo) {
      return json(request, { ok: false, error: 'GitHub 发布环境变量未配置完整' }, 500);
    }

    const body = await request.json();
    const data = body?.data;
    const aiProjects = body?.aiProjects;

    const resumeError = validateResumeData(data);
    if (resumeError) return json(request, { ok: false, error: resumeError }, 400);

    const aiError = validateAIProjects(aiProjects);
    if (aiError) return json(request, { ok: false, error: aiError }, 400);

    const message = String(
      body?.message || `更新个人站内容：${data.profile.name || '管理员'} 发布`
    ).trim().slice(0, 180);

    const base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    const h = headers(token);

    const ref = await gh(`${base}/git/ref/heads/${encodeURIComponent(branch)}`, { headers: h });
    const headSha = ref.object.sha;
    const headCommit = await gh(`${base}/git/commits/${headSha}`, { headers: h });

    const [resumeBlob, projectsBlob] = await Promise.all([
      gh(`${base}/git/blobs`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({ content: resumeSource(data), encoding: 'utf-8' })
      }),
      gh(`${base}/git/blobs`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({ content: projectsSource(aiProjects), encoding: 'utf-8' })
      })
    ]);

    const tree = await gh(`${base}/git/trees`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({
        base_tree: headCommit.tree.sha,
        tree: [
          { path: resumePath, mode: '100644', type: 'blob', sha: resumeBlob.sha },
          { path: projectsPath, mode: '100644', type: 'blob', sha: projectsBlob.sha }
        ]
      })
    });

    const commit = await gh(`${base}/git/commits`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({ message, tree: tree.sha, parents: [headSha] })
    });

    await gh(`${base}/git/refs/heads/${encodeURIComponent(branch)}`, {
      method: 'PATCH',
      headers: h,
      body: JSON.stringify({ sha: commit.sha, force: false })
    });

    return json(request, {
      ok: true,
      message: '简历与 AI 作品库已在同一个 GitHub commit 中更新，Pages 将自动部署。',
      commit: {
        sha: commit.sha,
        url: `https://github.com/${owner}/${repo}/commit/${commit.sha}`,
        message
      },
      files: [resumePath, projectsPath]
    });
  } catch (error) {
    console.error('publish error', error);
    const hint =
      error.status === 403
        ? 'GitHub Token 权限不足，请确认 Fine-grained token 已授权该仓库的 Contents: Read and write。'
        : error.status === 404
          ? '找不到仓库、分支或目标路径，请检查 Vercel 环境变量。'
          : '';

    return json(
      request,
      { ok: false, error: error.message || '发布失败', hint },
      error.status === 401 ? 401 : 500
    );
  }
}
