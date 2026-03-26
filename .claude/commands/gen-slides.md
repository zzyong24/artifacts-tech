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

**⚠️ 检查 script.md 格式**：提词器同步要求口播稿必须用 `### Slide N` 三级标题分段。
如果发现 script.md 用的是 `## Slide N`（二级标题）或没有 Slide 分段，**直接修正为 `### Slide N` 格式后再继续**，不用询问用户。

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
- 所有图标内联为 SVG（不用外部路径）
- 每张 Slide 只承载一个认知单元

**动画技术选择原则：**

优先用 **CSS transition / CSS animation** 的场景（轻量、无需 GSAP）：
- 单个元素简单淡入淡出（`opacity`、`transform` 的单步过渡）
- hover 交互效果
- 无限循环的装饰动画（脉冲、轨道、粒子等 `animation: infinite`）
- 单方向生长的线条或进度条（`transition: width/height`）

**必须用 GSAP**（`./gsap.min.js` 已引入，直接调用）的场景：
- 同一 Slide 内有 **3 步以上**的动画序列，需要精确时序编排 → 用 `gsap.timeline()`
- 多个同类元素需要**依次入场**（stagger 效果）→ 用 `gsap.fromTo()` + `stagger`
- 元素入场需要**弹性/回弹缓动**（back.out、elastic）→ CSS cubic-bezier 无法实现
- **SVG 路径描边动画**（连线生长等）需要精确控制 → 用 `gsap.to()` 控制 `strokeDashoffset`
- 动画需要根据**点击步骤动态重置或跳转**状态 → 用 `gsap.set()` 精确还原初始值
- 多个属性需要**同步或交错**执行（如"A 淡出的同时 B 弹入"）→ 用 `gsap.timeline()` 的 `<` 偏移语法

**自我检查清单（生成后逐条验证）：**
- [ ] 无 bullet point 列表（改为 layout 或动画）
- [ ] 每张 Slide 只有一个认知单元
- [ ] 无自动播放动画
- [ ] 背景色统一为主题 `--bg`
- [ ] 口播文字未直接搬到 Slide（提炼核心词）
- [ ] 无 `setInterval` 无限循环
- [ ] 字号使用 clamp() 或 CSS 变量，不硬编码 px
- [ ] 凡符合"必须用 GSAP"场景的动画，均已使用 `gsap.to / gsap.from / gsap.fromTo / gsap.timeline` 实现，而非退回到 CSS transition
- [ ] 所有 SVG 已内联，无外部路径引用
- [ ] 动画选择有认知目标依据（不是随意选的）

### Step 7：提词器联动代码

每个教学网页必须内嵌以下提词器同步代码（固定模板，不可省略）。
将下方代码块插入 `</body>` 前的 `<script>` 区域末尾：

```javascript
/* ── 提词器联动（BroadcastChannel slide-sync）── */
(function() {
  let _bc = null;
  let _scriptText = null;
  let _presentationStarted = false;

  // 路径写死，避免浏览器 URL 解析歧义；将 <作品目录名> 替换为实际目录名
  const SCRIPT_URL = window.location.origin + '/works/<作品目录名>/script.md';

  const fetchScript = async () => {
    if (_scriptText) return _scriptText;
    try {
      const res = await fetch(SCRIPT_URL);
      if (res.ok) _scriptText = await res.text();
    } catch(e) {}
    return _scriptText;
  };

  fetchScript();

  try {
    _bc = new BroadcastChannel('slide-sync');

    // 页面加载完立刻广播 reset：通知提词器停止滚动、回到顶部、等待新演讲开始
    _bc.postMessage({ type: 'reset' });

    // 心跳：每 2 秒发一次，让提词器知道幻灯片还在线
    setInterval(() => _bc && _bc.postMessage({ type: 'heartbeat' }), 2000);

    _bc.onmessage = async (e) => {
      const msg = e.data || {};
      if (msg.type === 'request-script') {
        const text = await fetchScript();
        // 注意：slide 值用 getCurrentSlide() 获取，兼容全局变量和 OOP 两种架构
        if (text) _bc.postMessage({ type: 'load-script', text, name: 'script.md', slide: getCurrentSlide() });
      }
    };
  } catch(e) {}

  // getCurrentSlide：兼容全局 cur（函数式）和 ctrl.cur（OOP）两种架构
  // 生成 HTML 时根据实际架构选其一，删除另一行
  function getCurrentSlide() {
    if (typeof cur !== 'undefined') return cur;            // 函数式架构（如 01）
    if (typeof ctrl !== 'undefined') return ctrl.cur;     // OOP 架构（如 02）
    return 0;
  }

  // broadcastSlide：切换 slide 时调用
  function broadcastSlide(n) {
    try { _bc && _bc.postMessage({ type: 'slide-change', slide: n }); } catch(e) {}
  }

  // 第一次点击（演讲开始）→ 广播当前 slide，触发提词器自动滚动
  // 根据架构选择对应的拦截方式（二选一，删除不用的）：

  // ── 方案 A：函数式架构（handleAdvance 是全局函数）──
  const _origHandleAdvance = handleAdvance;
  const _wrappedHandleAdvance = function() {
    if (!_presentationStarted) { _presentationStarted = true; broadcastSlide(getCurrentSlide()); }
    _origHandleAdvance();
  };
  document.removeEventListener('click', handleAdvance);
  document.addEventListener('click', _wrappedHandleAdvance);
  handleAdvance = _wrappedHandleAdvance;

  // ── 方案 B：OOP 架构（ctrl 是 SlideController 实例）──
  // const _origGoto = ctrl.goto.bind(ctrl);
  // ctrl.goto = function(n) { _origGoto(n); broadcastSlide(this.cur); };
  // const _origAdvance = ctrl.advance.bind(ctrl);
  // ctrl.advance = function() {
  //   if (!_presentationStarted) { _presentationStarted = true; broadcastSlide(this.cur); }
  //   _origAdvance();
  // };
})();
```

