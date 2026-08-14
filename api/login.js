import {
  createSessionToken,
  json,
  preflight,
  requireAllowedOrigin,
  verifyAdminPassword
} from '../server-lib/security.js';

export function OPTIONS(request) {
  return preflight(request);
}

export async function POST(request) {
  if (!requireAllowedOrigin(request)) {
    return json(request, { ok: false, error: '当前网站来源未被允许' }, 403);
  }

  try {
    const body = await request.json();
    const password = String(body?.password || '').slice(0, 256);

    if (!verifyAdminPassword(password)) {
      await new Promise((resolve) => setTimeout(resolve, 650));
      return json(request, { ok: false, error: '管理员密码错误' }, 401);
    }

    const session = createSessionToken(2 * 60 * 60);

    return json(request, {
      ok: true,
      token: session.token,
      expiresAt: session.expiresAt,
      repository: {
        owner: process.env.GITHUB_OWNER || '',
        repo: process.env.GITHUB_REPO || '',
        branch: process.env.GITHUB_BRANCH || 'main',
        resumePath:
          process.env.RESUME_DATA_PATH ||
          'projects/playable-resume/resume-data.js',
        projectsPath: process.env.PROJECTS_DATA_PATH || 'projects-data.js'
      }
    });
  } catch (error) {
    console.error('login error', error);
    return json(
      request,
      { ok: false, error: '后台尚未配置完成，请检查 Vercel 环境变量' },
      500
    );
  }
}
