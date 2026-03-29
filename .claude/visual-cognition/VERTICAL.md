# VERTICAL.md — 竖版短视频布局设计系统

> 适用于 9:16 竖版画布（1080×1920），适配抖音/小红书等竖屏平台。
> 在 `/gen-slides-vertical` Step 4 和 Step 5 时读取。

---

## 一、安全区域

竖版视频被平台 UI 遮挡严重，内容必须严格限制在安全区域内。

```
┌────────────────────────┐  0px
│   ▓▓ 平台标题栏 ▓▓    │  0 ~ 80px     ← 避让
│                        │
│ ┌──────────────────┐   │  80px
│ │                  │   │
│ │  内容主区域      │   │  80 ~ 1340px  ← 核心内容区
│ │  (1260px 高)     │   │
│ │                  │   │
│ └──────────────────┘   │  1340px
│                        │
│   ··· 过渡区 ···       │  1340 ~ 1520px ← 辅助信息/过渡
│                        │
│ ┌──────────────────┐   │  1520px
│ │  字幕安全区      │   │  1520 ~ 1760px ← 字幕文字
│ └──────────────────┘   │  1760px
│                        │
│   ▓▓ 平台互动栏 ▓▓    │  1760 ~ 1920px ← 避让（点赞/评论）
└────────────────────────┘  1920px
```

### 区域详解

| 区域 | Y 范围 | 高度 | 用途 |
|------|--------|------|------|
| 平台标题避让 | 0 ~ 80px | 80px | 留空，不放任何内容 |
| **内容主区** | 80 ~ 1340px | 1260px | 核心教学内容 |
| 过渡区 | 1340 ~ 1520px | 180px | 补充说明、小标签、过渡图形 |
| **字幕区** | 1520 ~ 1760px | 240px | TTS 字幕显示区域 |
| 平台互动避让 | 1760 ~ 1920px | 160px | 留空，不放内容 |

### 水平安全区

```
← 60px →│← 内容安全宽度 960px →│← 60px →
```

- 左右各留 60px 边距
- 内容最大宽度：960px（居中）
- 右侧额外避让：小红书/抖音互动按钮在右侧，重要内容避免贴右

---

## 二、5 种竖版布局变体

### 变体 1：居中冲击型

**适合**：封面页、金句页、单个核心概念

```
┌─────────────────┐
│                  │
│                  │
│    ★ 大标题 ★    │  居中偏上（Y: 300~600）
│                  │
│    副标题/解释    │
│                  │
│                  │
│                  │
│   [字幕区]       │
└─────────────────┘
```

**CSS 要点**：
```css
.layout-center-impact {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 80px;
  padding-bottom: 580px; /* 为字幕和平台UI留空 */
  text-align: center;
}
.layout-center-impact .hero-text {
  font-size: var(--size-hero);
  line-height: 1.2;
  max-width: 900px;
}
```

---

### 变体 2：上图下文型

**适合**：概念讲解（上方视觉化，下方文字解释）

```
┌─────────────────┐
│                  │
│  ┌────────────┐  │  Y: 100~700
│  │  视觉区域  │  │  （SVG/图表/动画）
│  │  (600px)   │  │
│  └────────────┘  │
│                  │
│  ┌────────────┐  │  Y: 740~1300
│  │  文字区域  │  │  （要点/解释）
│  │  (560px)   │  │
│  └────────────┘  │
│                  │
│   [字幕区]       │
└─────────────────┘
```

**CSS 要点**：
```css
.layout-top-visual {
  display: flex;
  flex-direction: column;
  gap: var(--gap-lg);
  padding: 100px 60px 580px;
}
.layout-top-visual .visual-zone {
  flex: 0 0 600px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.layout-top-visual .text-zone {
  flex: 1;
}
```

---

### 变体 3：卡片堆叠型

**适合**：并列要点（原横版的多列卡片 → 竖版纵向堆叠）

```
┌─────────────────┐
│  标题            │
│                  │
│  ┌────────────┐  │  卡片 1
│  │ 要点 A     │  │
│  └────────────┘  │
│  ┌────────────┐  │  卡片 2
│  │ 要点 B     │  │
│  └────────────┘  │
│  ┌────────────┐  │  卡片 3
│  │ 要点 C     │  │
│  └────────────┘  │
│                  │
│   [字幕区]       │
└─────────────────┘
```

**规则**：
- 最多 4 张卡片（超过则拆 Slide）
- 每卡片高度 ≤ 220px
- 卡片间距 20px
- 逐张 {step} 显现

**CSS 要点**：
```css
.layout-card-stack {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 100px 60px 580px;
}
.layout-card-stack .card {
  width: 100%;
  padding: 28px 36px;
  border-radius: var(--card-radius);
  background: var(--card-bg);
  border: var(--card-border);
  box-shadow: var(--card-shadow);
}
```

---

### 变体 4：步骤纵向型

**适合**：流程/步骤讲解（原横版的横向流程 → 竖版纵向）

```
┌─────────────────┐
│  流程标题        │
│                  │
│  ① ──────────   │
│     步骤 1      │
│       │          │
│  ② ──────────   │
│     步骤 2      │
│       │          │
│  ③ ──────────   │
│     步骤 3      │
│                  │
│   [字幕区]       │
└─────────────────┘
```

**规则**：
- 步骤之间用竖向连接线（不是横向箭头）
- 每步高度约 200~280px
- 最多 5 步（超过拆 Slide）
- 连接线用 SVG stroke-dasharray 动画