**注意事项：**
- 将 `<作品目录名>` 替换为实际目录名（如 `03-made-to-stick`）
- 根据生成的架构选择方案 A 或方案 B，删除另一方案的注释代码
- `load-script` 消息**必须携带 `scriptUrl` 字段**（提词器自动加载逐字稿依赖此字段）：
  ```javascript
  if (text) _bc.postMessage({ type: 'load-script', text, name: 'script.md', slide: getCurrentSlide(), scriptUrl: SCRIPT_URL });
  ```

**⚠️ 关键：`showSlide` 完整模板（防止反向回退时显示动画中间状态）**

函数式架构必须按此模板实现 `showSlide`：

```javascript
function showSlide(n) {
  document.querySelectorAll('.slide').forEach(s => s.classList.remove('current'));
  document.getElementById('s' + n).classList.add('current');
  cur = n;
  resetSlide(n);              // ← 必须调用，重置该 slide 所有 GSAP 元素为初始状态
  initStep(n);                // ← 重置步骤计数
  broadcastSlide(n);          // ← 通知提词器
  document.getElementById('slide-num').textContent = n + ' / ' + TOTAL;
  document.getElementById('prog').style.width = (n / TOTAL * 100) + '%';
  setTimeout(() => handleAdvance(), 80); // ← 自动触发第一步入场动画
}
```

**`resetSlide(n)` 不能是空函数**，必须按 slide 编号逐一重置该页所有 GSAP 动画元素：

```javascript
function resetSlide(n) {
  gsap.killTweensOf('*'); // 先停掉所有进行中的动画
  switch(n) {
    case 1:
      gsap.set(['#s1-tag','#s1-t1','#s1-t2','#s1-sub','#s1-badge'], { autoAlpha:0, y:20 });
      gsap.set('#s1-rule', { width:0 }); // 线条/进度条用 width:0 重置
      break;
    case 2:
      gsap.set(['#s2-title', /* 该 slide 所有动画元素 */], { autoAlpha:0, y:20 });
      break;
    // ... 所有 Slide 都要有对应的 case
  }
}
```

**重置对照表（入场方式 → 重置方式）：**
| 入场动画 | 重置值 |
|----------|--------|
| `autoAlpha:1, y:0`（从下方淡入） | `autoAlpha:0, y:20` |
| `autoAlpha:1, x:0`（横向滑入） | `autoAlpha:0, x:0`（保持 x 不动，只重置透明度）|
| `width:240`（线条生长） | `width:0` |
| `autoAlpha:1, scale:1`（缩放入场） | `autoAlpha:0, scale:.9` |
| `autoAlpha:1`（单纯淡入） | `autoAlpha:0` |

### Step 8：复制 GSAP 依赖

检查 `<works_dir>/<作品目录名>/gsap.min.js` 是否存在：
- 不存在 → 从 `vendor/gsap.min.js` 复制

### Step 9：更新 works/index.html

生成完成后，更新 `works/index.html` 的作品列表（若索引页存在），将新作品卡片加入。

**⚠️ 卡片链接必须使用绝对路径**，不能用相对路径，否则从非 `/works/` 路径访问时会 404：

```html
<!-- ✅ 正确 -->
<a class="work-card" href="/works/03-made-to-stick/index.html">

<!-- ❌ 错误 -->
<a class="work-card" href="03-made-to-stick/index.html">
```

### Step 10：保存并确认

保存 `<works_dir>/<作品目录名>/index.html`，告知用户：
- 文件路径
- 共几张 Slide
- 使用了哪个主题
- 本次 Slide 的知识类型分布（各 Slide 的诊断结果）
- 访问地址：`http://localhost:<server_port>/<works_dir>/<作品目录名>/index.html`
- 索引页：`http://localhost:<server_port>/<works_dir>/index.html`
