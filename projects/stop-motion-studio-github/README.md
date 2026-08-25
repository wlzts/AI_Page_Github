# Stop Motion Studio — GitHub Pages Ready

这是一个可直接部署到 GitHub Pages 的 React + TypeScript + Vite 定格动画应用。

## 最简单的 GitHub 部署方法（不需要在电脑运行命令）

### 1. 新建 GitHub 仓库

1. 登录 GitHub。
2. 点击 **New repository**。
3. 仓库名可以任意，例如 `stop-motion-studio`。
4. 建议选择 **Public**。
5. 点击 **Create repository**。

### 2. 上传项目文件

1. 解压本项目 ZIP。
2. 在 GitHub 仓库页面点击 **Add file → Upload files**。
3. 上传解压后的项目内容。
4. 必须确保 `.github/workflows/deploy.yml` 也进入仓库。
5. 点击 **Commit changes**。

> 注意：不要把 ZIP 本身直接上传到仓库；GitHub 不会自动解压它。要先在电脑上解压，再上传里面的文件。

### 3. 启用 GitHub Pages（只需要做一次）

进入：

**Repository → Settings → Pages → Build and deployment → Source → GitHub Actions**

选择 GitHub Actions 后返回仓库。

### 4. 等待自动部署

进入仓库的 **Actions** 标签页。

看到 `Deploy Stop Motion Studio to GitHub Pages` 变成绿色 ✓ 后，打开：

**Settings → Pages**

即可看到网址，一般类似：

`https://你的用户名.github.io/你的仓库名/`

在手机浏览器打开这个 HTTPS 地址，即可请求手机摄像头权限。

## 为什么仓库名可以任意？

`vite.config.ts` 已设置：

```ts
base: './'
```

构建后的资源使用相对路径，因此不需要提前知道 GitHub 仓库名。

## 后续更新

以后只需要继续向 `main` 分支上传/提交修改，GitHub Actions 会自动重新构建并部署。

## 本地运行（可选）

```bash
npm install
npm run dev
```

## 主要功能

- 摄像头拍摄与前/后摄像头切换
- Onion Skin 洋葱皮
- 帧 Timeline、拖拽排序、复制、删除
- FPS / Loop / 播放控制
- 图片导入
- GIF / WebM 浏览器端导出
- IndexedDB 本地项目持久化
- Undo / Redo

## 数据隐私

拍摄帧与项目数据保存在当前浏览器的 IndexedDB 中，不会因为部署到 GitHub Pages 就自动上传到 GitHub。
