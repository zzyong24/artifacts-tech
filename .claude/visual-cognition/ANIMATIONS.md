# ANIMATIONS.md — 动画库

> 在 Step 4/5 时读取。HTML 的核心优势：任何 JS 框架最终都在调用 HTML/CSS/SVG。
> 优先用动画表达概念，而非文字+图标。类 VideoTutor/3Blue1Brown 的讲解方式。

---

## 动画哲学

动画的价值在于**让不可见的变可见**：
- 抽象关系的结构 → 空间中的形状和运动
- 时间上的变化 → 动态过程
- 数量的大小 → 视觉面积和数量
- 因果链 → 连锁反应动画
- 认知框架 → 从混乱到有序的整理过程

**控制权原则**：所有动画默认暂停，由用户点击触发，不自动播放。
**可重播原则**：复杂动画需要重播按钮。
**时长原则**：过渡动画 ≤ 400ms；概念演示动画无限制，但要有节奏感。

---

## § 1 类比动画

### 1.1 双栏对应展开

```html
<!-- 用途：展示"A 就像 B"的结构对应 -->
<div class="analogy-stage">
  <div class="analogy-left" id="known">
    <div class="a-icon">🍽️</div>
    <div class="a-label">餐厅点菜</div>
    <div class="a-items">
      <div class="a-item" data-pair="1">菜单</div>
      <div class="a-item" data-pair="2">服务员</div>
      <div class="a-item" data-pair="3">厨房</div>
    </div>
  </div>

  <svg class="analogy-bridge" id="bridge" viewBox="0 0 200 300">
    <!-- 连线由 JS 动态绘制 -->
  </svg>

  <div class="analogy-right" id="new-concept">
    <div class="a-icon">🤖</div>
    <div class="a-label">API 调用</div>
    <div class="a-items">
      <div class="a-item" data-pair="1">接口文档</div>
      <div class="a-item" data-pair="2">HTTP 请求</div>
      <div class="a-item" data-pair="3">服务器</div>
    </div>
  </div>
</div>

<style>
.analogy-stage { display:flex; align-items:center; gap:0; width:100%; }
.analogy-left, .analogy-right { flex:0 0 380px; padding:40px; }
.analogy-bridge { flex:1; height:300px; }
.a-item {
  padding:12px 20px; margin:8px 0;
  border:2px solid var(--ink); background:var(--white);
  font-size:22px; opacity:0;
  transition: opacity .4s, transform .4s;
  transform: translateX(-20px);
}
.analogy-right .a-item { transform: translateX(20px); }
.a-item.show { opacity:1; transform:none; }
.bridge-line {
  stroke: var(--gold); stroke-width:2; stroke-dasharray:200;
  stroke-dashoffset:200; fill:none;
  animation: drawLine .6s ease forwards;
}
@keyframes drawLine { to { stroke-dashoffset:0; } }
</style>

<script>
let analogyStep = 0;
function runAnalogy() {
  const leftItems  = document.querySelectorAll('.analogy-left .a-item');
  const rightItems = document.querySelectorAll('.analogy-right .a-item');
  const bridge     = document.getElementById('bridge');
  if (analogyStep < leftItems.length) {
    leftItems[analogyStep].classList.add('show');
    rightItems[analogyStep].classList.add('show');
    // draw SVG line connecting them
    const li = leftItems[analogyStep].getBoundingClientRect();
    const ri = rightItems[analogyStep].getBoundingClientRect();
    const sv = bridge.getBoundingClientRect();
    const line = document.createElementNS('http://www.w3.org/2000/svg','path');
    const x1=0, y1=li.top+li.height/2-sv.top;
    const x2=200, y2=ri.top+ri.height/2-sv.top;
    line.setAttribute('d',`M${x1},${y1} C100,${y1} 100,${y2} ${x2},${y2}`);
    line.setAttribute('class','bridge-line');
    line.style.animationDelay = '.3s';
    bridge.appendChild(line);
    analogyStep++;
  }
}
</script>
```

---

### 1.2 等号揭示（简洁版）

