Stop Motion Studio - GitHub Pages 部署包

把本压缩包解压后得到的 .github 和 projects 两个目录，直接复制到 AI_Page_Github 仓库根目录。
不要把 stop-motion-studio-deploy-ready 这一层目录上传进仓库。

正确结构：
AI_Page_Github/
  .github/workflows/pages.yml
  projects/stop-motion-studio-github/
    package.json
    vite.config.ts
    index.html
    src/...

然后：
1. 提交并 push 到 main 分支。
2. 打开 GitHub 仓库 -> Settings -> Pages。
3. Build and deployment -> Source 选择 GitHub Actions。
4. 打开 Actions，确认 Deploy AI_Page to GitHub Pages 工作流执行成功。
5. 访问：
   https://wlzts.github.io/AI_Page_Github/projects/stop-motion-studio-github/

如果仓库是 private：GitHub Free 通常不能用私有仓库发布公开 Pages，请改为 public 或确认你的账户套餐支持私有仓库 Pages。
