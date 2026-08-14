const encoder = new TextEncoder();

export const MAX_PROJECT_FILES = 200;
export const MAX_FILE_BYTES = 2_200_000;
export const MAX_TOTAL_BYTES = 30_000_000;
export const RESERVED_PROJECT_SLUGS = new Set(['playable-resume']);

const SAFE_EXTENSIONS = new Set([
  'html','htm','css','js','mjs','json','txt','md','xml','svg',
  'png','jpg','jpeg','webp','gif','ico','bmp','avif',
  'wav','mp3','ogg','m4a','mp4','webm',
  'pdf','wasm','woff','woff2','map'
]);
const BLOCKED_NAMES = new Set([
  '.env','.env.local','.env.production','.env.development',
  'id_rsa','id_ed25519','.npmrc','.pypirc','credentials','credentials.json'
]);
const BLOCKED_SEGMENTS = new Set(['.git','.github','node_modules']);

export function cleanSlug(value) {
  return String(value || '').trim();
}

export function validateSlug(value, { allowReserved = false } = {}) {
  const slug = cleanSlug(value);
  if (!slug) return '项目目录名不能为空';
  if (slug.length > 80) return '项目目录名不能超过 80 个字符';
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(slug)) {
    return '项目目录名只能包含英文字母、数字、点、下划线和连字符，并且必须以字母或数字开头';
  }
  if (!allowReserved && RESERVED_PROJECT_SLUGS.has(slug.toLowerCase())) {
    return `目录 ${slug} 是系统保留目录，不能通过项目发布器覆盖`;
  }
  return '';
}

export function normalizeRelativePath(value) {
  const raw = String(value || '').replace(/\\/g, '/').trim();
  return raw.split('/').filter(Boolean).join('/');
}

export function validateRelativePath(value) {
  const raw = String(value || '').replace(/\\/g, '/').trim();
  const path = normalizeRelativePath(raw);
  if (!path) return '文件路径不能为空';
  if (raw.startsWith('/') || raw.includes('..')) return `非法文件路径：${raw}`;
  if (path.length > 240) return `文件路径过长：${path}`;
  const segments = path.split('/');
  if (segments.some((segment) => BLOCKED_SEGMENTS.has(segment.toLowerCase()))) {
    return `禁止上传目录：${path}`;
  }
  const fileName = segments[segments.length - 1];
  if (BLOCKED_NAMES.has(fileName.toLowerCase()) || fileName.toLowerCase().startsWith('.env.')) {
    return `禁止上传敏感文件：${path}`;
  }
  if (fileName.startsWith('.')) return `暂不允许上传隐藏文件：${path}`;
  const dot = fileName.lastIndexOf('.');
  if (dot <= 0) return `文件必须带有可识别的扩展名：${path}`;
  const ext = fileName.slice(dot + 1).toLowerCase();
  if (!SAFE_EXTENSIONS.has(ext)) return `不支持的文件类型 .${ext}：${path}`;
  return '';
}

export function validateProjectMeta(project) {
  if (!project || typeof project !== 'object') return '缺少项目资料';
  const slugError = validateSlug(project.path);
  if (slugError) return slugError;
  if (!String(project.id || '').trim()) return '项目 ID 不能为空';
  if (!String(project.title || '').trim()) return '作品名称不能为空';
  if (String(project.title || '').length > 100) return '作品名称过长';
  if (String(project.description || '').length > 1200) return '作品简介过长';
  return '';
}

export function validateBlobPayload(body) {
  const pathError = validateRelativePath(body?.relativePath);
  if (pathError) return pathError;
  const size = Number(body?.size || 0);
  if (!Number.isFinite(size) || size < 0) return '文件大小无效';
  if (size > MAX_FILE_BYTES) return `单个文件不能超过 ${(MAX_FILE_BYTES / 1_000_000).toFixed(1)} MB`;
  const content = String(body?.contentBase64 || '');
  if (!content) return '文件内容为空';
  // Base64 比原始文件约大 4/3；额外留出少量 JSON 开销。
  if (content.length > Math.ceil(MAX_FILE_BYTES / 3) * 4 + 32) return 'Base64 文件内容超过限制';
  return '';
}

export function validateManifest(files) {
  if (!Array.isArray(files) || !files.length) return '没有可发布的项目文件';
  if (files.length > MAX_PROJECT_FILES) return `单个项目最多 ${MAX_PROJECT_FILES} 个文件`;
  const paths = new Set();
  let total = 0;
  let hasIndex = false;
  for (const [i, item] of files.entries()) {
    if (!item || typeof item !== 'object') return `文件清单第 ${i + 1} 项格式错误`;
    const path = normalizeRelativePath(item.path);
    const pathError = validateRelativePath(path);
    if (pathError) return pathError;
    if (paths.has(path)) return `文件路径重复：${path}`;
    paths.add(path);
    if (path.toLowerCase() === 'index.html') hasIndex = true;
    if (!/^[0-9a-f]{40}$/i.test(String(item.sha || ''))) return `文件 ${path} 缺少有效 Git Blob SHA`;
    const size = Number(item.size || 0);
    if (!Number.isFinite(size) || size < 0 || size > MAX_FILE_BYTES) return `文件大小无效：${path}`;
    total += size;
  }
  if (!hasIndex) return '项目根目录必须包含 index.html';
  if (total > MAX_TOTAL_BYTES) return `项目总大小不能超过 ${(MAX_TOTAL_BYTES / 1_000_000).toFixed(0)} MB`;
  return '';
}

export function projectPrefix(slug) {
  return `projects/${cleanSlug(slug)}/`;
}

export function projectsSource(items) {
  return `/* 由 V9 项目发布管理器发布。AI_Page 首页与可玩简历共享此数据。 */\nwindow.AIProjects = ${JSON.stringify(items, null, 2)};\n`;
}

export function encodedSize(value) {
  return encoder.encode(String(value || '')).length;
}