```html
<!-- 用途：快速建立类比，3步出现 -->
<div class="eq-reveal">
  <div class="eq-left" data-step="1">🔌 USB-C</div>
  <div class="eq-sign" data-step="2">=</div>
  <div class="eq-right" data-step="3">⚡ MCP<br><small>一个接口，连所有工具</small></div>
</div>
<style>
.eq-reveal { display:flex; align-items:center; gap:48px; justify-content:center; }
.eq-left, .eq-right {
  font-family:var(--font-display); font-size:64px; text-align:center;
  padding:32px 48px; border:3px solid var(--ink); box-shadow:8px 8px 0 var(--ink);
}
.eq-sign { font-family:var(--font-display); font-size:96px; color:var(--gold); }
</style>
```

---

## § 2 过程动画（机制可视化）

### 2.1 流程节点动画（数据流）

```html
<!-- 用途：展示数据/信号流动过程 -->
<div class="process-track">
  <div class="proc-node" id="pn0">📥<br><span>输入</span></div>
  <div class="proc-conn"><div class="proc-dot"></div></div>
  <div class="proc-node" id="pn1">⚙️<br><span>处理</span></div>
  <div class="proc-conn"><div class="proc-dot" style="animation-delay:.6s"></div></div>
  <div class="proc-node" id="pn2">📤<br><span>输出</span></div>
</div>

<style>
.process-track { display:flex; align-items:center; gap:0; justify-content:center; }
.proc-node {
  width:140px; height:140px; border-radius:50%;
  border:3px solid var(--ink); display:flex; flex-direction:column;
  align-items:center; justify-content:center; gap:8px;
  font-size:36px; background:var(--white);
  box-shadow:6px 6px 0 var(--ink);
  opacity:0; transform:scale(.8);
  transition: all .5s cubic-bezier(.34,1.4,.64,1);
}
.proc-node.active { opacity:1; transform:scale(1); background:var(--cream); }
.proc-node.firing { background:var(--gold); }
.proc-conn { width:120px; height:4px; background:rgba(26,20,16,.15); position:relative; overflow:hidden; }
.proc-dot {
  position:absolute; top:-4px; width:12px; height:12px;
  background:var(--red); border-radius:50%;
  animation: flowDot 1.4s linear infinite;
  opacity:0;
}
.proc-dot.active { opacity:1; }
@keyframes flowDot { from{left:0} to{left:calc(100% - 12px)} }

/* 节点逐步激活 */
.proc-node.glow {
  box-shadow: 6px 6px 0 var(--ink), 0 0 0 6px rgba(232,160,32,.3);
}
</style>

<script>
const nodes = document.querySelectorAll('.proc-node');
const dots  = document.querySelectorAll('.proc-dot');
let pStep = 0;
function activateProcess() {
  if (pStep < nodes.length) {
    nodes[pStep].classList.add('active');
    if (pStep > 0) nodes[pStep].classList.add('glow');
    if (pStep < dots.length) dots[pStep].classList.add('active');
    pStep++;
  }
}
</script>
```

---

### 2.2 ReAct 循环动画（AI 推理循环）

```html
<!-- 用途：展示循环往复的认知/执行过程 -->
<svg class="react-loop" viewBox="0 0 500 500">
  <!-- 三个节点 Think/Act/Observe -->
  <circle class="rl-node" id="rn-think" cx="250" cy="80"  r="60"/>
  <circle class="rl-node" id="rn-act"   cx="420" cy="370" r="60"/>
  <circle class="rl-node" id="rn-obs"   cx="80"  cy="370" r="60"/>
  <!-- 文字 -->
  <text class="rl-label" x="250" y="80"  text-anchor="middle" dominant-baseline="middle">思考</text>
  <text class="rl-label" x="420" y="370" text-anchor="middle" dominant-baseline="middle">行动</text>
  <text class="rl-label" x="80"  y="370" text-anchor="middle" dominant-baseline="middle">观察</text>
  <!-- 弧线箭头 -->
  <path class="rl-arc arc-ta" d="M 295,110 Q 400,200 385,315"/>
  <path class="rl-arc arc-ao" d="M 360,395 Q 250,460 145,395"/>
  <path class="rl-arc arc-ot" d="M 115,315 Q 100,200 205,110"/>
  <!-- 移动粒子 -->
  <circle class="rl-particle" r="10" fill="var(--gold)">
    <animateMotion dur="3s" repeatCount="indefinite" rotate="auto">
      <mpath href="#loop-path"/>
    </animateMotion>
  </circle>
  <path id="loop-path" d="M250,20 Q430,200 420,370 Q250,480 80,370 Q70,200 250,20" fill="none"/>
</svg>

<style>
.react-loop { width:480px; height:480px; }
.rl-node { fill:var(--cream); stroke:var(--ink); stroke-width:3; }
.rl-node.active { fill:var(--gold); }
.rl-label { font-family:var(--font-body); font-size:22px; font-weight:900; fill:var(--ink); }
.rl-arc {
  fill:none; stroke:var(--ink); stroke-width:2.5;
  stroke-dasharray:8,4;
  marker-end:url(#arrow);
}
.rl-arc.highlight { stroke:var(--red); stroke-width:3; stroke-dasharray:none; }
</style>
```