**CSS 要点**：
```css
.layout-steps-vertical {
  display: flex;
  flex-direction: column;
  padding: 100px 60px 580px;
}
.step-node {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  padding: 20px 0;
}
.step-node .step-num {
  flex: 0 0 52px;
  width: 52px; height: 52px;
  border-radius: 50%;
  background: var(--accent1);
  color: var(--white);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: var(--size-h2);
}
.step-connector {
  width: 3px;
  height: 60px;
  background: var(--accent1);
  margin-left: 25px;
  opacity: 0.3;
}
```

---

### 变体 5：数据焦点型

**适合**：数据展示（一个大数字 + 解释语境）

```
┌─────────────────┐
│                  │
│                  │
│     2.5%         │  超大数字（Y: 300~500）
│                  │
│  vs 预测 50%     │  对比/语境
│                  │
│  ─────────────   │  分隔线
│                  │
│  这就是           │  解释文字
│  知识的诅咒       │
│                  │
│   [字幕区]       │
└─────────────────┘
```

**CSS 要点**：
```css
.layout-data-focus {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 80px;
  padding-bottom: 580px;
  text-align: center;
}
.layout-data-focus .big-number {
  font-size: 180px;
  font-weight: 900;
  line-height: 1;
  color: var(--accent1);
}
.layout-data-focus .context {
  font-size: var(--size-h2);
  color: var(--dim, var(--ink));
  margin-top: var(--gap-md);
}
```

---

## 三、动画适配规则

### 方向转换

| 横版动画方向 | 竖版适配 |
|-------------|---------|
| 左 → 右 滑入 | 下 → 上 滑入 |
| 横向流程图 | 纵向流程图 |
| 左右双栏对比 | 上下对比 |
| 左右分栏文图 | 上图下文 |
| 横向卡片网格 | 纵向卡片堆叠 |
| 横向时间轴 | 纵向时间轴 |

### GSAP 适配示例

```javascript
// 横版：从左侧滑入
gsap.from(el, { x: -50, autoAlpha: 0 });

// 竖版：从下方滑入
gsap.from(el, { y: 40, autoAlpha: 0 });
```

### 动画时长调整

竖版屏幕空间小，信息密度低，动画应更快速：

| 动画类型 | 横版时长 | 竖版时长 |
|----------|---------|---------|
| 元素入场 | 0.6s | 0.4s |
| 页面过渡 | 0.8s | 0.5s |
| 数据计数 | 2.0s | 1.5s |
| 路径描绘 | 2.0s | 1.5s |

---

## 四、信息密度控制

### 核心原则

**竖版每屏信息量 ≈ 横版 60%**

- 横版一张 Slide 的内容，竖版可能需要 1.5~2 张
- 允许增加 Slide 数量，减少每屏内容量
- 前 3 秒（封面 Slide）必须有强钩子

### 文字量限制

| 元素 | 横版上限 | 竖版上限 |
|------|---------|---------|
| 标题 | 15 字 | 10 字 |
| 副标题 | 25 字 | 18 字 |
| 正文段落 | 60 字 | 35 字 |
| 卡片文字 | 40 字 | 25 字 |
| 标签 | 8 字 | 6 字 |

### 拆分策略

当横版 Slide 内容超出竖版承载能力时：
1. 若有 3+ 并列项 → 拆为「概览 + 逐项展开」
2. 若有长段文字 → 提取关键词，文字移到口播
3. 若有复杂图表 → 简化为核心数据点

---

## 五、平台差异适配

### 抖音 vs 小红书

| 维度 | 抖音 | 小红书 |
|------|------|--------|
| 画幅 | 9:16（1080×1920） | 9:16 或 3:4（1080×1440） |
| 右侧遮挡 | 点赞/评论/分享按钮 | 较少遮挡 |
| 时长偏好 | 15s~60s 最佳 | 60s~180s 可接受 |
| 字幕位置 | 底部居中 | 底部居中 |
| 封面 | 第一帧即封面 | 可选封面 |

### 通用安全规则

- 右侧 120px 内不放关键信息（抖音互动按钮）
- 底部 160px 留给字幕
- 顶部 80px 留给平台标题栏
- 前 3 秒必须有视觉冲击（否则用户划走）

---

## 六、字号系统（竖版覆盖）

竖版字号 = 横版 × 1.2，保证手机上可读性。

```css
/* 竖版字号覆盖 */
#deck[data-h="1920"] {
  --size-hero:    125px;   /* 104 × 1.2 */
  --size-display: 106px;   /* 88 × 1.2 */
  --size-h1:      67px;    /* 56 × 1.2 */
  --size-h2:      46px;    /* 38 × 1.2 */
  --size-body:    31px;    /* 26 × 1.2 */
  --size-label:   22px;    /* 18 × 1.2 */
  --size-caption: 17px;    /* 14 × 1.2 */

  --pad-slide: 60px;
}
```

---

## 七、布局选择决策树

```
内容类型是什么？
│
├─ 封面/金句/单概念 → 变体1：居中冲击型
│
├─ 概念+视觉解释 → 变体2：上图下文型
│
├─ 并列要点/对比 → 变体3：卡片堆叠型
│
├─ 流程/步骤/因果 → 变体4：步骤纵向型
│
└─ 数据/统计/对比数字 → 变体5：数据焦点型
```

**混合使用**：一个视频内不同 Slide 可以用不同布局变体，增加视觉节奏感。推荐 2~3 种变体交替使用。
