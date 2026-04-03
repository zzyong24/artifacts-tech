# 项目记忆

## 项目概况
- 教学短视频素材库，包含口播稿 + 交互动画
- 使用 Claude Code Artifacts 工具生成内容
- 动画引擎：GSAP（本地 `./gsap.min.js`，在 vendor/ 目录下有共享版本）
- 命令入口：`.claude/commands/gen-slides.md`、`.claude/commands/gen-script.md`
- 动画规范：`.claude/visual-cognition/` 下四个文件（ANIMATIONS / FORMATS / PEDAGOGY / STYLES）

## 视频录制工具链（2026-03-27）
- **工具**：`tools/render-video.js`（Node.js + Puppeteer + ffmpeg）
- **原理**：解析 script.md 中的 `{step}` 标记 → 计算口播时长 → Puppeteer 截关键帧 → ffmpeg concat 合成 mp4
- **用法**：`NODE_PATH=... node tools/render-video.js <作品目录名> [--wpm 270 --padding 0.8 --fps 60]`
- **截帧策略**：每段口播一张帧（非连续截帧），每帧指定持续时长，速度极快（03 只需 89 张帧）
- **依赖**：puppeteer（安装在 `/Users/zyongzhu/.workbuddy/binaries/node/workspace/node_modules/`）
- **`{step}` 规范**：script.md 每段触发 advance 的位置行末加 `{step}`，数量对应 slideSteps 数组长度
- **已验证**：03-made-to-stick，6.9 分钟 6.5 MB mp4，输出 `works/03-made-to-stick/output.mp4`
- **{step} 标记已覆盖全部三个作品**（2026-03-27）：01/02/03 的 script.md 均已加入 {step}，与各自 slideSteps 数组精确对齐
- **用户录制决策**：放弃 Puppeteer 自动录制，改为自己录屏讲解；{step} 标记保留作为演讲提示用

## 口播稿格式决策（2026-03-27）
- **用户反馈**：逐字稿读起来很僵，不自然，也不利于日常交流表达
- **改为提纲稿**：每行只写思想节点关键词（→ 开头），自己组织语言讲，{step} 保留作为点击触发提示
- **已改造**：03-made-to-stick 改为提纲版；01/02 的 {step} 标记已加入但稿件形式待定
- **双文件规范（2026-03-27）**：三个作品均有两份稿件：`script.md`（提词器用，提纲/逐字稿）+ `script-full.md`（逐字稿归档）。01/02 的 script.md 目前仍是逐字稿，03 的 script.md 已改为提纲稿
- **提词器留白优化**：顶部 padding 改为 50vh，Slide 跳转锚点落在屏幕 40% 处（中间偏上），视线固定在中间不用追顶部
- **双栏对照模式（2026-03-27）**：提词器支持左提纲稿 + 右逐字稿同步滚动；D 键切换对照模式；加载逐字稿后自动开启；右栏按进度比例同步，也可独立手动滚动；Slide 跳转时两栏同步定位

## 仓库结构（2026-03-27 拆分）
- **框架仓库**（公开）：`git@github.com:zzyong24/artifacts-tech.git` → 本地 `/Users/zyongzhu/Workbase/artifacts-tech/`
- **作品仓库**（私有）：`git@github.com:zzyong24/my-techs.git` → 本地 `/Users/zyongzhu/Workbase/artifacts-tech/works/`
- works/ 目录就是 my-techs 的根目录，两个 git 仓库嵌套但互不干扰（框架 .gitignore 排除 `[0-9][0-9]-*/`）
- 提交规则：改框架 → artifacts-tech/ 提交；改作品 → works/ 提交推送到 my-techs

## 已有作品
- `01-text-is-interface`：用 GSAP 实现全部动画，效果好
- `02-sop-to-skills`：引入了 GSAP 但实际全用 CSS transition，动画质量较弱；提词器联动已于 2026-03-26 补加（拦截 goto/advance，BroadcastChannel slide-sync）
- `03-made-to-stick`：口播稿 + index.html 均已生成（2026-03-26），来源《让创意更有黏性》读书笔记，8 个 Slide，主题「知识的诅咒 + SUCCESs 六原则」，主题1手绘创意风格，GSAP 动画，提词器联动已内嵌
- `04-ai-content-system`：主题「用 AI 搭内容系统：凌晨两点半的故事」，7 张 Slide 深色极简风，含四处对话截图插入点 + WorkBuddy 软植入

## 提示词优化记录（2026-03-26）
**问题**：`gen-slides.md` 原来只写"GSAP 使用本地文件"，没有指导模型何时该用 GSAP，导致模型走最省力的 CSS 路线。

**修复**：在 Step 6 增加"动画技术选择原则"判断树：
- CSS 适合：单步淡入淡出、hover、无限循环装饰、单向生长
- **必须用 GSAP**：3步以上时序编排、stagger入场、弹性缓动、SVG描边、状态重置、多属性交错

同时将自我检查清单从"是否引入 GSAP"改为"符合条件的动画是否实际调用了 gsap API"。

**第二次修复（2026-03-26）**：
- 模板中 `slide: cur` 改为 `getCurrentSlide()`，兼容函数式（`cur`）和 OOP（`ctrl.cur`）两种架构
- 新增页面加载时发 `reset` 广播，通知提词器停止滚动+回顶部+等待演讲开始
- 提词器端新增 `reset` 消息处理：`resetScroll()` + `_scriptLoaded = false`
- 模板拆分为方案A（函数式）和方案B（OOP），注释说明二选一