---

### 2.3 状态转变动画（变形）

```html
<!-- 用途：展示事物从一种状态变成另一种 -->
<div class="morph-stage">
  <div class="morph-obj" id="morphObj">
    <!-- SVG 图形，用 GSAP/CSS animation 做形状变形 -->
    <svg viewBox="0 0 200 200">
      <path id="morphPath" d="M100,20 L180,180 L20,180 Z"/>
      <!-- 状态A：三角形；状态B：圆形 -->
    </svg>
  </div>
  <div class="morph-label" id="morphLabel">状态 A</div>
</div>

<style>
/* CSS 形状变形（纯CSS，无需JS库）*/
@keyframes triangleToCircle {
  0%   { d: path("M100,20 L180,180 L20,180 Z"); fill: var(--red); }
  50%  { d: path("M100,10 L175,155 L50,175 Z"); fill: var(--gold); }
  100% { d: path("M100,100 m-80,0 a80,80 0 1,0 160,0 a80,80 0 1,0 -160,0"); fill: var(--blue); }
}
#morphPath.animate { animation: triangleToCircle 1.2s ease-in-out forwards; }
</style>
```

---

## § 3 对比动画

### 3.1 3D 翻转卡片（Before/After）

```html
<!-- 用途：展示误解→真相，旧认知→新认知 -->
<div class="flip-wrap">
  <div class="flip-card" id="fc1" onclick="this.classList.toggle('flipped')">
    <div class="flip-inner">
      <div class="flip-f">
        <div class="f-tag">你以为…</div>
        <div class="f-content"><!-- 误解内容 --></div>
      </div>
      <div class="flip-b">
        <div class="f-tag">其实…</div>
        <div class="f-content"><!-- 真相内容 --></div>
      </div>
    </div>
  </div>
</div>

<style>
.flip-wrap { perspective: 1400px; }
.flip-card { width:520px; height:360px; cursor:pointer; }
.flip-inner {
  width:100%; height:100%; position:relative;
  transform-style:preserve-3d;
  transition:transform .7s cubic-bezier(.4,0,.2,1);
}
.flip-card.flipped .flip-inner { transform:rotateY(180deg); }
.flip-f, .flip-b {
  position:absolute; inset:0; backface-visibility:hidden;
  border:2px solid var(--ink); padding:44px;
  display:flex; flex-direction:column; gap:20px; justify-content:center;
}
.flip-f { background:var(--cream); box-shadow:8px 8px 0 var(--ink); }
.flip-b { background:var(--ink); color:var(--cream); transform:rotateY(180deg); box-shadow:8px 8px 0 var(--gold); }
.f-tag { font-family:var(--font-label); font-size:14px; opacity:.5; letter-spacing:.08em; }
.f-content { font-family:var(--font-display); font-size:48px; line-height:1.2; }
</style>
```

---

### 3.2 滑动对比（Slider 交互）

```html
<!-- 用途：展示两个版本的差异，用户拖动分界线 -->
<div class="slider-compare" id="sliderComp">
  <div class="sc-left"><!-- 左侧内容（"之前"）--></div>
  <div class="sc-right"><!-- 右侧内容（"之后"）--></div>
  <div class="sc-handle" id="scHandle">
    <div class="sc-line"></div>
    <div class="sc-btn">⟺</div>
  </div>
</div>

<style>
.slider-compare { position:relative; width:100%; height:500px; overflow:hidden; cursor:col-resize; }
.sc-left, .sc-right { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }
.sc-right { clip-path:inset(0 0 0 50%); }
.sc-handle {
  position:absolute; top:0; left:50%; width:4px; height:100%;
  background:var(--ink); transform:translateX(-50%);
  display:flex; flex-direction:column; align-items:center; justify-content:center;
}
.sc-btn {
  width:40px; height:40px; background:var(--white);
  border:2px solid var(--ink); border-radius:50%;
  display:flex; align-items:center; justify-content:center; font-size:18px;
}
</style>

<script>
const comp   = document.getElementById('sliderComp');
const handle = document.getElementById('scHandle');
const right  = comp.querySelector('.sc-right');
let dragging = false;
comp.addEventListener('mousedown', () => dragging = true);
document.addEventListener('mouseup', () => dragging = false);
document.addEventListener('mousemove', e => {
  if (!dragging) return;
  const rect = comp.getBoundingClientRect();
  const pct  = Math.max(0, Math.min(100, (e.clientX - rect.left) / rect.width * 100));
  handle.style.left = pct + '%';
  right.style.clipPath = `inset(0 0 0 ${pct}%)`;
});
</script>
```

