# 定格动画工作室 Stop Motion Studio

一个完全在浏览器本地运行的定格动画制作器，使用 React + TypeScript + Vite + Tailwind CSS。

## 功能

- 摄像头实时预览、前后摄像头切换与设备选择
- Space 快捷键拍摄、闪光与轻微快门反馈
- Onion Skin 洋葱皮与透明度调节
- 帧时间轴：查看、删除、复制、拖拽排序、多选、清空
- 1 / 2 / 4 / 6 / 8 / 10 / 12 / 15 / 24 FPS
- 播放 / 暂停 / 上一帧 / 下一帧 / 循环
- 导入 JPG / PNG / WEBP
- 浏览器端导出 Animated GIF / WebM
- IndexedDB 本地项目保存、打开、刷新恢复
- Ctrl/Cmd + Z 撤销，Ctrl/Cmd + Shift + Z 重做
- 桌面与手机响应式布局

## 本地开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

产物位于 `dist/`。`vite.config.ts` 使用 `base: './'`，适合部署在 GitHub Pages 的任意子路径。

## 部署到 AI_Page_Github

把本目录放在：

```text
projects/stop-motion-studio-github/
```

并使用本补丁提供的根目录 `.github/workflows/pages.yml`。工作流会先构建本子项目，再把 `dist/` 覆盖到最终 Pages 的同一路径中。

上线后路径为：

```text
https://wlzts.github.io/AI_Page_Github/projects/stop-motion-studio-github/
```

摄像头 API 需要安全上下文。GitHub Pages 使用 HTTPS，可直接请求摄像头权限。

## 隐私

所有帧和项目数据只保存在当前浏览器 IndexedDB；GIF / WebM 也在浏览器本地编码，不上传服务器。
