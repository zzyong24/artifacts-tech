# /gen-video — 一条命令生成竖版短视频

从 Markdown 原文出发，编排全流程生成竖版短视频（9:16, 1080×1920），适配抖音/小红书。

纯动画 + AI 配音，无需真人画面，无需剪映。

## 使用方式

```
/gen-video <作品目录名> [选项]
```

**示例：**
```
/gen-video 03-made-to-stick
/gen-video 05-new-topic source.md
/gen-video 03-made-to-stick --skip-script --skip-slides
/gen-video 03-made-to-stick --platform douyin --tts-voice zh-CN-XiaoyiNeural
/gen-video 03-made-to-stick --dry-run
```

**选项：**

| 选项 | 说明 | 默认 |
|------|------|------|
| `--skip-script` | 跳过脚本生成（使用已有 script-full.md） | 否 |
| `--skip-slides` | 跳过竖版幻灯片生成（使用已有 vertical.html） | 否 |
| `--skip-tts` | 跳过 TTS 合成（使用已有 audio/） | 否 |
| `--tts-voice <voice>` | 指定 TTS 语音 | zh-CN-YunxiNeural |
| `--platform <p>` | 目标平台：`douyin` / `xiaohongshu` / `both` | both |
| `--dry-run` | 只检查环境和已有产物，不实际执行 | 否 |

---

## 执行步骤

### Step 1：读取配置 + 检查环境

读取 `.claude/artifacts.config.json`，获取 `tts`、`video`、`works_dir` 等配置。

**环境检查清单：**

```bash
# 以下工具必须可用
python3 --version        # Python 3.8+
python3 -c "import edge_tts"  # edge-tts 库
ffmpeg -version          # FFmpeg（视频合成）
ffprobe -version         # FFprobe（音频时长检测）
node --version           # Node.js（Puppeteer）
```

如有缺失，输出具体安装指引：
```
❌ 环境检查未通过：
  - edge-tts: pip install edge-tts
  - ffmpeg: brew install ffmpeg (macOS)
```

**降级判断**：若仅 edge-tts 缺失但其他都在，可降级为无声视频模式（WPM 估算时长），但需明确告知用户。

### Step 2：检查已有产物

扫描 `works/<作品目录名>/` 下已有文件，确定哪些步骤可跳过：

| 文件 | 存在 → 影响 |
|------|------------|
| `source.md` | 有内容源，可生成脚本 |
| `script.md` | 有口播稿，可跳过 `/gen-script` |
| `script-full.md` | 有完整逐字稿，TTS 输入源 |
| `vertical.html` | 有竖版幻灯片，可跳过 `/gen-slides-vertical` |
| `audio/narration.mp3` | 有音频，可跳过 TTS |
| `audio/timing.json` | 有时间戳 |
| `audio/subtitles.srt` | 有字幕 |

**输出产物清单**：

```
📂 works/03-made-to-stick/
  ✅ source.md         (已有)
  ✅ script.md         (已有)
  ✅ script-full.md    (已有)
  ❌ vertical.html     (需生成)
  ❌ audio/            (需生成)
  ❌ video/            (需生成)
```

**智能跳过**：
- 用户传 `--skip-script` → 跳过 Step 3
- 用户传 `--skip-slides` → 跳过 Step 4
- 用户传 `--skip-tts` → 跳过 Step 5
- 无 `--skip-*` 但产物已存在 → **询问用户**是否重新生成

### Step 3：生成/复用脚本

**条件**：`script-full.md` 不存在且未传 `--skip-script`

委托 `/gen-script`：
```
/gen-script <作品目录名> <内容来源>
```

若 `script-full.md` 已存在，直接使用。告知用户：
```
📝 使用已有脚本: works/<作品名>/script-full.md
```

### Step 4：生成竖版幻灯片

**条件**：`vertical.html` 不存在且未传 `--skip-slides`

委托 `/gen-slides-vertical`：
```
/gen-slides-vertical <作品目录名>
```

完整遵循 `gen-slides-vertical.md` 的流程（读取 VERTICAL.md、选布局变体、安全区域约束等）。

若 `vertical.html` 已存在，直接使用。

### Step 5：TTS 合成

**条件**：`audio/narration.mp3` 不存在且未传 `--skip-tts`

**5.1 准备分段文本**

从 `script-full.md` 解析 TTS 分段：

```javascript
const tts = require('./tools/tts');
const segments = tts.parseScriptToSegments('works/<作品名>/script-full.md');
```

每段格式：`{ index, text, slideRef, isStepEnd }`

**5.2 调用 TTS**

```javascript
const result = await tts.synthesize(segments, {
  outputDir: 'works/<作品名>/audio/',
  voice: options.ttsVoice,  // 命令行 --tts-voice 或配置默认值
});
```

**5.3 生成字幕**

```javascript
const { generateSRT } = require('./tools/subtitle-gen');
const srt = generateSRT(result.timing);
fs.writeFileSync('works/<作品名>/audio/subtitles.srt', srt);
```

**5.4 保存时间戳**

```javascript
fs.writeFileSync('works/<作品名>/audio/timing.json', JSON.stringify(result.timing, null, 2));
```

**产出：**
```
works/<作品名>/audio/
├── narration.mp3      # 完整配音
├── timing.json        # 分段时间戳
└── subtitles.srt      # SRT 字幕
```

### Step 6：质量守卫循环

**读取** `.claude/visual-cognition/GUARDRAILS.md`，执行最多 3 轮自检。

**每轮检查 4 个维度：**