---

## § 4 数据动画

### 4.1 计数动画

```html
<div class="counter-wrap">
  <span class="counter-num" data-target="1000000" data-suffix="+">0</span>
  <div class="counter-label">每天新增的 AI 模型</div>
</div>

<script>
function animateCounter(el) {
  const target = +el.dataset.target;
  const suffix = el.dataset.suffix || '';
  const duration = 2000;
  const start = performance.now();
  function update(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3); // ease-out-cubic
    el.textContent = Math.floor(ease * target).toLocaleString() + suffix;
    if (t < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}
</script>
```

---

### 4.2 比例填充动画（面积感知）

```html
<!-- 用途：100个格子里填满X个，直觉感受比例 -->
<div class="ratio-grid" id="ratioGrid">
  <!-- JS 生成100个格子 -->
</div>

<style>
.ratio-grid { display:grid; grid-template-columns:repeat(10,1fr); gap:6px; width:480px; }
.ratio-cell {
  width:40px; height:40px; border:1.5px solid rgba(26,20,16,.15);
  border-radius:4px; background:var(--cream);
  transition: background .1s, border-color .1s;
}
.ratio-cell.filled { background:var(--red); border-color:var(--red); }
</style>

<script>
function buildRatioGrid(container, total, filled, color='var(--red)') {
  for (let i = 0; i < total; i++) {
    const cell = document.createElement('div');
    cell.className = 'ratio-cell';
    container.appendChild(cell);
  }
  // animate fill with delay
  const cells = container.querySelectorAll('.ratio-cell');
  cells.forEach((cell, i) => {
    if (i < filled) {
      setTimeout(() => cell.classList.add('filled'), i * 30);
    }
  });
}
buildRatioGrid(document.getElementById('ratioGrid'), 100, 73);
</script>
```

---

### 4.3 SVG 折线图绘制动画

```html
<svg class="line-chart" viewBox="0 0 800 400">
  <!-- 坐标轴 -->
  <line x1="60" y1="360" x2="760" y2="360" stroke="var(--ink)" stroke-width="2"/>
  <line x1="60" y1="20"  x2="60"  y2="360" stroke="var(--ink)" stroke-width="2"/>
  <!-- 数据折线（stroke-dasharray 动画绘制）-->
  <path id="chartLine"
    d="M100,300 L200,250 L300,180 L400,120 L500,80 L600,50 L700,30"
    fill="none" stroke="var(--red)" stroke-width="3"
    stroke-dasharray="1000" stroke-dashoffset="1000"/>
  <!-- 数据点（逐个出现）-->
  <circle class="chart-dot" cx="100" cy="300" r="8" fill="var(--red)"/>
  <!-- 更多点... -->
</svg>

<script>
function drawChart() {
  const line = document.getElementById('chartLine');
  line.style.transition = 'stroke-dashoffset 1.5s ease-out';
  line.style.strokeDashoffset = '0';
  // 数据点延迟出现
  document.querySelectorAll('.chart-dot').forEach((dot, i) => {
    setTimeout(() => { dot.style.opacity = '1'; dot.style.transform = 'scale(1)'; }, i * 200 + 500);
  });
}
</script>
```

---

## § 5 时间线动画

### 5.1 水平时间轴生长

