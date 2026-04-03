# artifacts-tech

> 教学短视频工程框架 · 认知科学驱动的动画引擎

把每一篇文章/笔记「立体化」：**原始文稿 → 口播稿 → 教学动画 → 视频发布**。

动画引擎基于 [爱思考的伊伊子](https://github.com/edu-ai-builders/visual-cognition-slides) 的 visual-cognition-slides（MIT 协议），在此基础上扩展了内容生产工作流与提词器联动系统。

---

## 核心理念

一篇文章停留在文字里，只能被「读」。而知识要真正传播，需要两个维度同时发力：

- **听觉维度**：口播稿——精炼、口语、有节奏感
- **视觉维度**：教学动画——信息密度高、可视化、让人「看懂」

两者不是互相替代的，而是**互相补充**的：口播说「为什么」，动画展示「是什么」和「怎么运作」。

---

## 目录结构

```
artifacts-tech/
├── works/
│   ├── index.html                      # 作品导航页
│   ├── vendor/
│   │   └── gsap.min.js                 # 共享动画库（GSAP 3）
│   └── NN-作品名/                      # 作品目录（.gitignore 已忽略，私有管理）
│       ├── source.md                   # ⭐ 原始文稿（动画内容源）
│       ├── script.md                   # 提词器用稿（含 {step} 标记）
│       ├── script-full.md              # 逐字稿归档
│       └── index.html                  # 教学动画
├── teleprompter/
│   └── index.html                      # 浏览器提词器（支持幻灯片同步）
├── tools/
│   └── server.js                       # 本地 HTTP 服务（必须用 HTTP，非 file://）
└── .claude/
    ├── commands/
    │   ├── gen-script.md               # /gen-script 指令：生成口播稿
    │   └── gen-slides.md               # /gen-slides 指令：生成教学动画
    ├── artifacts.config.example.json   # 配置模板
    └── visual-cognition/
        ├── PEDAGOGY.md                 # 认知科学 + 叙事结构原则
        ├── STYLES.md                   # 8 套视觉主题
        ├── ANIMATIONS.md               # 动画库（10 章节完整代码）
        └── FORMATS.md                  # 画布规范 + 响应式
```

---

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/zzyong24/artifacts-tech.git
cd artifacts-tech
```

### 2. 配置本机路径

```bash
cp .claude/artifacts.config.example.json .claude/artifacts.config.json
# 编辑 artifacts.config.json，填入本机的 works_dir 和 knowledge_base 路径
```

### 3. 启动本地服务

> **必须用 HTTP 服务访问，不能直接双击打开 HTML**（BroadcastChannel API 需要同源）

```bash
python3 -m http.server 8889
# 默认端口 8889
```

访问 `http://localhost:8889/works/` 查看作品导航页。

---

## 生产一期内容

### 第一步：准备原始文稿

将你的文章、笔记、观点整理成完整文稿（不需要口语化，保留所有细节和数据），这份内容是后续一切的**唯一信息源**。

### 第二步：生成口播稿

```
/gen-script NN-作品名 /path/to/文稿.md
```

内部执行三个阶段（并行加速）：

| 阶段 | 内容 |
|------|------|
| 5.1 确定 Slide 骨架 | 划定每张 Slide 的主题边界（串行，其他步骤的前置） |
| 5.2 并行生成 | 侧A 写逐字稿口播内容，侧B 规划每张 Slide 的动画节点数量，两侧互不等待 |
| 5.3 `{step}` 对齐 | 逐张 Slide 对比两侧结果，在逐字稿中插入 `{step}` 标记 |

自动保存三个文件：`source.md`（原始文稿）、`script-full.md`（逐字稿归档）、`script.md`（提词器用稿）。

同步输出发布物料：封面/视频标题候选 × 2，nano banana 封面提示词（3:4 & 9:16）。

### 第三步：生成教学动画

```
/gen-slides NN-作品名
```

执行逻辑：
1. 读取 `source.md` 作为**内容主源**（全量信息，保证动画信息密度）
2. 读取 `script.md` 作为**结构锚点**（Slide 分段 + `{step}` 节奏）
3. 诊断每张 Slide 的知识类型，选择最合适的动画表达方式
4. 生成 `index.html`

### 第四步：录制视频

同时打开两个窗口：

- **幻灯片**：`http://localhost:8888/works/NN-作品名/`
- **提词器**：`http://localhost:8888/teleprompter/`

两者通过 BroadcastChannel（频道 `slide-sync`）自动联动——点击幻灯片，提词器自动跳转并开始滚动。

**提词器快捷键：**

| 按键 | 功能 |
|------|------|
| `Space` | 播放 / 暂停 |
| `R` | 回到顶部 |
| `↑ / ↓` | 调速 |
| `+ / -` | 调字号 |
| `M` | 镜像翻转 |
| `D` | 切换双栏对照（提纲 + 逐字） |

---

## 三文件分工

| 文件 | 角色 | 谁读 |
|------|------|------|
| `source.md` | 信息全量，原始文稿原样保存 | `/gen-slides` 的内容主源 |
| `script.md` | Slide 分段 + `{step}` 标记，提词器用稿 | 录制时提词器 + `/gen-slides` 的结构锚点 |
| `script-full.md` | 完整逐字稿归档 | 备查，不参与动画生成 |

**关键原则**：`/gen-slides` 的内容源是 `source.md`，不是 `script.md`——口播稿为「说」压缩过，用它生成动画信息量必然缩水。

---

## 知识类型 × 动画方式

| 知识类型 | 表达方式 |
|---------|---------|
| 概念性（X 是什么） | 类比动画 / 定义拆解 |
| 程序性（怎么做 X） | 步骤动画 / 分支流程 |
| 关系性（X 和 Y 的关系） | 动态连线图 / 矩阵 |
| 数据性（数字/规模） | 计数动画 / 比例填充 |
| 叙事性（故事/案例） | 时间轴 / 场景构建 |
| 元认知（为什么这样想） | 两种心态对比 |

---

## 作品目录说明

`works/NN-xxx/` 作品目录已通过 `works/.gitignore` 从本 repo 中排除，用于存放个人内容，建议单独用私有 repo 管理：

```bash
cd works
git init
git remote add origin <你的私有 repo 地址>
git add .
git push -u origin main
```

---

## 致谢

动画引擎规范（`.claude/visual-cognition/`）基于 **[爱思考的伊伊子](https://github.com/edu-ai-builders/visual-cognition-slides)** 的 visual-cognition-slides 项目，MIT 协议。感谢她在认知科学驱动的教学动画设计上的开创性工作。

---

## License

MIT
