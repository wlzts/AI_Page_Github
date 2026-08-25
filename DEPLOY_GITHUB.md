# AI_Page V8 完整部署指南（GitHub Pages + Vercel 在线管理后台）

目标仓库：`wlzts/AI_Page`

最终访问地址：

- AI 网页实验室：`https://wlzts.github.io/AI_Page/`
- 可玩简历：`https://wlzts.github.io/AI_Page/projects/playable-resume/`
- 管理入口：`https://wlzts.github.io/AI_Page/projects/playable-resume/?admin=1`

---

## 0. 先理解架构

这个项目分成两部分：

1. **GitHub Pages**：公开展示静态网页、9 个 AI 小项目、可玩简历。
2. **Vercel Functions**：只负责管理员登录和“发布到 GitHub”。GitHub Token 永远只放在 Vercel 环境变量中，不写进前端。

在线编辑发布链路：

`浏览器管理后台 → Vercel API → GitHub API → 更新 main → GitHub Actions → GitHub Pages`

---

## 1. 备份你当前 GitHub 仓库（强烈建议）

打开：

`https://github.com/wlzts/AI_Page`

点击 **Code → Download ZIP**，保存一份当前仓库备份。

不要删除你原来的 9 个项目目录：

- `projects/Basketball-Position-Matching/`
- `projects/Fit-Meal/`
- `projects/basketball-shot/`
- `projects/do-divination/`
- `projects/eat-what/`
- `projects/gomoku/`
- `projects/wash-hair/`
- `projects/white-house-master/`
- `projects/wordvideo/`

V8 只需要覆盖根入口、共享数据、新增后台文件，并补全 `projects/playable-resume/`。

---

## 2. 把 V8 文件上传到 GitHub

### 方案 A：完全不用 Git 软件（推荐你使用）

1. 解压本项目 ZIP。
2. 打开 `https://github.com/wlzts/AI_Page`。
3. 点击 **Add file → Upload files**。
4. 将解压后的**根目录中的文件和文件夹**拖进上传区域。
5. 不要拖 ZIP 本身，要拖 ZIP 解压后的内容。
6. GitHub 会覆盖同名文件，但不会主动删除仓库中没有被上传的旧项目文件。
7. Commit message 填：
   `Integrate playable resume V8`
8. 选择 **Commit directly to the main branch**。
9. 点击 **Commit changes**。

### 上传后根目录至少应看到

```text
.github/
api/
projects/
server-lib/
.env.example
.gitignore
.nojekyll
index.html
projects-data.js
package.json
vercel.json
DEPLOY_GITHUB.md
README.md
```

并确认：

```text
projects/playable-resume/index.html
projects/playable-resume/resume-data.js
projects/playable-resume/editor.js
projects/playable-resume/app.js
projects/playable-resume/game.js
projects/playable-resume/style.css
projects/playable-resume/assets/
```

---

## 3. GitHub Pages 改成 GitHub Actions

因为仓库包含 Vercel 后端源码，我们不希望 `api/`、`server-lib/`、`.env.example` 被 GitHub Pages 当静态文件公开发布，所以 V8 使用自定义 GitHub Actions 只发布静态站点。

操作：

1. 打开仓库 **Settings**。
2. 左侧选择 **Pages**。
3. 找到 **Build and deployment**。
4. `Source` 改成 **GitHub Actions**。
5. 回到仓库顶部，打开 **Actions**。
6. 找到 **Deploy AI_Page to GitHub Pages**。
7. 等待两个 Job：
   - `build`
   - `deploy`
   都变成绿色勾。

首次部署通常只需要等待一会儿。

部署成功后打开：

`https://wlzts.github.io/AI_Page/`

再打开：

`https://wlzts.github.io/AI_Page/projects/playable-resume/`

---

## 4. 创建 GitHub Fine-grained Token

这个 Token 只给 Vercel 后端使用。

GitHub：

1. 右上角头像 → **Settings**。
2. 左侧最下面 → **Developer settings**。
3. **Personal access tokens → Fine-grained tokens**。
4. 点击 **Generate new token**。
5. Token name：`AI_Page Admin Publisher`。
6. Expiration：建议设置有效期，不要永久 Token。
7. Resource owner：`wlzts`。
8. Repository access：选择 **Only select repositories**。
9. 只选择 `AI_Page`。
10. Repository permissions → **Contents → Read and write**。
11. 生成 Token。
12. 立即复制 Token 到安全位置；不要发到聊天、不要提交到 GitHub。

如果以后 Token 过期，只需要在 Vercel 更换 `GITHUB_TOKEN`，不需要改网站代码。

---

## 5. 在 Vercel 创建后台 API

1. 登录 Vercel。
2. 点击 **Add New → Project**。
3. Import Git Repository。
4. 选择 GitHub 仓库 `wlzts/AI_Page`。
5. Framework Preset 可以保持 **Other**。
6. Root Directory 保持仓库根目录。
7. 暂时不要发布或先直接 Deploy 都可以，环境变量下一步补。