```html
<div class="timeline-h">
  <div class="tl-track">
    <div class="tl-line" id="tlLine"></div>
    <!-- 节点 -->
    <div class="tl-node" style="left:10%"  data-year="1950">
      <div class="tl-dot"></div>
      <div class="tl-label top">图灵测试<br><small>1950</small></div>
    </div>
    <div class="tl-node" style="left:35%"  data-year="1997">
      <div class="tl-dot"></div>
      <div class="tl-label bot">深蓝击败卡斯帕罗夫<br><small>1997</small></div>
    </div>
    <div class="tl-node" style="left:60%"  data-year="2017">
      <div class="tl-dot"></div>
      <div class="tl-label top">Transformer<br><small>2017</small></div>
    </div>
    <div class="tl-node" style="left:85%"  data-year="2022">
      <div class="tl-dot"></div>
      <div class="tl-label bot">ChatGPT<br><small>2022</small></div>
    </div>
  </div>
</div>

<style>
.timeline-h { width:100%; padding:40px 60px; }
.tl-track { position:relative; height:120px; }
.tl-line {
  position:absolute; top:50%; left:0;
  height:3px; background:var(--ink); width:0;
  transition: width 1.5s ease-out;
}
.tl-line.draw { width:100%; }
.tl-node { position:absolute; top:50%; transform:translate(-50%,-50%); }
.tl-dot {
  width:20px; height:20px; border-radius:50%;
  background:var(--ink); border:3px solid var(--cream);
  box-shadow:0 0 0 3px var(--ink);
  opacity:0; transform:scale(0);
  transition: all .4s cubic-bezier(.34,1.4,.64,1);
}
.tl-node.show .tl-dot { opacity:1; transform:scale(1); }
.tl-label { position:absolute; left:50%; transform:translateX(-50%); white-space:nowrap; font-size:18px; font-weight:900; }
.tl-label.top { bottom:calc(100% + 12px); }
.tl-label.bot { top:calc(100% + 12px); }
</style>

<script>
function drawTimeline() {
  document.getElementById('tlLine').classList.add('draw');
  document.querySelectorAll('.tl-node').forEach((node, i) => {
    setTimeout(() => node.classList.add('show'), i * 400 + 800);
  });
}
</script>
```

---

## § 6 框架动画

### 6.1 2×2 矩阵展开

```html
<!-- 用途：建立分析框架，象限依次出现 -->
<div class="matrix-wrap">
  <div class="matrix-y-label">← 高 · 重要性 · 低 →</div>
  <div class="matrix-grid">
    <div class="matrix-cell q1" data-step="1">
      <div class="q-num">I</div>
      <div class="q-title">重要且紧急</div>
    </div>
    <div class="matrix-cell q2" data-step="2">
      <div class="q-num">II</div>
      <div class="q-title">重要不紧急</div>
    </div>
    <div class="matrix-cell q3" data-step="3">
      <div class="q-num">III</div>
      <div class="q-title">紧急不重要</div>
    </div>
    <div class="matrix-cell q4" data-step="4">
      <div class="q-num">IV</div>
      <div class="q-title">不重要不紧急</div>
    </div>
  </div>
  <!-- 轴线 -->
  <div class="matrix-h-axis"></div>
  <div class="matrix-v-axis"></div>
</div>

<style>
.matrix-grid {
  display:grid; grid-template-columns:1fr 1fr;
  gap:0; width:640px; height:640px; position:relative;
}
.matrix-cell {
  border:2px solid var(--ink); padding:40px;
  display:flex; flex-direction:column; gap:12px;
  opacity:0; transition: opacity .5s, transform .5s;
  transform: scale(.9);
}
.matrix-cell.show { opacity:1; transform:scale(1); }
.q1 { background:rgba(200,67,42,.08); border-color:var(--red); }
.q2 { background:rgba(42,95,200,.08); border-color:var(--blue); }
.q3 { background:rgba(232,160,32,.08); border-color:var(--gold); }
.q4 { background:rgba(26,20,16,.04); }
.q-num { font-family:var(--font-display); font-size:48px; opacity:.3; }
.q-title { font-size:24px; font-weight:900; }
.matrix-h-axis {
  position:absolute; top:50%; left:0; right:0; height:3px;
  background:var(--ink); transform:translateY(-50%);
}
.matrix-v-axis {
  position:absolute; left:50%; top:0; bottom:0; width:3px;
  background:var(--ink); transform:translateX(-50%);
}
</style>
```

---

### 6.2 从混乱到有序（排序动画）

