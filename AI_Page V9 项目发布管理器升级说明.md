# AI_Page V9 项目发布管理器升级说明

这是针对当前仓库 `wlzts/AI_Page_Github` 的 **V8 → V9 覆盖升级包**。它不会包含或覆盖现有 AI 项目素材，只新增项目发布管理器与对应安全 API。

## 新增能力

- 网页管理员直接选择整个本地项目文件夹。
- 根目录必须包含 `index.html`。
- 自动忽略 `.git`、`node_modules`、`.idea`、`.vscode` 等目录。
- 文件先逐个创建成 GitHub Git Blob；全部成功后再一次性创建 Git Tree + Commit。
- 新项目自动写入 `projects/<目录名>/` 并同步更新 `projects-data.js`。
- 覆盖已有项目时，会删除旧目录中本次没有上传的旧文件。
- 删除项目时，会一次 commit 删除整个项目目录并移除 `projects-data.js` 条目。
- `projects/playable-resume/` 是系统保留目录，项目发布器禁止覆盖/删除。
- GitHub Token 仍只存在 Vercel 环境变量中。

## 上传到 GitHub

把本升级包解压后，将 **里面的内容**上传并覆盖到仓库根目录：

```text
AI_Page_Github/
├── api/
│   ├── project-blob.js        ← 新增
│   ├── project-publish.js     ← 新增
│   └── project-delete.js      ← 新增
├── server-lib/
│   ├── github.js              ← 新增
│   └── project-manager.js     ← 新增
├── projects/playable-resume/
│   ├── project-manager.html   ← 新增
│   ├── project-manager.css    ← 新增
│   └── project-manager.js     ← 新增
├── vercel.json                ← 替换
└── package.json               ← 替换（版本更新到 V9）
```

原来的这些文件 **不要删除**：

```text
api/health.js
api/login.js
api/publish.js
server-lib/security.js
projects/playable-resume/index.html
projects/playable-resume/editor.js
projects/playable-resume/game.js
projects/playable-resume/app.js
projects/playable-resume/resume-data.js
projects-data.js
```

建议 Commit message：

```text
Upgrade to V9 project publisher
```

## Vercel

上传到 GitHub 后，Vercel 通常会自动触发新部署。若没有：

```text
Vercel → cjx-page → Deployments → 最新部署 → Redeploy
```

V9 不需要新增环境变量，继续使用当前已经配置成功的：

```text
GITHUB_OWNER=wlzts
GITHUB_REPO=AI_Page_Github
GITHUB_BRANCH=main
PROJECTS_DATA_PATH=projects-data.js
GITHUB_TOKEN=...
ADMIN_PASSWORD=...
SESSION_SECRET=...
ALLOWED_ORIGINS=...
```

Fine-grained Token 继续只需要目标仓库 `Contents: Read and write`。

## 打开 V9 发布器

线上地址为：

```text
https://你的正式域名/projects/playable-resume/project-manager.html
```

GitHub Pages 示例：

```text
https://wlzts.github.io/AI_Page_Github/projects/playable-resume/project-manager.html
```

如果你使用自定义域名或 EdgeOne，路径保持相同。

第一次登录填写当前 Vercel API：

```text
https://cjx-page.vercel.app
```

管理员密码就是 Vercel 的 `ADMIN_PASSWORD`。

## 创建新作品

1. 打开 V9 项目发布管理器。
2. 填作品名称、目录名、分类、简介等。
3. 点击“选择整个项目文件夹”。
4. 文件夹根目录必须包含 `index.html`。
5. 检查文件树与大小。
6. 点击“发布到 GitHub”。
7. V9 先逐文件创建 Git Blob；此时正式仓库分支不会变化。
8. 所有文件成功后，V9 一次性创建最终 Git commit，同时：
   - 写入 `projects/<slug>/...`
   - 更新 `projects-data.js`
9. GitHub Pages / EdgeOne 检测到仓库更新后重新部署。

## 当前上传限制

为了安全避开 Vercel Function 单次 4.5 MB 请求体限制，V9 当前设置：

- 单文件最大约 **2.2 MB**。
- 单项目最多 **200 个文件**。
- 项目原始文件总大小最多 **30 MB**。
- 大图片建议压缩成 WebP/AVIF。
- 大视频建议使用外部对象存储/CDN，不要直接塞入网页项目仓库。

支持常见静态网页类型：HTML/CSS/JS/JSON/SVG/PNG/JPG/WebP/GIF/音频/小型视频/PDF/WASM/字体等。

## 覆盖项目

载入已有项目 → 选择新的完整项目文件夹 → 勾选“覆盖已有同名目录” → 发布。

V9 会让 GitHub 最终目录与本次上传内容保持一致：旧目录中本次没有的文件会被删除。

## 删除项目

右侧作品库点击“删除目录”，然后再次手动输入目录名确认。

该操作会：

- 删除 `projects/<slug>/` 下所有 GitHub 文件。
- 删除对应的 `projects-data.js` 条目。
- 生成一条独立 Git commit。

`playable-resume` 被硬编码保护，不允许删除。

## 为什么不会出现“半个项目”

上传阶段只创建 Git Blob 对象，不更新 `main`。只有全部文件成功后才创建新的 Git Tree、Commit 并更新 `main` 引用。因此中途断网/失败不会把未完成目录发布到正式站。
