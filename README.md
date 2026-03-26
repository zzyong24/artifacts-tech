# artifacts-tech

> 教学短视频素材库 · 口播稿 + 交互动画

把每一篇文章/笔记「立体化」：文章 → 口播稿 → 教学动画 → 视频。

## 目录结构

```
artifacts-tech/
├── works/
│   ├── index.html                      # 作品总览
│   ├── 01-text-is-interface/           # 文本是知识的接口
│   │   ├── index.html                  # 交互动画（GSAP）
│   │   ├── script.md                   # 提词器用（提纲稿）
│   │   ├── script-full.md              # 逐字稿归档
│   │   └── gsap.min.js
│   ├── 02-sop-to-skills/               # SOP → 技能：让经验真正传承
│   │   ├── index.html
│   │   ├── script.md
│   │   └── script-full.md
│   └── 03-made-to-stick/               # 让创意更有黏性（SUCCESs 六原则）
│       ├── index.html
│       ├── script.md
│       └── script-full.md
├── teleprompter/
│   └── index.html                      # 浏览器提词器（支持幻灯片同步）
├── vendor/
│   └── gsap.min.js                     # 共享动画库
├── tools/
│   └── render-video.js                 # 视频渲染工具（Puppeteer + ffmpeg）
└── .claude/
    ├── commands/
    │   ├── gen-slides.md               # 生成教学动画 Prompt
    │   └── gen-script.md               # 生成口播稿 Prompt
    └── visual-cognition/
        ├── ANIMATIONS.md               # 动画规范
        ├── FORMATS.md                  # 格式规范
        ├── PEDAGOGY.md                 # 教学认知原则（含 SUCCESs 框架）
        └── STYLES.md                   # 视觉风格规范
```

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/zzyong24/artifacts-tech.git
cd artifacts-tech
```

### 2. 启动本地服务

> **必须用 HTTP 服务访问，不能直接双击打开 HTML**（BroadcastChannel API 需要同源）

```bash
# 推荐：Node 自定义服务（带 Cache-Control: no-store，防缓存）
node tools/server.js

# 或 Python
python3 -m http.server 8888
```

服务启动后默认端口 **8888**。

### 3. 打开作品总览

```
http://localhost:8888/works/
```

### 4. 提词器联动

提词器与幻灯片通过 **BroadcastChannel**（频道 `slide-sync`）自动联动：

1. 打开提词器：`http://localhost:8888/teleprompter/`
2. 打开任意作品：`http://localhost:8888/works/01-text-is-interface/`
3. 点击幻灯片 → 提词器自动跳转 + 开始滚动

提词器快捷键：

| 按键 | 功能 |
|------|------|
| `Space` | 播放 / 暂停 |
| `R` | 回到顶部 |
| `↑ / ↓` | 调速 |
| `+ / -` | 调字号 |
| `M` | 镜像翻转 |
| `D` | 切换双栏对照（提纲稿 + 逐字稿） |

## 作品列表

| # | 主题 | 核心洞见 | 目录 |
|---|------|----------|------|
| 01 | 文本是知识的接口 | AI 时代，文字能力是最底层的技术能力 | `works/01-text-is-interface/` |
| 02 | SOP → 技能：让经验真正传承 | SOP 只是起点，内化才是终点 | `works/02-sop-to-skills/` |
| 03 | 让创意更有黏性 | 知识的诅咒 + SUCCESs 六原则 | `works/03-made-to-stick/` |

## 内容生产规范

### 口播稿（`/gen-script`）

- **双文件**：`script.md`（提词器用，提纲或逐字）+ `script-full.md`（逐字稿归档）
- **Slide 分段**：必须用 `### Slide N：名称`（三级标题），段间用 `---`
- **{step} 标记**：每段口播触发幻灯片 advance 的位置行末加 `{step}`
- **SUCCESs 校验**：生成后逐条过六原则，不通过直接修改

### 教学动画（`/gen-slides`）

- **动画引擎**：复杂时序 / stagger / SVG 描边必须用 GSAP（`./gsap.min.js`）
- **`showSlide` 规范**：必须包含 `resetSlide(n)` + `initStep(n)` + 自动触发第一步入场
- **`resetSlide(n)` 规范**：不能是空函数，按 slide 编号重置所有 GSAP 元素
- **提词器联动**：`load-script` 广播必须携带 `scriptUrl` 字段
- **`works/index.html` 链接**：必须用绝对路径（`/works/xxx/index.html`）

## 录制建议

- 浏览器全屏（`Cmd+Ctrl+F`）
- 录屏工具：QuickTime / OBS / Loom
- 分辨率：1920×1080 或 2560×1440
- 提词器开双栏对照模式，左看提纲，右备逐字稿
