# 定格动画工作室 / STOP MOTION STUDIO

纯静态、local-first 的浏览器定格动画工具。设计用于直接放入 `AI_Page_Github/projects/stop-motion-studio-github/`，无需 Node.js、Vite、React、后端或单独构建步骤。

## 文件

- `index.html`：页面结构、工具栏、摄像头舞台、拍摄控制、时间线和模态框。
- `style.css`：深色专业创作工具 UI、响应式桌面/手机布局、触控尺寸、焦点与克制动画。
- `app.js`：摄像头、拍照、洋葱皮、时间线编辑、FPS 播放、IndexedDB 自动保存、导入、Undo/Redo、WebM 导出等完整逻辑。

## 部署

把整个目录放到：

```text
projects/stop-motion-studio-github/
```

资源全部使用相对路径：

```text
./style.css
./app.js
```

返回主站使用：

```text
../../
```

因此在 GitHub Pages 项目站点中可通过以下形式访问：

```text
https://<username>.github.io/AI_Page_Github/projects/stop-motion-studio-github/
```

本项目不要求 `npm install`、`npm run build` 或任何服务端运行时。

## 功能

- `getUserMedia()` 真实摄像头调用，优先后置摄像头，可枚举设备和切换镜头。
- Canvas 裁切拍照，保存为压缩 JPEG Blob。
- 上一帧洋葱皮，0–100% 透明度。
- 多帧 Timeline：选择、删除、复制、左移、右移、桌面拖拽排序。
- 1–24 FPS，常用预设，循环播放。
- 导入多张本地图片并按当前画面比例 cover 裁切。
- IndexedDB 本地保存项目和 Blob；localStorage 仅保存当前项目 ID。
- Undo / Redo，最多 40 步。
- Canvas `captureStream()` + `MediaRecorder` 导出 WebM，并显示真实逐帧渲染进度和取消操作。
- 16:9、4:3、1:1、9:16。
- 桌面和移动端响应式布局。

## 测试建议

### 1. 摄像头

请通过 GitHub Pages 的 HTTPS 地址测试。首次点击“启动摄像头”时允许权限。拍摄 2–3 帧，打开“洋葱皮”，移动物体后确认上一帧以透明图像叠加在实时画面上。

直接以 `file://` 双击打开页面可以测试大部分导入/编辑功能，但浏览器通常不会允许摄像头；摄像头应在 HTTPS 或 localhost 下验证。

### 2. 保存

拍摄或导入几帧，修改 FPS、项目名或顺序；等待顶部显示“已保存”，刷新页面。当前项目应从 IndexedDB 恢复，包括帧 Blob、FPS、比例、循环和洋葱皮参数。

### 3. WebM 导出

拍摄/导入至少 2 帧，设置 FPS 后点击“导出”。进度会按实际逐帧绘制推进，完成后浏览器下载 `stop-motion-YYYY-MM-DD.webm`。

建议优先在最新版桌面 Chrome / Edge / Firefox 验证。Safari 对 `MediaRecorder`、WebM 编码和 `canvas.captureStream()` 的支持因系统版本而异，因此 Safari 上可能能拍摄与编辑，但不能稳定导出 WebM。

## 浏览器兼容性

- **Chrome / Edge（桌面、Android）**：推荐，摄像头、IndexedDB、Canvas 和 WebM 支持最好。
- **Firefox 桌面**：通常可用，编码器选择由浏览器支持情况决定。
- **iPhone / iPad Safari**：摄像头、导入、IndexedDB、编辑可用；WebM / `captureStream()` / `MediaRecorder` 支持受 iOS / Safari 版本限制，不能保证每个版本都能导出 WebM。
- 摄像头必须运行在安全上下文（HTTPS 或 localhost）。
- 桌面拖拽排序基于 HTML5 Drag & Drop；移动端仍可通过“左移 / 右移”完成可靠重排。

## 数据与隐私

所有照片和项目数据默认只保存在浏览器本地 IndexedDB，不上传服务器。本项目没有后端、账号系统、API Key 或第三方上传服务。
