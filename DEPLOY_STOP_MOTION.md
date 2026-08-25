# 将 Stop Motion Studio 合并到 AI_Page_Github

这个补丁只包含两部分：

1. `projects/stop-motion-studio-github/`：完整 React/Vite 子项目。
2. `.github/workflows/pages.yml`：在现有 Pages 工作流中加入该子项目的 Vite 构建步骤。

## 合并方式

把补丁目录中的文件按相同路径复制到仓库根目录，覆盖同名文件，然后提交到 `main`。

建议提交信息：

```text
Build Stop Motion Studio subsite
```

推送后，GitHub Actions 中的 `Deploy AI_Page to GitHub Pages` 会：

- 安装并构建 `projects/stop-motion-studio-github/`
- 保留仓库现有静态站点
- 用构建后的 `dist/` 发布该子路径

预期访问地址：

```text
https://wlzts.github.io/AI_Page_Github/projects/stop-motion-studio-github/
```

## 本地验证

进入子项目目录：

```bash
npm install
npm run build
npm run dev
```

摄像头测试请使用 `localhost` 或 HTTPS 环境；直接双击本地 HTML 文件通常不能获得摄像头权限。