```html
<!-- 用途：展示"引入框架让混乱变有序" -->
<div class="chaos-stage" id="chaosStage">
  <!-- JS 生成随机分布的点，然后动画归位 -->
</div>

<script>
const categories = [
  { label:'概念', color:'var(--red)',  x:20, y:30 },
  { label:'过程', color:'var(--blue)', x:60, y:30 },
  { label:'案例', color:'var(--green)',x:20, y:70 },
  { label:'练习', color:'var(--gold)', x:60, y:70 },
];

function buildChaos(container) {
  const items = [];
  categories.forEach((cat, ci) => {
    for (let i = 0; i < 5; i++) {
      const dot = document.createElement('div');
      dot.className = 'chaos-dot';
      dot.style.cssText = `
        position:absolute;
        left:${Math.random()*90}%;
        top:${Math.random()*90}%;
        background:${cat.color};
        width:20px; height:20px; border-radius:50%;
        transition: all 1s cubic-bezier(.34,1.4,.64,1);
        transition-delay:${i*0.1}s;
      `;
      dot.dataset.catX = cat.x;
      dot.dataset.catY = cat.y;
      container.appendChild(dot);
      items.push(dot);
    }
  });
  return items;
}

function orderChaos(items) {
  // group by category and arrange
  items.forEach((dot, i) => {
    const offset = i % 5;
    dot.style.left  = (+dot.dataset.catX + offset*3) + '%';
    dot.style.top   = (+dot.dataset.catY + (offset > 2 ? 5 : 0)) + '%';
  });
}
</script>
```

---

## § 7 物理模拟动画

### 7.1 粒子系统（信息扩散/连接）

```html
<!-- 用途：展示网络效应、信息传播、分子运动 -->
<canvas id="particleCanvas" width="800" height="500"></canvas>

<script>
class ParticleSystem {
  constructor(canvas, opts={}) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.particles = [];
    this.opts = {
      count:    opts.count    || 60,
      color:    opts.color    || '#c8432a',
      connect:  opts.connect  || true,
      maxDist:  opts.maxDist  || 100,
      speed:    opts.speed    || 0.5,
    };
    this.init();
  }
  init() {
    for (let i = 0; i < this.opts.count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random()-.5) * this.opts.speed,
        vy: (Math.random()-.5) * this.opts.speed,
        r:  Math.random()*3+2,
      });
    }
  }
  draw() {
    const {ctx, canvas, particles, opts} = this;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach(p => {
      // move
      p.x += p.vx; p.y += p.vy;
      if (p.x<0||p.x>canvas.width)  p.vx*=-1;
      if (p.y<0||p.y>canvas.height) p.vy*=-1;
      // draw
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle = opts.color;
      ctx.fill();
    });
    if (opts.connect) {
      particles.forEach((a,i) => {
        particles.slice(i+1).forEach(b => {
          const d = Math.hypot(a.x-b.x, a.y-b.y);
          if (d < opts.maxDist) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(26,20,16,${1-d/opts.maxDist})`;
            ctx.lineWidth = .8;
            ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
            ctx.stroke();
          }
        });
      });
    }
    requestAnimationFrame(()=>this.draw());
  }
}
// 使用：new ParticleSystem(canvas).draw();
</script>
```

---

### 7.2 波动/涟漪动画

```html
<!-- 用途：展示影响力扩散、波的传播、情绪蔓延 -->
<div class="ripple-stage">
  <div class="ripple-source" id="rippleSrc" onclick="triggerRipple(this)">
    <div class="rs-icon">🎯</div>
  </div>
</div>

<style>
.ripple-stage { position:relative; width:600px; height:400px; display:flex; align-items:center; justify-content:center; }
.ripple-source { position:relative; z-index:10; cursor:pointer; }
.rs-icon { font-size:64px; }
.ripple-ring {
  position:absolute; top:50%; left:50%;
  border-radius:50%; border:2px solid var(--blue);
  transform:translate(-50%,-50%) scale(0);
  pointer-events:none;
  animation: rippleOut 2s ease-out forwards;
}
@keyframes rippleOut {
  0%   { width:0; height:0; opacity:.8; }
  100% { width:400px; height:400px; opacity:0; }
}
</style>

