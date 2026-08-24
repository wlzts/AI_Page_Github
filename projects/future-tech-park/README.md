# NOVA FRONTIER — Starship Academy Edition

一个纯前端、可直接部署到 GitHub Pages 的原创经典太空歌剧互动网页。

## 这一版新增

- 9 种真正不同的随机训练：神经反应、脉冲记忆、反应堆充能、雷达锁敌、舰桥译码、跃迁校准、护盾调度、小行星规避、异常信号识别
- 连胜系统、最高连胜、九科完成进度、额外 XP 奖励
- 新成就：学院荣誉章、红线学员
- 更明亮的舰桥蓝 / 仪表琥珀 / 红色警戒视觉体系
- 原创经典太空歌剧界面语言：战术终端、切角面板、舰桥仪表、星港与深空舰队氛围
- 保留可驾驶 Three.js 飞船、3 项飞行任务、NPC、音乐、称号、XP、排行榜和彩蛋

> 视觉采用原创设计，不包含或一比一复制现有影视作品的具体舰船、Logo、角色标识或舰桥 UI。

## 本地运行

```bash
python -m http.server 8000
```

然后访问：

```text
http://localhost:8000
```

macOS / Linux 可使用 `python3 -m http.server 8000`。

## GitHub Pages

把本目录中的 `index.html`、`style.css`、`script.js`、`.nojekyll` 上传到仓库根目录，然后在 GitHub Pages 中选择 `main` 分支 `/ (root)` 发布。

Three.js 通过 jsDelivr CDN 加载，因此 3D 场景第一次打开需要联网。
