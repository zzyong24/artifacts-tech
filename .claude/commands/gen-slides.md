# /gen-slides — 生成教学动画 HTML

根据作品目录下的口播稿，生成一套符合规范的交互式 GSAP 教学动画，保存为 `index.html`。

## 使用方式

```
/gen-slides <作品目录名>
```

**参数说明：**
- `<作品目录名>`：作品文件夹名，如 `02-llm-context`（必须已有 `script.md`）

**示例：**
```
/gen-slides 02-llm-context
```

---

## 执行步骤

### Step 1：读取配置

读取 `.claude/artifacts.config.json`，获取：
- `prompts.slides`：动画生成器 Prompt 模板路径
- `works_dir`：作品根目录

如果配置文件不存在，提示用户：
> `.claude/artifacts.config.json` 不存在，请复制 `.claude/artifacts.config.example.json` 并填入本机路径。

### Step 2：读取口播稿

读取 `<works_dir>/<作品目录名>/script.md`。

如果文件不存在，提示：
> 未找到口播稿，请先执行 `/gen-script <作品目录名>` 生成口播稿。

### Step 3：读取动画规范

读取 `prompts.slides` 路径下的 Markdown 文件，提取：
- 统一视觉规范（CSS 变量、配色、字体）
- GSAP 动画规范（缓动、时长、触发方式）
- Slide 结构规范（1920×1080、scale 响应式）
- 动画选择矩阵（按认知目标选择动画类型）
- 禁止事项

### Step 4：叙事骨架规划

按口播稿的 Slide 对应关系表，拆分认知单元：
- 每个口播段落 = 一张 Slide
- 每张 Slide 只有一个认知中心
- 根据「动画选择矩阵」为每张 Slide 选定动画类型

### Step 5：生成 HTML

严格遵循动画规范生成单文件 `index.html`：

**视觉规范（必须遵守）：**
- 配色：`--bg: #faf8f3`（暖白）/ `--accent: #b5700f`（琥珀棕）等暖色系
- 字体：系统字体栈，固定 px（基于 1920px 画布，不用 vw/clamp）
- 基准尺寸：1920×1080，用 `transform: scale()` 响应式

**动画规范（必须遵守）：**
- 引擎：GSAP（使用本地 `./gsap.min.js`，不用 CDN）
- 全部用户点击/键盘触发，禁止自动播放
- 动画时长 0.4–0.7s，不超过 1s
- 每张 Slide 入场时自动触发第一步
- 切换 Slide 时 reset 元素状态

**自我检查清单（生成后逐条验证）：**
- [ ] 无 bullet point 列表（改为 layout 或动画）
- [ ] 每张 Slide 只有一个认知单元
- [ ] 无自动播放动画
- [ ] 背景色统一为 `--bg`
- [ ] 口播文字未直接搬到 Slide（提炼核心词）
- [ ] 无 `setInterval` 无限循环
- [ ] 动画时长均在 0.4–0.7s
- [ ] 字体使用固定 px，不用 clamp/vw
- [ ] GSAP 使用本地文件 `./gsap.min.js`

### Step 6：复制 GSAP 依赖

检查 `<works_dir>/<作品目录名>/gsap.min.js` 是否存在：
- 不存在 → 从 `works/01-text-is-interface/gsap.min.js` 复制过去

### Step 7：保存并确认

保存 `<works_dir>/<作品目录名>/index.html`，告知用户：
- 文件路径
- 共几张 Slide
- 访问地址：`http://localhost:<server_port>/<works_dir>/<作品目录名>/index.html`
- 如果本地服务未启动：`cd <project_root> && python3 -m http.server <server_port>`