<script>
function triggerRipple(el) {
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      const ring = document.createElement('div');
      ring.className = 'ripple-ring';
      el.appendChild(ring);
      setTimeout(() => ring.remove(), 2000);
    }, i * 400);
  }
}
</script>
```

---

## § 8 学科动画

### 8.1 数学公式变换

```html
<!-- 用途：展示公式推导步骤 -->
<div class="formula-stage">
  <div class="formula-line" data-step="1">
    <span class="fm">E</span>
    <span class="fm op">=</span>
    <span class="fm">mc²</span>
  </div>
  <div class="formula-arrow" data-step="2">↓ <small>当 m=1kg, c=3×10⁸ m/s</small></div>
  <div class="formula-line" data-step="3">
    <span class="fm">E</span>
    <span class="fm op">=</span>
    <span class="fm highlight">9×10¹⁶ 焦耳</span>
  </div>
  <div class="formula-analogy" data-step="4">
    ≈ 引爆 <span class="fm highlight">2100万吨</span> TNT 炸药的能量
  </div>
</div>

<style>
.formula-stage { display:flex; flex-direction:column; gap:24px; align-items:flex-start; }
.formula-line { display:flex; align-items:center; gap:16px; }
.fm { font-family:'Courier New', monospace; font-size:56px; font-weight:bold; }
.fm.op { color:var(--gold); }
.fm.highlight { color:var(--red); background:rgba(200,67,42,.08); padding:4px 16px; border-radius:4px; }
.formula-arrow { font-size:24px; opacity:.5; margin-left:16px; }
.formula-analogy { font-size:28px; margin-left:8px; line-height:1.6; }
</style>
```

---

### 8.2 几何变换动画

```html
<!-- 用途：展示几何证明、空间变换、坐标系 -->
<svg class="geo-stage" viewBox="0 0 600 400" id="geoSvg">
  <!-- 坐标轴 -->
  <defs>
    <marker id="arrowHead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="var(--ink)" opacity=".5"/>
    </marker>
  </defs>
  <line x1="50"  y1="350" x2="560" y2="350" stroke="var(--ink)" stroke-width="1.5" opacity=".3" marker-end="url(#arrowHead)"/>
  <line x1="300" y1="380" x2="300" y2="20"  stroke="var(--ink)" stroke-width="1.5" opacity=".3" marker-end="url(#arrowHead)"/>

  <!-- 示例：单位圆 + 角度动画 -->
  <circle cx="300" cy="200" r="120" fill="none" stroke="var(--blue)" stroke-width="2" opacity=".4"/>
  <line id="geoRadius" x1="300" y1="200" x2="420" y2="200" stroke="var(--red)" stroke-width="3"/>
  <circle id="geoPoint" cx="420" cy="200" r="8" fill="var(--red)"/>
  <text id="geoAngleLabel" x="330" y="190" font-size="20" fill="var(--ink)">θ = 0°</text>
</svg>

<script>
let angle = 0;
let geoRunning = false;
function animateGeo() {
  if (!geoRunning) return;
  angle = (angle + 1) % 360;
  const rad = angle * Math.PI / 180;
  const x = 300 + 120 * Math.cos(rad);
  const y = 200 - 120 * Math.sin(rad);
  document.getElementById('geoRadius').setAttribute('x2', x);
  document.getElementById('geoRadius').setAttribute('y2', y);
  document.getElementById('geoPoint').setAttribute('cx', x);
  document.getElementById('geoPoint').setAttribute('cy', y);
  document.getElementById('geoAngleLabel').textContent = `θ = ${angle}°`;
  requestAnimationFrame(animateGeo);
}
</script>
```

---

## § 9 冲击型动画

### 9.1 打字机效果（AI 生成感）

```html
<div class="typewriter-wrap">
  <span id="twOut"></span><span class="tw-cur">▋</span>
</div>

<script>
function typeWrite(text, el=document.getElementById('twOut'), speed=45) {
  let i=0; el.textContent='';
  return new Promise(resolve => {
    const t = setInterval(() => {
      el.textContent += text[i++];
      if (i >= text.length) { clearInterval(t); resolve(); }
    }, speed);
  });
}
// 可链式调用
async function runTypeSequence() {
  await typeWrite('正在分析学生作业...');
  await new Promise(r => setTimeout(r, 600));
  await typeWrite('\n发现3个共同薄弱点 ✓');
  await typeWrite('\n生成个性化练习题 ✓');
}
</script>
<style>
.tw-cur { animation: blinkCur .7s infinite; }
@keyframes blinkCur { 0%,100%{opacity:1} 50%{opacity:0} }
</style>
```

---

### 9.2 脉冲节点（激活/连接感）

```html
<div class="pulse-node">
  <div class="pn-ring r1"></div>
  <div class="pn-ring r2"></div>
  <div class="pn-core">MCP</div>
</div>

