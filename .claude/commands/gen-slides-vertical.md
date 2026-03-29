# /gen-slides-vertical — 生成竖版教学动画 HTML

根据作品目录下的原始文稿，生成一套适配竖屏短视频的教学动画，保存为 `vertical.html`。

**本命令基于 `/gen-slides` 的完整流程，仅列出差异项。未提及的步骤完全遵循 `gen-slides.md`。**

## 使用方式

```
/gen-slides-vertical <作品目录名>
```

**示例：**
```
/gen-slides-vertical 03-made-to-stick
```

---

## 与 /gen-slides 的差异清单

### 差异 1：画布尺寸

```html
<!-- 横版（gen-slides）-->
<div id="deck" data-w="1920" data-h="1080">

<!-- 竖版（gen-slides-vertical）-->
<div id="deck" data-w="1080" data-h="1920">
```

### 差异 2：输出文件名

- 横版：`index.html`
- **竖版：`vertical.html`**

不覆盖已有的 index.html，两者共存。

### 差异 3：额外读取 VERTICAL.md

在 Step 3（加载动画规范）时，**额外读取** `.claude/visual-cognition/VERTICAL.md`：

| 文件 | 用途 | 何时读取 |
|------|------|----------|
| `PEDAGOGY.md` | 叙事结构 + 知识类型 | 必读（同横版）|
| `STYLES.md` | 主题 CSS | 必读（同横版）|
| `ANIMATIONS.md` | 动画库 | 必读（同横版）|
| `FORMATS.md` | 画布规范 | 必读（同横版）|
| **`VERTICAL.md`** | **竖版布局系统** | **必读（竖版专用）** |

### 差异 4：布局系统替换

横版使用自由布局（左右分栏、网格等）。
竖版**必须从 VERTICAL.md 的 5 种布局变体中选择**：

1. **居中冲击型** — 封面/金句/单概念
2. **上图下文型** — 概念+视觉解释
3. **卡片堆叠型** — 并列要点
4. **步骤纵向型** — 流程/步骤
5. **数据焦点型** — 数据展示

**每张 Slide 在诊断阶段选定布局变体**，记录在诊断表中。

### 差异 5：字号放大 ×1.2

竖版字号 = 横版主题字号 × 1.2。在 CSS 中添加竖版覆盖：

```css
/* 竖版字号（由 STYLES.md 主题基础上 ×1.2）*/
#deck[data-h="1920"] {
  --size-hero:    125px;
  --size-display: 106px;
  --size-h1:      67px;
  --size-h2:      46px;
  --size-body:    31px;
  --size-label:   22px;
  --size-caption: 17px;
  --pad-slide: 60px;
}
```

### 差异 6：安全区域约束

所有内容必须遵循 VERTICAL.md 的安全区域规范：

```css
.slide {
  /* 内容区域约束 */
  padding-top: 80px;      /* 平台标题避让 */
  padding-bottom: 580px;  /* 字幕区 + 平台互动避让 */
  padding-left: 60px;
  padding-right: 60px;
  overflow: hidden;
}
```

**关键**：底部 580px（1340~1920）不放主要内容，留给字幕和平台 UI。

### 差异 7：动画方向适配

遵循 VERTICAL.md §三 的方向转换规则：

| 横版 | 竖版 |
|------|------|
| `x: -50`（从左滑入） | `y: 40`（从下滑入） |
| 横向流程图 | 纵向流程图 |
| 左右双栏 | 上下排列 |
| 横向时间轴 | 纵向时间轴 |

### 差异 8：信息密度控制

遵循 VERTICAL.md §四：

- 每屏信息量 ≈ 横版 60%
- 允许增加 Slide 数量
- 标题 ≤ 10 字，正文段落 ≤ 35 字
- 3+ 并列项 → 拆 Slide

### 差异 9：省略提词器代码

竖版用于生成视频，**不需要 BroadcastChannel 提词器同步代码**。

跳过 gen-slides.md 的 Step 7（提词器联动代码）。

### 差异 10：省略 works/index.html 更新

竖版不更新索引页。跳过 gen-slides.md 的 Step 9。

### 差异 11：前 3 秒钩子强制

封面 Slide（S01）必须：
- 有视觉冲击（大字/数字/反常识断言）
- 在 3 秒内传达「为什么要看」
- 不做冗长自我介绍

---

## 竖版生成自检清单

在横版自检清单基础上，追加竖版专用检查：

- [ ] 画布 `data-w="1080" data-h="1920"`
- [ ] 输出文件名为 `vertical.html`
- [ ] 无 BroadcastChannel 提词器代码
- [ ] 所有内容在安全区域内（Y: 80~1340px，X: 60~1020px）
- [ ] 无内容进入底部 580px 区域
- [ ] 右侧 120px 无关键信息
- [ ] 字号已 ×1.2
- [ ] 横向布局已转为纵向
- [ ] 流程图方向已从横向转为纵向
- [ ] 每屏文字量不超过竖版上限
- [ ] 封面 Slide 3 秒内有钩子
- [ ] 每张 Slide 使用了 VERTICAL.md 的布局变体之一
- [ ] 动画方向已从「左→右」转为「下→上」

---

## 完整执行步骤对照

| 步骤 | gen-slides | gen-slides-vertical |
|------|-----------|-------------------|
| Step 1: 读取配置 | ✅ 相同 | ✅ 相同 |
| Step 2: 读取内容 | ✅ 相同 | ✅ 相同 |
| Step 3: 加载规范 | 4 文件 | **5 文件（+VERTICAL.md）** |
| Step 4: 诊断设计 | 知识类型+动画 | **+布局变体选择** |
| Step 5: 主题选择 | ✅ 相同 | ✅ 相同 |
| Step 6: 生成 HTML | 1920×1080 index.html | **1080×1920 vertical.html** |
| Step 7: 提词器代码 | ✅ 嵌入 | **❌ 跳过** |
| Step 8: GSAP 复制 | ✅ 相同 | ✅ 相同 |
| Step 9: 更新索引 | ✅ 更新 | **❌ 跳过** |
| Step 10: 确认 | ✅ 相同 | **+提示竖版预览方式** |

---

## 验证

保存后告知用户：
- 文件路径：`works/<作品目录名>/vertical.html`
- 预览方式：浏览器访问 `http://localhost:<server_port>/works/<作品目录名>/vertical.html`
- 建议用 Chrome DevTools 设为 1080×1920 或手机模拟器预览
- 下一步：可用 `/gen-video` 生成完整视频
