const API_VERSION = '2026-03-10';

export function githubConfig() {
  const token = process.env.GITHUB_TOKEN || '';
  const owner = process.env.GITHUB_OWNER || '';
  const repo = process.env.GITHUB_REPO || '';
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!token || !owner || !repo) {
    const error = new Error('GitHub 发布环境变量未配置完整');
    error.status = 500;
    throw error;
  }
  return { token, owner, repo, branch };
}

export function githubHeaders(token) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': API_VERSION,
    'User-Agent': 'cao-jixian-ai-page-v9-project-publisher',
    'Content-Type': 'application/json'
  };
}

export async function gh(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; }
  catch { data = { message: text }; }
  if (!response.ok) {
    const error = new Error(data.message || `GitHub API ${response.status}`);
    error.status = response.status;
    error.details = data;
    throw error;
  }
  return data;
}

export function repoBase(owner, repo) {
  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

export function getRepoContext(config = githubConfig()) {
  return {
    ...config,
    base: repoBase(config.owner, config.repo),
    headers: githubHeaders(config.token)
  };
}

export async function getHeadContext(config = githubConfig()) {
  const repoContext = getRepoContext(config);
  const { base, headers } = repoContext;
  const ref = await gh(`${base}/git/ref/heads/${encodeURIComponent(config.branch)}`, { headers });
  const headSha = ref.object.sha;
  const commit = await gh(`${base}/git/commits/${headSha}`, { headers });
  return { ...repoContext, headSha, commit, treeSha: commit.tree.sha };
}

export async function getRecursiveTree(ctx) {
  const tree = await gh(`${ctx.base}/git/trees/${ctx.treeSha}?recursive=1`, { headers: ctx.headers });
  if (tree.truncated) {
    const error = new Error('仓库文件树过大，GitHub 返回了截断结果；为避免误删文件，本次操作已停止。');
    error.status = 409;
    throw error;
  }
  return Array.isArray(tree.tree) ? tree.tree : [];
}

export async function createBlob(ctx, content, encoding = 'utf-8') {
  return gh(`${ctx.base}/git/blobs`, {
    method: 'POST',
    headers: ctx.headers,
    body: JSON.stringify({ content, encoding })
  });
}

export async function commitChanges(ctx, treeEntries, message) {
  const tree = await gh(`${ctx.base}/git/trees`, {
    method: 'POST',
    headers: ctx.headers,
    body: JSON.stringify({ base_tree: ctx.treeSha, tree: treeEntries })
  });
  const commit = await gh(`${ctx.base}/git/commits`, {
    method: 'POST',
    headers: ctx.headers,
    body: JSON.stringify({ message, tree: tree.sha, parents: [ctx.headSha] })
  });
  await gh(`${ctx.base}/git/refs/heads/${encodeURIComponent(ctx.branch)}`, {
    method: 'PATCH',
    headers: ctx.headers,
    body: JSON.stringify({ sha: commit.sha, force: false })
  });
  return commit;
}
