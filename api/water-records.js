import crypto from 'node:crypto';
import { getRepoContext, gh } from '../server-lib/github.js';
import { json, preflight, requireAllowedOrigin } from '../server-lib/security.js';

const MAX_RECORDS = 1000;
const MAX_BODY_LENGTH = 16_000;
const MIN_TIMESTAMP = Date.UTC(2000, 0, 1);
const CONFLICT_STATUSES = new Set([409, 412]);

export function OPTIONS(request) {
  return preflight(request);
}

function waterDataPath() {
  const path = String(process.env.WATER_DATA_PATH || 'projects/water-tracker/shared-records.json')
    .replace(/^\/+|\/+$/g, '');
  if (!path || path.split('/').includes('..')) {
    const error = new Error('WATER_DATA_PATH 配置无效');
    error.status = 500;
    throw error;
  }
  return path.split('/').map(encodeURIComponent).join('/');
}

function allowWaterRequest(request) {
  if (requireAllowedOrigin(request)) return true;
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

function normalizeRecords(value) {
  if (!Array.isArray(value)) return [];
  const ids = new Set();
  const times = new Set();
  return value
    .map((item) => ({
      id: item && typeof item.id === 'string' && item.id.length <= 100 ? item.id : crypto.randomUUID(),
      timestamp: Number(item && item.timestamp)
    }))
    .filter((item) => {
      if (!Number.isSafeInteger(item.timestamp) || item.timestamp <= 0) return false;
      if (ids.has(item.id) || times.has(item.timestamp)) return false;
      ids.add(item.id);
      times.add(item.timestamp);
      return true;
    })
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-MAX_RECORDS);
}

async function readStore() {
  const ctx = getRepoContext();
  const path = waterDataPath();
  try {
    const file = await gh(`${ctx.base}/contents/${path}?ref=${encodeURIComponent(ctx.branch)}`, {
      headers: ctx.headers
    });
    let parsed;
    try {
      parsed = JSON.parse(Buffer.from(String(file.content || ''), 'base64').toString('utf8') || '{}');
    } catch {
      const error = new Error('共享记录文件格式损坏');
      error.status = 500;
      throw error;
    }
    return { ctx, path, sha: file.sha, records: normalizeRecords(parsed.records) };
  } catch (error) {
    if (error.status !== 404) throw error;
    return { ctx, path, sha: '', records: [] };
  }
}

async function writeStore(store, records) {
  const content = Buffer.from(JSON.stringify({ version: 1, records }, null, 2) + '\n', 'utf8').toString('base64');
  const body = {
    message: 'Update shared water records',
    content,
    branch: store.ctx.branch
  };
  if (store.sha) body.sha = store.sha;
  return gh(`${store.ctx.base}/contents/${store.path}`, {
    method: 'PUT',
    headers: store.ctx.headers,
    body: JSON.stringify(body)
  });
}

async function mutateStore(transform) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const store = await readStore();
    const result = transform(store.records);
    if (!result.changed) return { records: store.records };
    try {
      await writeStore(store, result.records);
      return { records: result.records };
    } catch (error) {
      if (!CONFLICT_STATUSES.has(error.status) || attempt === 2) throw error;
    }
  }
  throw new Error('共享记录写入失败');
}

function success(request, records, extra = {}) {
  return json(request, { ok: true, records, serverTime: Date.now(), ...extra });
}

function badRequest(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function validTimestamp(value) {
  const timestamp = Number(value);
  if (!Number.isSafeInteger(timestamp) || timestamp < MIN_TIMESTAMP) {
    throw badRequest('请选择有效的打水时间');
  }
  if (timestamp > Date.now() + 5000) {
    throw badRequest('不能记录未来的打水时间');
  }
  return timestamp;
}

async function parseBody(request) {
  const text = await request.text();
  if (text.length > MAX_BODY_LENGTH) throw badRequest('请求内容过大', 413);
  try {
    return JSON.parse(text || '{}');
  } catch {
    throw badRequest('请求格式错误');
  }
}

export async function GET(request) {
  if (!allowWaterRequest(request)) return json(request, { ok: false, error: '当前网站来源未被允许' }, 403);
  try {
    const store = await readStore();
    return success(request, store.records);
  } catch (error) {
    console.error('water records read error', error.message);
    return json(request, { ok: false, error: '共享记录服务暂时不可用，请稍后重试' }, error.status || 500);
  }
}

export async function POST(request) {
  if (!allowWaterRequest(request)) return json(request, { ok: false, error: '当前网站来源未被允许' }, 403);
  try {
    const body = await parseBody(request);
    const action = String(body.action || '');

    if (action === 'add') {
      const timestamp = body.timestamp == null ? Date.now() : validTimestamp(body.timestamp);
      let duplicate = false;
      const result = await mutateStore((records) => {
        if (records.some((record) => record.timestamp === timestamp)) {
          duplicate = true;
          return { changed: false };
        }
        if (records.length >= MAX_RECORDS) throw badRequest('共享记录已达到 1000 条上限', 413);
        return {
          changed: true,
          records: normalizeRecords([...records, { id: crypto.randomUUID(), timestamp }])
        };
      });
      return success(request, result.records, { duplicate });
    }

    if (action === 'delete') {
      const id = String(body.id || '');
      if (!id || id.length > 100) throw badRequest('缺少要删除的记录 ID');
      const result = await mutateStore((records) => {
        const next = records.filter((record) => record.id !== id);
        return { changed: next.length !== records.length, records: next };
      });
      return success(request, result.records);
    }

    if (action === 'clear') {
      const result = await mutateStore((records) => ({ changed: records.length > 0, records: [] }));
      return success(request, result.records);
    }

    throw badRequest('不支持的共享记录操作');
  } catch (error) {
    const status = Number(error.status) || 500;
    console.error('water records write error', error.message);
    const message = status < 500 ? error.message : '共享记录保存失败，请稍后重试';
    return json(request, { ok: false, error: message }, status);
  }
}