<style>
.pulse-node { position:relative; display:inline-flex; align-items:center; justify-content:center; }
.pn-core {
  width:100px; height:100px; border-radius:50%;
  background:var(--ink); color:var(--cream);
  display:flex; align-items:center; justify-content:center;
  font-family:var(--font-label); font-size:20px; z-index:1;
}
.pn-ring {
  position:absolute; border-radius:50%;
  border:2px solid var(--red);
  animation: pulseOut 2.5s ease-out infinite;
}
.r1 { width:100px; height:100px; }
.r2 { width:100px; height:100px; animation-delay:.8s; }
@keyframes pulseOut {
  0%   { width:100px; height:100px; opacity:.7; }
  100% { width:200px; height:200px; opacity:0; }
}
</style>
```

---

### 9.3 轨道运动（系统/生态）

```html
<!-- 用途：展示生态系统、多工具围绕核心运转 -->
<div class="orbital-sys">
  <div class="orb-core">AI</div>
  <div class="orb-ring r1">
    <div class="orb-satellite" style="animation:counterSpin1 8s linear infinite">🗂️</div>
  </div>
  <div class="orb-ring r2" style="animation-duration:14s;animation-direction:reverse">
    <div class="orb-satellite" style="animation:counterSpin2 14s linear infinite reverse">🌐</div>
  </div>
</div>

<style>
.orbital-sys { position:relative; width:400px; height:400px; }
.orb-core {
  position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
  width:80px; height:80px; border-radius:50%;
  background:var(--ink); color:var(--cream);
  display:flex; align-items:center; justify-content:center;
  font-family:var(--font-label); font-size:18px; z-index:10;
}
.orb-ring {
  position:absolute; top:50%; left:50%; border-radius:50%;
  border:1.5px dashed rgba(26,20,16,.2);
  animation:orbitSpin linear infinite;
  transform-origin:center center;
}
.r1 { width:200px; height:200px; margin:-100px 0 0 -100px; animation-duration:8s; }
.r2 { width:320px; height:320px; margin:-160px 0 0 -160px; animation-duration:14s; }
.orb-satellite {
  position:absolute; top:-24px; left:50%; transform:translateX(-50%);
  font-size:32px; width:48px; height:48px;
  background:var(--cream); border:2px solid var(--ink);
  border-radius:8px; display:flex; align-items:center; justify-content:center;
  box-shadow:3px 3px 0 var(--ink);
}
@keyframes orbitSpin   { to { transform:rotate(360deg); } }
@keyframes counterSpin1 { to { transform:translateX(-50%) rotate(-360deg); } }
@keyframes counterSpin2 { to { transform:translateX(-50%) rotate(360deg); } }
</style>
```

---

## § 10 全局动画工具

### 10.1 Intersection Observer（滚动触发）

```javascript
// 用于滚动式 slides（替代点击触发）
const observer = new IntersectionObserver(
  entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      entry.target.querySelectorAll('[data-step]').forEach((el, i) => {
        setTimeout(() => el.classList.add('on'), i * 200);
      });
    }
  }),
  { threshold: 0.3 }
);
document.querySelectorAll('.slide').forEach(s => observer.observe(s));
```

### 10.2 缓动函数速查

```javascript
const ease = {
  outCubic:   t => 1 - Math.pow(1-t, 3),
  outElastic: t => t === 1 ? 1 : Math.pow(2,-10*t) * Math.sin((t*10-.75)*2*Math.PI/3) + 1,
  outBounce:  t => {
    const n1=7.5625, d1=2.75;
    if (t<1/d1) return n1*t*t;
    if (t<2/d1) return n1*(t-=1.5/d1)*t+.75;
    if (t<2.5/d1) return n1*(t-=2.25/d1)*t+.9375;
    return n1*(t-=2.625/d1)*t+.984375;
  },
  inOutQuad:  t => t < .5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2,
};
```

### 10.3 鼠标跟随 3D 倾斜

```javascript
// 用于封面卡片、产品展示
function add3DTilt(el) {
  el.addEventListener('mousemove', e => {
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width  - .5;
    const y = (e.clientY - rect.top)  / rect.height - .5;
    el.style.transform = `perspective(800px) rotateY(${x*15}deg) rotateX(${-y*15}deg) scale(1.02)`;
  });
  el.addEventListener('mouseleave', () => {
    el.style.transform = '';
    el.style.transition = 'transform .5s ease';
  });
}
```
