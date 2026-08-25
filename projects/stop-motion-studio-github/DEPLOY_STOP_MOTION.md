# AI_Page_Github 定格动画子站部署补丁

这个目录按 `wlzts/AI_Page_Github` 仓库根目录组织，可直接把内容覆盖/合并到仓库根目录。

## 需要覆盖的两处

1. `projects/stop-motion-studio-github/`
   - 完整 React + TypeScript + Vite + Tailwind 源码。
2. `.github/workflows/pages.yml`
   - 在原有静态 Pages 工作流基础上增加子项目构建。
   - 构建后把 `dist/` 发布到最终 `projects/stop-motion-studio-github/` URL。

仓库现有 `projects-data.js` 已有：

- `title: "定格动画"`
- `path: "stop-motion-studio-github"`
- `visible: true`

因此这个补丁不覆盖 `projects-data.js`，避免破坏你现有其他项目配置。

## 使用方法

将本补丁目录内容复制到 `AI_Page_Github` 仓库根目录，确认覆盖 `.github/workflows/pages.yml` 和现有 `projects/stop-motion-studio-github/` 后提交到 `main`。

GitHub Actions 会自动：

1. 安装子项目依赖。
2. 执行 TypeScript 检查与 Vite 构建。
3. 保留 AI_Page 现有静态站文件。
4. 用构建后的 `dist` 替换发布包里的定格动画源码目录。
5. 部署到 GitHub Pages。

最终子站路径会是：

`https://<你的 GitHub 用户名>.github.io/AI_Page_Github/projects/stop-motion-studio-github/`

如果你主要使用 Vercel 的 `ai-page-github.vercel.app`，请确保 Vercel 的部署流程也执行同样的子项目构建；本补丁首先保证 GitHub Pages 路径可用。

## 本地验证

```bash
cd projects/stop-motion-studio-github
npm install
npm run build
npm run dev
```

摄像头线上必须处于 HTTPS 安全上下文；GitHub Pages 满足这一条件。
