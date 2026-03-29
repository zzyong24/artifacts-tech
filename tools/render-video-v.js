#!/usr/bin/env node
/**
 * render-video-v.js — 竖版视频渲染器（音频驱动时间轴）
 *
 * 与 render-video.js 的关键区别：
 *   - 时间轴来源：timing.json（TTS 真实时间戳），非 WPM 估算
 *   - 视口：1080×1920（竖屏）
 *   - 合成音频轨：ffmpeg 合并视频帧 + narration.mp3 + subtitles.srt
 *   - 输入：vertical.html（非 index.html）
 *
 * 用法：
 *   node tools/render-video-v.js <作品目录名> [选项]
 *
 * 示例：
 *   node tools/render-video-v.js 03-made-to-stick
 *   node tools/render-video-v.js 03-made-to-stick --platform douyin
 *   node tools/render-video-v.js 03-made-to-stick --no-subtitle
 *
 * 选项：
 *   --fps <n>          输出帧率，默认 60
 *   --width <n>        视口宽度，默认 1080
 *   --height <n>       视口高度，默认 1920
 *   --platform <name>  平台（douyin|xiaohongshu|both），默认 both
 *   --output <path>    输出 mp4 路径（覆盖默认）
 *   --base-url <url>   本地服务器地址，默认 http://localhost:8888
 *   --anim-wait <n>    advance 后等待动画完成（秒），默认 0.8
 *   --no-subtitle      不嵌入字幕
 *   --keep-frames      保留截帧目录
 */

