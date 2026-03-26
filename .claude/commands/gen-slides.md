# /gen-slides — 生成教学动画 HTML

根据作品目录下的口播稿，生成一套符合规范的交互式教学动画，保存为 `index.html`。

动画引擎基于 **visual-cognition-slides**（爱思考的伊伊子）——认知科学驱动的教学设计体系。

## 使用方式

```
/gen-slides <作品目录名>
```

**示例：**
```
/gen-slides 02-sop-to-skills
```

---

## 执行步骤

### Step 1：读取配置

读取 `.claude/artifacts.config.json`，获取：
- `prompts.slides`：动画规范目录路径（默认 `.claude/visual-cognition`）
- `works_dir`：作品根目录
- `server_port`：本地服务端口

### Step 2：读取口播稿

读取 `<works_dir>/<作品目录名>/script.md`。

如果文件不存在，提示：
> 未找到口播稿，请先执行 `/gen-script <作品目录名>` 生成口播稿。

### Step 3：加载动画规范

按需读取 `prompts.slides` 目录下的规范文件：

| 文件 | 用途 | 何时读取 |
|------|------|----------|
| `PEDAGOGY.md` | 叙事结构 + 知识类型诊断 + 认知科学原则 | 必读 |
| `STYLES.md` | 8 套主题完整 CSS 参数 | 必读 |
| `ANIMATIONS.md` | 动画库（10 章节完整代码） | 必读 |
| `FORMATS.md` | 画布规范 + 响应式 + 导航控制器 | 必读 |

### Step 4：叙事骨架 + 知识类型诊断

按口播稿的 Slide 对应关系表，逐张诊断：

**4.1 叙事结构选择**（参考 `PEDAGOGY.md` §一）
根据内容类型选择最合适的叙事结构（反差型 / 问题-解答型 / 递进解包型 / 身份认同型 / 故事型 / 框架型 / 对比型 / 时间线型）。

**4.2 每张 Slide 的知识类型诊断**（参考 `PEDAGOGY.md` §二）

对每张 Slide 的内容做知识类型判断，再选表达方式：

- 概念性知识（"X 是什么"）→ 类比动画 / 定义拆解
- 程序性知识（"怎么做 X"）→ 步骤动画 / 分支流程
- 叙事性知识（故事/案例）→ 场景构建 / 时间轴
- 关系性知识（"X 和 Y 的关系"）→ 动态连接图 / 矩阵
- 元认知知识（"为什么要这样想"）→ 两种心态对比
- 数据性知识（数字/规模感）→ 计数动画 / 比例填充

**4.3 动画类型映射**（参考 `PEDAGOGY.md` §三 + `ANIMATIONS.md`）

基于认知目标选动画，不基于内容形式：

| 认知目标 | 推荐动画 |
|----------|---------|
| 建立类比 | 双栏对应展开 + SVG 路径连线 |
| 展示过程/机制 | 流程节点 + 粒子移动 |
| 纠正误解 | 3D 翻转卡片 |
| 规模感/数量感 | 计数动画 / 比例填充格子 |
| 情绪钩子 | 打字机效果 / 大字冲击 |
| 建立框架 | 混乱→有序排列 / 矩阵展开 |
| 哲学延伸 | 大字渐显 + 分隔线生长 |

### Step 5：主题选择

根据内容性质选择最合适的主题（参考 `STYLES.md`）：

- 教育科普 / 社媒口播 → **主题 1：手绘创意**（默认）
- 技术分享 / 产品发布 → **主题 4：深色极简**
- 学术讲座 → **主题 2：学术简约**
- 数据分析 → **主题 6：科研极客**
- 抽象原理 → **主题 8：纯动画概念**

### Step 6：生成 HTML

严格遵循规范生成单文件 `index.html`：

**必须遵守：**
- 使用选定主题的完整 CSS 变量（`STYLES.md`）
- 使用 `FORMATS.md` 中的 `scaleCanvas()` 响应式缩放
- 使用 `FORMATS.md` 中的 `SlideController` 导航控制器
- 字号使用 `clamp()` 系统，不用固定 px
- 动画全部用户点击触发，不自动播放
- GSAP 使用本地 `./gsap.min.js`（不用 CDN）
- 所有图标内联为 SVG（不用外部路径）
- 每张 Slide 只承载一个认知单元

**自我检查清单（生成后逐条验证）：**
- [ ] 无 bullet point 列表（改为 layout 或动画）
- [ ] 每张 Slide 只有一个认知单元
- [ ] 无自动播放动画
- [ ] 背景色统一为主题 `--bg`
- [ ] 口播文字未直接搬到 Slide（提炼核心词）
- [ ] 无 `setInterval` 无限循环
- [ ] 字号使用 clamp() 或 CSS 变量，不硬编码 px
- [ ] GSAP 使用本地 `./gsap.min.js`
- [ ] 所有 SVG 已内联，无外部路径引用
- [ ] 动画选择有认知目标依据（不是随意选的）

### Step 7：复制 GSAP 依赖

检查 `<works_dir>/<作品目录名>/gsap.min.js` 是否存在：
- 不存在 → 从 `works/01-text-is-interface/gsap.min.js` 复制

### Step 8：更新 works/index.html

生成完成后，更新 `works/index.html` 的作品列表（若索引页存在），将新作品卡片加入。

### Step 9：保存并确认

保存 `<works_dir>/<作品目录名>/index.html`，告知用户：
- 文件路径
- 共几张 Slide
- 使用了哪个主题
- 本次 Slide 的知识类型分布（各 Slide 的诊断结果）
- 访问地址：`http://localhost:<server_port>/<works_dir>/<作品目录名>/index.html`
- 索引页：`http://localhost:<server_port>/<works_dir>/index.html`