项目已经包含：

```text
api/login.js
api/publish.js
api/health.js
server-lib/security.js
vercel.json
package.json
```

Vercel 会把 `api/*.js` 作为服务端 Functions。

---

## 6. 配置 Vercel 环境变量

Vercel 项目：

**Settings → Environment Variables**

添加下面这些变量：

```text
GITHUB_OWNER=wlzts
GITHUB_REPO=AI_Page
GITHUB_BRANCH=main
RESUME_DATA_PATH=projects/playable-resume/resume-data.js
PROJECTS_DATA_PATH=projects-data.js
GITHUB_TOKEN=你刚刚创建的GitHubFineGrainedToken
ADMIN_PASSWORD=你自己设置的强管理员密码
SESSION_SECRET=至少32个字符的随机字符串
ALLOWED_ORIGINS=https://wlzts.github.io
```

### SESSION_SECRET 示例格式

不要直接使用下面这个示例值，自己生成一条新的：

```text
9qs7YJ3m2P8xv1L0Rk6Qw4Nc7Fa5Zu8D
```

至少 32 个字符。

### 环境范围

最简单：Production / Preview / Development 都勾选。

保存环境变量后，**重新 Deploy 一次 Vercel**。环境变量改变后应重新部署，让新的 Function 实例加载配置。

---

## 7. 检查 Vercel API 是否成功

假设你的 Vercel 地址是：

`https://ai-page-admin.vercel.app`

浏览器打开：

`https://ai-page-admin.vercel.app/api/health`

正常应返回 JSON，包含：

```json
{
  "ok": true,
  "configured": true
}
```

如果 `configured` 是 `false`，说明环境变量没有填写完整或没有重新部署。

---

## 8. 第一次登录在线管理后台

打开：

`https://wlzts.github.io/AI_Page/projects/playable-resume/?admin=1`

点击 / 打开管理员模式后：

1. API 地址填写你的 Vercel 域名，例如：
   `https://ai-page-admin.vercel.app`
2. 输入 `ADMIN_PASSWORD`。
3. 登录。
4. 修改简历或 AI 作品库。
5. 可以先点 **保存本地草稿**。
6. 确认无误后点 **发布到 GitHub**。

发布成功后：

- `projects/playable-resume/resume-data.js`
- `projects-data.js`

会在同一个 GitHub commit 中被修改。

然后 `main` 分支的新 commit 会自动触发 GitHub Pages 工作流。

---

## 9. 如何确认“一键发布”真的成功

发布后按顺序检查：

1. GitHub 仓库 `Commits` 出现一条新的管理员发布 commit。
2. 打开 `projects/playable-resume/resume-data.js`，确认资料已经变化。
3. 打开 `projects-data.js`，确认 AI 作品变化。
4. GitHub `Actions` 中出现新的 Pages workflow。
5. Workflow 变绿。
6. 刷新 GitHub Pages 正式地址。

如果浏览器仍显示旧内容：

- 强制刷新：Windows `Ctrl + F5`；Mac `Cmd + Shift + R`。
- 等待 GitHub Pages deployment 完成后再刷新。

---

## 10. 常见错误

### A. GitHub Actions 红色

先打开 Actions → 失败的 workflow → 点失败 Job 查看日志。

重点检查：

- Settings → Pages → Source 是否为 `GitHub Actions`
- `.github/workflows/pages.yml` 是否真的在 main 分支
- 仓库 Actions 是否启用

### B. 管理后台提示 403 / Token 权限不足

检查 Fine-grained Token：

- Resource owner = `wlzts`
- Repository = `AI_Page`
- Contents = `Read and write`
- Token 没有过期

更新 Vercel `GITHUB_TOKEN` 后重新 Deploy。

### C. 管理后台提示“当前网站来源未被允许”

Vercel：

```text
ALLOWED_ORIGINS=https://wlzts.github.io
```

注意不要填写路径：

错误：
`https://wlzts.github.io/AI_Page/`

正确：
`https://wlzts.github.io`

### D. 可玩简历能开，但旧项目 404

说明上传时把旧项目目录删掉了。

从备份恢复这 9 个目录，或者从 Git 历史恢复。

### E. Vercel health 能开但 `configured:false`

环境变量没有填完整，或者修改环境变量后没有重新部署。

---

## 11. 日常维护以后只需要这样

以后不需要改代码：

```text
打开管理员后台
→ 登录
→ 修改简历 / AI 作品
→ 预览
→ 发布到 GitHub
→ 等待 GitHub Pages 自动部署
```

只有新增一个全新的独立网页程序时，才需要先把它的文件上传到：

`projects/新项目目录/`

然后在管理后台“AI 作品库”里增加对应项目条目。

---

## 12. 安全注意事项

绝对不要把以下真实值写入 GitHub 仓库：

- `GITHUB_TOKEN`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`

`.env.example` 只能放变量名称和示例占位符。

如果 Token 曾经被提交进公开仓库，请立刻撤销并生成新的 Token。