const puppeteer = require('puppeteer');
const { execSync, spawnSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

// ── 参数解析 ──────────────────────────────────────────────────────────────────
const args     = process.argv.slice(2);
const workName = args.find(a => !a.startsWith('--'));
if (!workName) {
  console.error('用法: node tools/render-video-v.js <作品目录名> [选项]');
  process.exit(1);
}

function getOpt(name, fallback) {
  const idx = args.indexOf('--' + name);
  return idx >= 0 ? args[idx + 1] : fallback;
}

// 加载配置
let videoConfig = {};
try {
  const configPath = path.resolve(__dirname, '../.claude/artifacts.config.json');
  const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  videoConfig = raw.video || {};
} catch (e) { /* use defaults */ }

const FPS         = parseInt(getOpt('fps', videoConfig.fps || 60));
const WIDTH       = parseInt(getOpt('width', videoConfig.vertical?.width || 1080));
const HEIGHT      = parseInt(getOpt('height', videoConfig.vertical?.height || 1920));
const BASE_URL    = getOpt('base-url', 'http://localhost:8888');
const ANIM_WAIT   = parseFloat(getOpt('anim-wait', 0.8));
const PLATFORM    = getOpt('platform', 'both');
const KEEP_FRAMES = args.includes('--keep-frames');
const NO_SUBTITLE = args.includes('--no-subtitle');
const BGM_PATH    = getOpt('bgm', null);  // --bgm <path> 背景音乐

const WORK_DIR    = path.resolve(__dirname, '..', 'works', workName);
const AUDIO_DIR   = path.join(WORK_DIR, 'audio');
const VIDEO_DIR   = path.join(WORK_DIR, 'video');
const TIMING_PATH = path.join(AUDIO_DIR, 'timing.json');
const AUDIO_PATH  = path.join(AUDIO_DIR, 'narration.mp3');
const SRT_PATH    = path.join(AUDIO_DIR, 'subtitles.srt');
const SCRIPT_MD   = path.join(WORK_DIR, 'script.md');
const HTML_FILE   = path.join(WORK_DIR, 'vertical.html');
const FRAMES_DIR  = path.join(WORK_DIR, '_frames_v');
const CONCAT_TXT  = path.join(WORK_DIR, '_concat_v.txt');
const PAGE_URL    = `${BASE_URL}/works/${workName}/vertical.html`;

// 字幕配置
const subConfig = videoConfig.subtitle || {};
const SUB_FONT      = subConfig.font || 'Noto Sans SC';
const SUB_FONT_SIZE = subConfig.font_size || 42;
const SUB_MARGIN    = subConfig.margin_bottom || 160;
const SUB_OUTLINE   = subConfig.outline || 2;
const SUB_COLOR     = subConfig.color || '#FFFFFF';

// ── script.md 解析（用于 advance 时序）────────────────────────────────────────
function parseScript(mdText) {
  const slides = [];
  const slideBlocks = mdText.split(/\n(?=#{2,3}\s+Slide\s+\d)/);

  for (const block of slideBlocks) {
    const hm = block.match(/^#{2,3}\s+Slide\s+(\d+)/);
    if (!hm) continue;
    const slideNum = parseInt(hm[1]);

    const bodyLines = block.split('\n').slice(1)
      .filter(l => !l.match(/^#{1,4}\s/) && !l.match(/^---$/) && !l.match(/^>/) && l.trim() !== '');
    const bodyText = bodyLines.join('\n');

    const rawSegs = bodyText.split('{step}');
    const segments = rawSegs.map((seg, i) => ({
      text: seg.trim(),
      isStep: i < rawSegs.length - 1,
    })).filter(s => s.text.length > 0 || s.isStep);

    if (segments.length > 0) slides.push({ slideNum, segments });
  }
  return slides;
}

// ── 长字幕拆分：按标点断句 ──────────────────────────────────────────────────
function splitSubtitle(text, maxChars) {
  if (text.length <= maxChars) return [text];
  const chunks = [];
  let remaining = text;
  const punct = /[，。！？、；：,.!?;:]/;
  while (remaining.length > maxChars) {
    let cut = maxChars;
    // 从 maxChars 往前找标点
    for (let j = maxChars; j >= maxChars - 8 && j > 0; j--) {
      if (punct.test(remaining[j])) { cut = j + 1; break; }
    }
    chunks.push(remaining.substring(0, cut).trim());
    remaining = remaining.substring(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

// ── 从 timing.json 构建时间轴 ────────────────────────────────────────────────
function buildTimeline(timing, slides) {
  // 核心思路：视频帧的持续时间必须与 narration.mp3 的时间轴严格对齐。
  // timing.json 中的 startMs/endMs 是音频中的绝对时间戳（含段间静音），
  // 视频截帧的 holdMs 之和必须等于音频总长，否则会漂移。
  //
  // 策略：按 timing 条目逐段推进，在 timing 的 gap（静音区间）内触发 advance。
  // advance 的 "等待时间" 不额外加 —— 它消耗的是音频中已有的静音时间。

  const entries = [];
  let videoCursorMs = 0; // 视频时间轴游标

  for (let i = 0; i < timing.length; i++) {
    const t = timing[i];
    const prevEnd = i > 0 ? timing[i - 1].endMs : 0;
    const gapMs = t.startMs - prevEnd; // 段间静音（音频中已存在）

    // ① 静音 gap：在这个间隔内触发 advance（如果有的话）
    if (gapMs > 0) {
      // 判断是否需要 advance：当 slideRef 变了 或者前一段是 stepEnd
      const needAdvance = i > 0 && (timing[i - 1].isStepEnd || timing[i].slideRef !== timing[i - 1].slideRef);

      if (needAdvance) {
        // 先截一帧当前状态（advance 前），然后触发 advance
        // advance 的动画时间 = gap 的一部分
        const animTime = Math.min(gapMs, ANIM_WAIT * 1000);
        const remainGap = gapMs - animTime;

        entries.push({
          advance: true,
          holdMs: animTime,
          label: `advance@${(t.startMs / 1000).toFixed(1)}s`,
        });

        if (remainGap > 50) {
          entries.push({
            advance: false,
            holdMs: remainGap,
            label: `gap`,
          });
        }
      } else {
        // 没有 advance 需求，纯静音 hold
        entries.push({
          advance: false,
          holdMs: gapMs,
          label: `gap`,
        });
      }
    }

    // ② 语音段：截帧 hold 住，时长 = 音频段时长
    const segDuration = t.endMs - t.startMs;
    if (segDuration > 0) {
      const fullText = (t.text || '').trim();

      // 长字幕自动拆分：按标点断句，每段不超过 MAX_SUB_CHARS 字
      const MAX_SUB_CHARS = 28;
      if (fullText.length > MAX_SUB_CHARS) {
        const chunks = splitSubtitle(fullText, MAX_SUB_CHARS);
        const chunkDur = Math.floor(segDuration / chunks.length);
        for (let ci = 0; ci < chunks.length; ci++) {
          entries.push({
            advance: false,
            holdMs: ci < chunks.length - 1 ? chunkDur : segDuration - chunkDur * (chunks.length - 1),
            label: `${t.slideRef}:${chunks[ci].substring(0, 10)}`,
            subtitleText: chunks[ci],
          });
        }
      } else {
        entries.push({
          advance: false,
          holdMs: segDuration,
          label: `${t.slideRef}:${fullText.substring(0, 12)}`,
          subtitleText: fullText,
        });
      }
    }
  }

  // ③ 结尾：音频播完后额外停留
  entries.push({
    advance: false,
    holdMs: 2000,
    label: '结尾',
  });

  return entries;
}

// ── 主流程 ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🎬 render-video-v.js（竖版音频驱动）');
  console.log(`   作品：${workName}`);
  console.log(`   ${FPS}fps  ${WIDTH}×${HEIGHT}  平台：${PLATFORM}`);
  console.log(`   动画等待：${ANIM_WAIT}s\n`);

  // 检查必要文件
  if (!fs.existsSync(HTML_FILE)) {
    console.error(`❌ 找不到 vertical.html: ${HTML_FILE}`);
    console.error('   请先执行 /gen-slides-vertical 生成竖版幻灯片');
    process.exit(1);
  }
  if (!fs.existsSync(SCRIPT_MD)) {
    console.error(`❌ 找不到 script.md: ${SCRIPT_MD}`);
    process.exit(1);
  }

  // 加载 timing
  let timing = [];
  let hasAudio = false;
  if (fs.existsSync(TIMING_PATH) && fs.existsSync(AUDIO_PATH)) {
    timing = JSON.parse(fs.readFileSync(TIMING_PATH, 'utf-8'));
    hasAudio = true;
    console.log(`🎙  音频: ${AUDIO_PATH}`);
    console.log(`⏱  timing: ${timing.length} 段`);
  } else {
    console.warn('⚠️  未找到 timing.json / narration.mp3，将使用 WPM 估算时长（无音频轨）');
  }

  const slides = parseScript(fs.readFileSync(SCRIPT_MD, 'utf-8'));
  if (slides.length === 0) {
    console.error('❌ script.md 中没有 Slide 分段');
    process.exit(1);
  }

  // 构建时序
  const entries = hasAudio
    ? buildTimeline(timing, slides)
    : buildFallbackTimeline(slides);

  const totalMs = entries.reduce((s, e) => s + e.holdMs, 0);
  const totalFrames = entries.length;
  console.log(`⏱  预计视频时长：${(totalMs / 60000).toFixed(1)} 分钟 / ${(totalMs / 1000).toFixed(1)} 秒`);
  console.log(`📸 需要截帧：${totalFrames} 张\n`);

  // 清理帧目录
  if (fs.existsSync(FRAMES_DIR)) fs.rmSync(FRAMES_DIR, { recursive: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
  fs.mkdirSync(VIDEO_DIR, { recursive: true });

  // 启动 Puppeteer
  console.log('🚀 启动浏览器...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', `--window-size=${WIDTH},${HEIGHT}`],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });

  console.log('🌐 加载页面：' + PAGE_URL);
  await page.goto(PAGE_URL, { waitUntil: 'networkidle0', timeout: 30000 });

  // 注入 advance + 字幕控制函数
  await page.evaluate(() => {
    window.__autoAdvance = function() {
      if (typeof handleAdvance === 'function') return handleAdvance();
      if (typeof ctrl !== 'undefined' && typeof ctrl.advance === 'function') return ctrl.advance();
    };
    window.__setSubtitle = function(text) {
      const el = document.getElementById('subtitle-layer');
      if (!el) return;
      if (text) { el.textContent = text; el.classList.add('on'); }
      else { el.classList.remove('on'); el.textContent = ''; }
    };
  });

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const concatLines = [];
  let i = 0;

  console.log('📸 开始截帧...');
  for (const entry of entries) {
    if (entry.advance) {
      await page.evaluate(() => window.__autoAdvance());
    }
    // 设置 HTML 字幕层（始终生效，不受 --no-subtitle 控制）
    if (entry.subtitleText) {
      await page.evaluate((t) => window.__setSubtitle(t), entry.subtitleText);
    } else if (entry.advance) {
      await page.evaluate(() => window.__setSubtitle(''));
    }
    // 等待浏览器渲染字幕 + 动画
    await sleep(entry.advance ? entry.holdMs : 150);

    const fname = path.join(FRAMES_DIR, `frame${String(i).padStart(5, '0')}.png`);
    await page.screenshot({ path: fname });
    concatLines.push(`file '${fname}'`);
    concatLines.push(`duration ${(entry.holdMs / 1000).toFixed(4)}`);
    process.stdout.write(`\r   ${i + 1}/${totalFrames} 帧  [${entry.label}]  ${(entry.holdMs / 1000).toFixed(1)}s`);
    i++;
  }

  // ffmpeg concat 需要最后一帧再重复一次
  concatLines.push(`file '${path.join(FRAMES_DIR, `frame${String(i-1).padStart(5,'0')}.png`)}'`);
  console.log(`\n\n✅ 截帧完成（${i} 张）`);
  await browser.close();

  // 写 concat 文件
  fs.writeFileSync(CONCAT_TXT, concatLines.join('\n'));

  // 确定输出平台
  const platforms = PLATFORM === 'both' ? ['douyin', 'xiaohongshu'] : [PLATFORM];

  for (const platform of platforms) {
    const outputPath = getOpt('output', path.join(VIDEO_DIR, `${platform}.mp4`));
    console.log(`\n🎞  合成 ${platform} 版 → ${outputPath}`);

    const ffArgs = buildFFmpegArgs(platform, outputPath, hasAudio, totalMs);
    const result = spawnSync('ffmpeg', ffArgs, { stdio: 'inherit' });

    if (result.status !== 0) {
      console.error(`❌ ffmpeg 合成 ${platform} 失败`);
      continue;
    }

    const sizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
    console.log(`✅ ${platform}: ${outputPath} (${sizeMB} MB)`);
  }

  // 清理
  fs.unlinkSync(CONCAT_TXT);
  if (!KEEP_FRAMES) {
    fs.rmSync(FRAMES_DIR, { recursive: true });
    console.log('\n🧹 已清理截帧目录');
  }

  console.log(`\n🎉 竖版视频渲染完成！`);
  console.log(`   时长：${(totalMs / 60000).toFixed(1)} 分钟`);
  console.log(`   输出：${VIDEO_DIR}/`);
}

/**
 * 构建 ffmpeg 参数
 */
function buildFFmpegArgs(platform, outputPath, hasAudio, totalMs) {
  const ffArgs = ['-y'];

  // ── 所有输入 ──
  ffArgs.push('-f', 'concat', '-safe', '0', '-i', CONCAT_TXT);  // input 0: 视频帧

  if (hasAudio) {
    ffArgs.push('-i', AUDIO_PATH);  // input 1: 旁白音频
  }

  // BGM
  const bgmFile = BGM_PATH || path.join(AUDIO_DIR, 'bgm_placeholder.mp3');
  const hasBGM = hasAudio && fs.existsSync(bgmFile);
  if (hasBGM) {
    ffArgs.push('-i', bgmFile);  // input 2: BGM
  }

  // ── 滤镜 ──
  let vf = `fps=${FPS},scale=${WIDTH}:${HEIGHT}`;
  ffArgs.push('-vf', vf);

  if (hasBGM) {
    // 混音：旁白 100% + BGM 12%，BGM 尾部渐弱
    const fadeStart = Math.max(0, Math.floor((totalMs || 150000) / 1000) - 3);
    ffArgs.push('-filter_complex',
      `[1:a]volume=1.0[nar];[2:a]volume=0.12,afade=t=out:st=${fadeStart}:d=3[bgm];[nar][bgm]amix=inputs=2:duration=first[aout]`);
    ffArgs.push('-map', '0:v', '-map', '[aout]');
  }

  // ── 编码 ──
  ffArgs.push(
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
  );

  if (hasAudio && !hasBGM) {
    ffArgs.push('-c:a', 'aac', '-b:a', '192k');
  } else if (hasBGM) {
    ffArgs.push('-c:a', 'aac', '-b:a', '192k');
  }

  ffArgs.push('-shortest');
  ffArgs.push(outputPath);
  return ffArgs;
}

/**
 * 无音频时的 fallback 时间轴（WPM 估算）
 */
function buildFallbackTimeline(slides) {
  const WPM = 270;
  const PADDING = 0.8;
  const entries = [];

  entries.push({ advance: false, holdMs: 1500, label: '开场' });

  for (const slide of slides) {
    for (const seg of slide.segments) {
      const text = seg.text.replace(/[#>*_`|→\[\]【】{}]/g, '').trim();
      const zh = (text.match(/[\u4e00-\u9fff]/g) || []).length;
      const en = (text.match(/[a-zA-Z0-9]+/g) || []).length;
      const chars = zh + en * 2;
      const holdSec = Math.max(chars / WPM * 60 + PADDING, 0.8);

      entries.push({ advance: false, holdMs: holdSec * 1000, label: `S${slide.slideNum}` });
      if (seg.isStep) {
        entries.push({ advance: true, holdMs: ANIM_WAIT * 1000, label: `S${slide.slideNum}→advance` });
      }
    }

    const isLast = slide === slides[slides.length - 1];
    entries.push({
      advance: !isLast,
      holdMs: isLast ? 3000 : 500,
      label: isLast ? '结尾' : `S${slide.slideNum}→next`,
    });
  }

  return entries;
}

main().catch(err => {
  console.error('\n❌ 出错：', err.message);
  console.error(err.stack);
  process.exit(1);
});
