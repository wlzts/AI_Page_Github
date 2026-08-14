# LyricType - 极简歌词学习应用

一个基于Web的歌词学习应用，支持GitHub模板自动加载、字符级实时验证、全端适配等特性。

## 功能特性

### 🎵 GitHub模板自动识别
- 支持最多5个模板文件
- 自动检测并加载GitHub仓库中的模板文件
- 模板文件命名规则：`lyrictype-template{number}.mp3` + `lyrictype-template{number}.lrc`

### ⚡ 字符级实时验证
- 逐字检测输入正确性
- 实时高亮反馈（正确绿色、错误红色、待输入灰色）
- 精准提升歌词拼写能力

### 📱 全端适配
- 完美适配手机、平板、桌面设备
- 响应式设计，随时随地享受流畅的学习体验

## 快速开始

### 方法1：使用GitHub模板（推荐）

1. **准备模板文件**
   - 创建音频文件：`lyrictype-template1.mp3`（MP3格式）
   - 创建歌词文件：`lyrictype-template1.lrc`（标准LRC格式）

2. **LRC歌词格式**
   ```
   [00:01.00]英文歌词|中文翻译
   [00:05.00]下一句英文歌词|下一句中文翻译
   ```

3. **上传到GitHub**
   - 将文件上传到GitHub仓库根目录
   - 部署GitHub Pages
   - 访问页面，系统会自动检测并加载模板文件

### 方法2：自定义上传

1. **准备文件**
   - 音频文件（MP3/WAV格式）
   - 歌词文件（LRC格式，支持中英文对照）

2. **上传文件**
   - 点击"自定义上传文件"按钮
   - 同时选择音频文件和歌词文件
   - 系统自动解析并加载

## 本地开发

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd lyrictype
   ```

2. **启动本地服务器**
   ```bash
   # 使用Python
   python -m http.server 8000
   
   # 或使用Node.js
   npx serve .
   
   # 或使用PHP
   php -S localhost:8000
   ```

3. **访问应用**
   - 打开浏览器访问：`http://localhost:8000`

## 项目结构

```
lyrictype/
├── index.html          # 主页面文件
├── lyrictype-template1.lrc  # 示例歌词文件
└── README.md           # 项目说明文档
```

## 技术栈

- **前端**：HTML5, CSS3, JavaScript (ES6+)
- **样式**：原生CSS + CSS变量
- **字体**：Inter（Google Fonts）
- **存储**：IndexedDB（本地缓存）
- **部署**：GitHub Pages

## 浏览器兼容性

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

## 使用说明

### 基础操作

1. **加载模板**：访问页面后，系统会自动检测并加载GitHub模板
2. **开始练习**：点击"开始练习"按钮
3. **输入歌词**：根据显示的歌词，在输入框中正确输入
4. **实时反馈**：系统会实时高亮显示输入的正确性
5. **完成练习**：完成所有歌词输入后，系统会显示完成提示

### 高级功能

- **时间微调**：±0.1秒微调音频播放时间
- **导出歌词**：导出包含时间微调的歌词文件
- **清除缓存**：清除本地缓存的音频和歌词数据

## 模板文件示例

### LRC文件示例（lyrictype-template1.lrc）
```
[00:01.00]Hello world, this is a test|你好世界，这是一个测试
[00:05.00]Learning lyrics with LyricType|使用LyricType学习歌词
[00:09.00]Type the words correctly|正确输入单词
[00:13.00]Improve your spelling skills|提升你的拼写能力
[00:17.00]Have fun learning English|快乐学习英语
```

### 音频文件
- 格式：MP3
- 时长：建议与LRC歌词时间点匹配
- 命名：`lyrictype-template1.mp3`

## 注意事项

1. **音频格式**：仅支持MP3格式的音频文件
2. **歌词格式**：必须为标准LRC格式，支持中英文对照
3. **文件大小**：建议音频文件大小不超过10MB，以保证加载速度
4. **GitHub Pages**：确保GitHub Pages已正确部署
5. **浏览器权限**：某些浏览器可能需要用户授权才能播放音频

## 故障排除

### 模板文件无法加载
- 检查文件名是否正确（区分大小写）
- 确认文件已上传到GitHub仓库根目录
- 验证GitHub Pages是否已部署
- 尝试清除浏览器缓存后刷新页面

### 音频无法播放
- 检查音频文件格式是否为MP3
- 确认浏览器支持音频播放
- 尝试使用其他浏览器
- 检查浏览器音频权限设置

### 歌词显示异常
- 检查LRC文件格式是否正确
- 确保时间戳格式为`[mm:ss.xxx]`
- 验证中英文歌词分隔符为`|`

## 贡献指南

欢迎提交Issue和Pull Request来改进这个项目！

## 许可证

MIT License

## 更新日志

### v1.0.0 (2024-01-27)
- ✨ 初始版本发布
- 🎵 GitHub模板自动识别功能
- ⚡ 字符级实时验证
- 📱 全端适配
- 💾 本地缓存支持
- 🎨 黑色极简设计风格
