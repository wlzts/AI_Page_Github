# 定格动画工坊 / Stop Motion Studio

一个真正可运行、完全在浏览器本地工作的定格动画制作器。技术栈：React + TypeScript + Vite + Tailwind CSS。

## 已实现

- 摄像头权限、实时预览、摄像头选择、前后摄像头切换
- Space 快捷键拍摄，真实 `video -> canvas -> Blob` 帧捕获
- Onion Skin：上一帧半透明覆盖 + 透明度调节
- Timeline：缩略图、单选/多选、拖动排序、复制、删除、清空、自动滚动
- 动画播放：Play / Pause / Previous / Next / Loop
- FPS：1 / 2 / 4 / 6 / 8 / 10 / 12 / 15 / 24，默认 8
- JPG / PNG / WEBP 多图导入
- Animated GIF 导出（gifenc，本地编码）
- WebM 导出（MediaRecorder + canvas.captureStream；浏览器不支持时明确禁用）
- 导出 FPS、分辨率、GIF 循环、文件名、进度显示
- IndexedDB 项目保存、自动保存、新建、载入；刷新页面不丢项目
- Ctrl/Cmd + Z 撤销；Ctrl/Cmd + Shift + Z 重做
- 删除、拍摄、复制、排序均可撤销
- 深色专业创作工具界面 + 移动端响应式布局

## 本地运行

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```

> 摄像头 API 要求安全上下文。`localhost` 可直接使用；线上请使用 HTTPS。GitHub Pages / Vercel 均满足。

## 放入 AI_Page_Github

目标仓库当前已经有：

```text
projects/stop-motion-studio-github/
```

直接用本项目全部文件覆盖该目录即可。仓库的 `projects-data.js` 已经有 `path: "stop-motion-studio-github"` 的“定格动画”条目，因此无需再新增项目卡片数据。

### 重要：Vite 源码不能直接当静态页面访问

仓库主页当前是静态站，而本目录是 Vite 源码。你需要选择其中一种发布方式：

1. **推荐：在 CI / 本地构建后，把 `dist/` 内容发布到最终 `projects/stop-motion-studio-github/` 静态目录。**
2. 或将这个子项目单独部署到 Vercel / GitHub Pages，再把 `projects-data.js` 的 `externalUrl` 指向部署地址。

`vite.config.ts` 使用 `base: './'`，所以构建产物使用相对资源路径，可安全部署到 GitHub Pages / Vercel 的任意子路径。

## 浏览器兼容说明

- 摄像头：现代 Chrome / Edge / Safari / Firefox，需 HTTPS 或 localhost。
- GIF：纯浏览器 JS 编码，兼容性高；大量高清帧会占用较多 CPU / 内存，建议 480p 或 720p。
- WebM：依赖 `MediaRecorder` 和 `canvas.captureStream()`；部分 Safari 版本可能不支持，因此界面会自动禁用 WebM，而不是伪造导出。
- MP4：未提供。纯浏览器环境中无法保证跨浏览器可靠编码 MP4。

## 数据与隐私

所有帧、缩略图、项目设置都保存在当前浏览器的 IndexedDB 中。应用不会把照片上传到服务器。