1. **知识准确性** — 核对 vertical.html 中的数据/案例与 source.md
2. **逻辑清晰度** — Slide 顺序、{step} 认知节奏、前后衔接
3. **平台适配性** — 安全区域、字幕位置、时长、前 3 秒钩子
4. **执行可行性** — HTML 可渲染、TTS 文本正常、文件完整

**输出自检报告：**

```
🔍 质量守卫 — 第 1/3 轮

2.1 知识准确性    ✅ 所有数据点与 source.md 一致
2.2 逻辑清晰度    ✅ 叙事结构连贯，step 节奏合理
2.3 平台适配性    ⚠️ Slide 3 标题超出右侧安全区
2.4 执行可行性    ✅ 所有文件就绪

结论：⚠️ 需修复 1 项
```

**红线违反 → 立即停止，等用户确认。**
**3 轮后仍有 ⚠️ → 标记问题清单，交用户决策。**

### Step 7：视频合成

**启动本地服务器**（若未运行）：

```bash
# 在项目根目录启动静态文件服务
npx serve -l 8888 &
```

**调用竖版渲染器：**

```bash
node tools/render-video-v.js <作品目录名> --platform <platform>
```

渲染器流程：
1. Puppeteer 加载 `vertical.html`（1080×1920 视口）
2. 按 `timing.json` 时间戳截关键帧
3. ffmpeg 合成截帧 + `narration.mp3` + `subtitles.srt` → MP4

**平台差异：**

| 平台 | 画幅 | 时长建议 | 特殊处理 |
|------|------|---------|---------|
| 抖音 | 9:16 | ≤ 60s 最佳 | 无 |
| 小红书 | 9:16 | ≤ 180s 可接受 | 无 |

`--platform both` 时生成两个文件（内容相同，分别命名）。

### Step 8：输出确认

**输出完整报告：**

```
🎉 /gen-video 完成！

📂 产物清单:
  works/<作品名>/
  ├── source.md              (已有)
  ├── script.md              (已有)
  ├── script-full.md         (已有)
  ├── index.html             (已有，横版)
  ├── vertical.html          (本次生成)
  ├── audio/
  │   ├── narration.mp3      (2:15, 3.2MB)
  │   ├── timing.json        (28 段)
  │   └── subtitles.srt      (28 条)
  └── video/
      ├── douyin.mp4          (2:18, 45MB)
      └── xiaohongshu.mp4     (2:18, 45MB)

⏱  视频时长: 2 分 18 秒
🎙  TTS 语音: zh-CN-YunxiNeural
🎨  主题: 手绘创意
📊  质量守卫: 1 轮通过

🔗 预览:
  竖版幻灯片: http://localhost:8080/works/<作品名>/vertical.html
  横版幻灯片: http://localhost:8080/works/<作品名>/index.html
```

---

## 完整流程图

```
/gen-video <作品名>
    │
    ▼
Step 1: 读取配置 + 检查环境
    │   ├─ python3 ✅
    │   ├─ edge-tts ✅
    │   ├─ ffmpeg ✅
    │   └─ node ✅
    ▼
Step 2: 检查已有产物
    │   ├─ source.md?
    │   ├─ script-full.md?
    │   ├─ vertical.html?
    │   └─ audio/?
    ▼
Step 3: 生成脚本 ─── 委托 /gen-script
    │   (若已有 → 跳过)
    ▼
Step 4: 生成竖版幻灯片 ─── 委托 /gen-slides-vertical
    │   (若已有 → 跳过)
    ▼
Step 5: TTS 合成
    │   ├─ 解析 script-full.md → segments
    │   ├─ edge-tts 逐段合成 → MP3 + timing.json
    │   └─ timing → subtitles.srt
    ▼
Step 6: 质量守卫循环 (≤3 轮)
    │   ├─ 知识准确性
    │   ├─ 逻辑清晰度
    │   ├─ 平台适配性
    │   └─ 执行可行性
    ▼
Step 7: 视频合成
    │   ├─ 启动本地服务器
    │   ├─ Puppeteer 截帧 (1080×1920)
    │   └─ ffmpeg 合成 (帧 + 音频 + 字幕)
    ▼
Step 8: 输出确认
    │   ├─ 文件清单
    │   ├─ 时长/大小
    │   ├─ 质量报告
    │   └─ 预览链接
    ▼
  完成 🎉
```

---

## 错误处理

| 错误场景 | 处理 |
|---------|------|
| source.md 不存在 | 提示用户提供内容源，或进入交互问诊 |
| edge-tts 不可用 | 降级为 WPM 估算无声视频，明确告知 |
| vertical.html 渲染白屏 | 保留截帧目录（--keep-frames），输出排查建议 |
| ffmpeg 合成失败 | 输出完整 ffmpeg 命令 + 错误信息，供手动排查 |
| TTS 单段过长 (>200字) | 自动拆分为子段，插入自然停顿 |
| 视频超过 3 分钟 | 质量守卫警告，建议精简内容或拆分为上下集 |
| 本地服务器未启动 | 自动启动 `npx serve -l 8888`，完成后提示关闭 |

---

## 与已有命令的关系

```
/gen-script  ─→  source.md + script.md + script-full.md
                      │
/gen-slides  ─→  index.html (横版 1920×1080)     ← 不影响
                      │
/gen-slides-vertical ─→  vertical.html (竖版 1080×1920)
                      │
/gen-video   ─→  编排以上所有 + TTS + 视频合成
                      │
                 audio/ + video/ (最终产物)
```

`/gen-video` 是全流程编排器，内部委托各子命令，用户只需一条命令。