**第三次修复（2026-03-26）- Slide 同步彻底失效问题**：
- **根因**：提词器 parser 只识别 `### Slide N`（h3），但 03 的 script.md 用 `## Slide N`（h2），02 根本没有 Slide 分段。`slideAnchors` 数组为空，`jumpToSlide` 进去直接 return。
- **修复1**：提词器 parser 改为同时识别 h2 + h3
- **修复2**：03 的 script.md 全部 `## Slide N` 改为 `### Slide N`
- **修复3**：02 的 script.md 重写，按 7 个 Slide 分段，每段 `### Slide N` 标题
- **修复4**：`gen-script.md` Step 5 新增格式规范说明（必须用 `### Slide N`，禁用 `##`）
- **修复5**：`gen-slides.md` Step 2 新增：发现 `## Slide N` 格式时自动修正为 `### Slide N`

## 2026-03-27 修复汇总（已同步至 prompt）

### Bug 修复
1. **反向回退动画残留（03-made-to-stick）**：`resetSlide()` 原为空函数，按 `←` 时 GSAP 元素停在中间状态。修复：实现完整 `resetSlide(n)`，`showSlide` 加入 `resetSlide` + `setTimeout(handleAdvance, 80)`
2. **works/index.html 404**：卡片链接用相对路径，从非 `/works/` 路径访问时丢失路径前缀。修复：改为绝对路径 `/works/xxx/index.html`
3. **提词器刷新后逐字稿消失**：`load-script` 消息未携带 `scriptUrl`，提词器无法自动 fetch `script-full.md`。修复：三个作品广播时附带 `scriptUrl: SCRIPT_URL`，提词器自动推导并 fetch 逐字稿

### prompt 更新（gen-slides.md）
- Step 7 注意事项：`load-script` 必须附带 `scriptUrl` 字段
- Step 7 新增：`showSlide` 完整模板（含 `resetSlide` + `initStep` + `broadcastSlide` + 自动入场）
- Step 7 新增：`resetSlide(n)` 必须实现，附重置对照表（入场方式 → 重置值）
- Step 9 新增：`works/index.html` 卡片链接必须用绝对路径

### prompt 更新（gen-script.md）
- Step 6 新增：双文件规范（`script.md` 提词器用 + `script-full.md` 逐字稿归档）
- 提纲稿格式说明（`→` 开头每行一个思想节点）
- **Slide 分段标题必须用 `### Slide N：名称`（三级标题）**
- 不能用 `## Slide N`（二级），提词器 parser 已升级兼容 h2，但规范要求 h3
- 每个 Slide 之间用 `---` 分隔
- 提词器靠 `Slide N` 字样识别锚点，缺少此格式则 Slide 同步完全失效

## ThirdSpace Prompts 同步（2026-03-26）
同步更新了 ThirdSpace 知识库中的两个 Prompt 文件：
- `/Users/zyongzhu/ThirdSpace/space/crafted/prompts/tools/AI教学动画生成器.md`
- `/Users/zyongzhu/ThirdSpace/space/crafted/prompts/tools/AI教学口播稿生成器.md`

主要变更：
1. 移除所有"伊伊子"相关引用（风格解剖、整合来源标注等）
2. 动画生成器：GSAP 改为本地文件引入（`./gsap.min.js`），同步动画技术选择判断树
3. 口播稿生成器：Prompt 末尾新增"Slide 对应关系表"输出要求，与动画生成器对接

## 提词器工具（2026-03-26）
新建 `teleprompter/index.html`：浏览器提词器，支持：
- 拖拽或选择 `.md` 文件，自动解析 Markdown（h1/h2/h3/p/blockquote/hr/ul/ol 等）
- 黑底大字，可调字号（16px～120px，默认 36px）
- 自动滚动，可调速度（range slider），`▶/⏸` 按钮 + Space 键切换
- 进度条点击跳转；鼠标滚轮手动滚动
- 镜像翻转（M 键）
- 快捷键：Space 播放，R 回顶，↑↓ 调速，+- 调字号
- 本地服务器运行在 http://localhost:7788

## 提词器 × 幻灯片同步（2026-03-26，2026-03-27 更新）
通过 **BroadcastChannel API**（频道名 `slide-sync`）实现双窗口联动：
- 幻灯片（01-text-is-interface/index.html）：`showSlide(n)` 发出 `slide-change` 消息 + 2秒心跳
- **自动加载 script.md**：幻灯片页面启动时 fetch 同目录的 `script.md`，通过 `load-script` 消息推送给提词器
- 提词器后开时会发 `request-script`，幻灯片收到后重新推送（解决时序问题）
- 提词器（teleprompter/index.html）：监听消息后自动跳转到对应 h3 锚点，高亮当前 Slide 段落
- h3 标题里包含 `Slide N` 字样的会被识别为 Slide 锚点，生成 `data-slide-num` 属性
- toolbar 右侧有连接状态徽标（等待/已连接/同步中）
- 本地服务器端口：**8888**（7788 已废弃）
- 服务器改为自定义 node server（替换 npx serve），HTML 加 `Cache-Control: no-store` 防缓存
- **自动播放**：提词器收到第一次 `slide-change` 时自动 startScroll
- **路径 bug 最终修复（2026-03-26）**：改用硬编码路径 `window.location.origin + '/works/<作品目录名>/script.md'`，彻底规避浏览器 URL 解析歧义。
- **演讲开始触发（2026-03-26）**：`handleAdvance` 第一次点击时发 `broadcastSlide(cur)`，触发提词器自动滚动；后续切换 slide 由 `showSlide()` 正常广播。
- **gen-slides.md 新增 Step 7（2026-03-26）**：提词器联动代码标准化为模板，所有新生成的教学网页自动包含 BroadcastChannel 打通逻辑，提词器与所有 works/ 下的教学网页通用。
