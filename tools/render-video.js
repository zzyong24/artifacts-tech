#!/usr/bin/env node
/**
 * render-video.js — 将教学动画网页自动录制为 mp4
 *
 * 原理：
 *   1. 解析 script.md 中的 {step} 标记，计算每段口播时长
 *   2. 用 Puppeteer 在关键时间点截帧（advance 前、advance 后动画结束）
 *   3. 用 ffmpeg concat demuxer 把截帧拼成视频（每帧指定持续时长，无需大量重复帧）
 *
 * 用法：
 *   node tools/render-video.js <作品目录名> [选项]
 *
 * 示例：
 *   node tools/render-video.js 03-made-to-stick
 *   node tools/render-video.js 03-made-to-stick --wpm 240 --padding 1.5
 *
 * 选项：
 *   --wpm <n>        朗读语速（字/分钟），默认 270（约 4.5字/秒）
 *   --padding <n>    每段口播前后的停顿补偿（秒），默认 0.8
 *   --fps <n>        输出帧率，默认 60
 *   --width <n>      视口宽度，默认 1920
 *   --height <n>     视口高度，默认 1080
 *   --output <path>  输出 mp4 路径，默认 works/<作品名>/output.mp4
 *   --base-url <u>   本地服务器地址，默认 http://localhost:8888
 *   --anim-wait <n>  每次 advance 后等待动画完成的时间（秒），默认 1.0
 *   --keep-frames    保留截帧目录（默认完成后自动删除）
 */

const puppeteer = require('puppeteer');
const { execSync, spawnSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

// ── 参数解析 ──────────────────────────────────────────────────────────────────
const args     = process.argv.slice(2);
const workName = args.find(a => !a.startsWith('--'));
if (!workName) {
  console.error('用法: node tools/render-video.js <作品目录名> [选项]');
  process.exit(1);
}

function getOpt(name, fallback) {
  const idx = args.indexOf('--' + name);
  return idx >= 0 ? args[idx + 1] : fallback;
}

const WPM        = parseFloat(getOpt('wpm',        270));
const PADDING    = parseFloat(getOpt('padding',     0.8));
const FPS        = parseInt  (getOpt('fps',         60));
const WIDTH      = parseInt  (getOpt('width',       1920));
const HEIGHT     = parseInt  (getOpt('height',      1080));
const BASE_URL   = getOpt   ('base-url', 'http://localhost:8888');
const ANIM_WAIT  = parseFloat(getOpt('anim-wait',   1.0));   // 动画完成等待（秒）
const KEEP_FRAMES = args.includes('--keep-frames');

const WORK_DIR   = path.resolve(__dirname, '..', 'works', workName);
const SCRIPT_MD  = path.join(WORK_DIR, 'script.md');
const OUTPUT     = getOpt('output', path.join(WORK_DIR, 'output.mp4'));
const FRAMES_DIR = path.join(WORK_DIR, '_frames');
const CONCAT_TXT = path.join(WORK_DIR, '_concat.txt');
const PAGE_URL   = `${BASE_URL}/works/${workName}/index.html`;

// ── script.md 解析 ────────────────────────────────────────────────────────────
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
      text:   cleanText(seg),
      isStep: i < rawSegs.length - 1,
    })).filter(s => s.text.length > 0 || s.isStep);

    if (segments.length > 0) slides.push({ slideNum, segments });
  }
  return slides;
}

function cleanText(raw) {
  return raw
    .replace(/【[^】]*】/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\{step\}/g, '')
    .replace(/[#>*_`|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function calcDuration(text) {
  const zh  = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const en  = (text.match(/[a-zA-Z0-9]+/g)    || []).length;
  const chars = zh + en * 2;
  return Math.max(chars / WPM * 60 + PADDING, 0.8);
}

// ── 主流程 ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🎬 render-video.js');
  console.log(`   作品：${workName}`);
  console.log(`   语速：${WPM} 字/分钟 | 动画等待：${ANIM_WAIT}s | 段落补偿：${PADDING}s`);
  console.log(`   ${FPS}fps  ${WIDTH}×${HEIGHT}  →  ${OUTPUT}\n`);

  if (!fs.existsSync(SCRIPT_MD)) {
    console.error('❌ 找不到 script.md：' + SCRIPT_MD);
    process.exit(1);
  }

  const slides = parseScript(fs.readFileSync(SCRIPT_MD, 'utf-8'));
  if (slides.length === 0) {
    console.error('❌ script.md 中没有找到 Slide 分段，请检查格式（需要 ### Slide N + {step} 标记）');
    process.exit(1);
  }

  // 构建时序：每个 entry = { advance: bool, holdSec: number, label: string }
  // 截帧策略：
  //   - advance 前：截一帧，持续 holdSec（这段口播时间）
  //   - advance 后：等 ANIM_WAIT 秒动画跑完，截一帧作为下一段的起始帧
  const entries = [];

  // 页面加载后先等一会儿，截初始状态帧
  entries.push({ advance: false, holdSec: 1.5, label: '开场' });

  for (const slide of slides) {
    for (const seg of slide.segments) {
      const hold = seg.text.length > 0 ? calcDuration(seg.text) : 0.5;
      // 这段口播说完之前，画面停在当前状态
      entries.push({ advance: false, holdSec: hold, label: `S${slide.slideNum}` });
      if (seg.isStep) {
        // 触发 advance，等动画完成
        entries.push({ advance: true, holdSec: ANIM_WAIT, label: `S${slide.slideNum}→advance` });
      }
    }
    // slide 结尾停留
    const endHold = slide === slides[slides.length - 1] ? 3.0 : 0.5;
    entries.push({ advance: false, holdSec: endHold, label: `S${slide.slideNum}结尾` });
  }

  const totalSec = entries.reduce((s, e) => s + e.holdSec, 0);
  const totalFrames = entries.length;  // 一个 entry = 一张截图
  console.log(`⏱  预计视频时长：${(totalSec / 60).toFixed(1)} 分钟 / ${Math.round(totalSec)} 秒`);
  console.log(`📸 需要截帧：${totalFrames} 张（ffmpeg concat 每帧指定时长，高效）\n`);

  // 清理帧目录
  if (fs.existsSync(FRAMES_DIR)) fs.rmSync(FRAMES_DIR, { recursive: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });

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

  // 注入 advance 函数
  await page.evaluate(() => {
    window.__autoAdvance = function() {
      if (typeof handleAdvance === 'function') return handleAdvance();
      if (typeof ctrl !== 'undefined' && typeof ctrl.advance === 'function') return ctrl.advance();
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
    await sleep(entry.advance ? entry.holdSec * 1000 : 50); // advance 等动画；hold 只等短暂渲染
    const fname = path.join(FRAMES_DIR, `frame${String(i).padStart(5, '0')}.png`);
    await page.screenshot({ path: fname });
    concatLines.push(`file '${fname}'`);
    concatLines.push(`duration ${entry.holdSec.toFixed(4)}`);
    process.stdout.write(`\r   ${i + 1}/${totalFrames} 帧  [${entry.label}]  ${entry.holdSec.toFixed(1)}s`);
    i++;
  }
  // ffmpeg concat 需要最后一帧再重复一次
  concatLines.push(`file '${path.join(FRAMES_DIR, `frame${String(i-1).padStart(5,'0')}.png`)}'`);

  console.log(`\n\n✅ 截帧完成（${i} 张）`);
  await browser.close();

  // 写 concat 文件
  fs.writeFileSync(CONCAT_TXT, concatLines.join('\n'));

  // ffmpeg 合成
  console.log('\n🎞  ffmpeg 合成 mp4...');
  const ffArgs = [
    '-y',
    '-f', 'concat', '-safe', '0',
    '-i', CONCAT_TXT,
    '-vf', `fps=${FPS},scale=${WIDTH}:${HEIGHT}`,
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    OUTPUT,
  ];
  const result = spawnSync('ffmpeg', ffArgs, { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error('❌ ffmpeg 失败');
    process.exit(1);
  }

  // 清理
  fs.unlinkSync(CONCAT_TXT);
  if (!KEEP_FRAMES) {
    fs.rmSync(FRAMES_DIR, { recursive: true });
    console.log('🧹 已清理截帧目录');
  }

  const sizeMB = (fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(1);
  console.log(`\n🎉 完成！`);
  console.log(`   输出：${OUTPUT}`);
  console.log(`   大小：${sizeMB} MB`);
  console.log(`   时长：${(totalSec / 60).toFixed(1)} 分钟\n`);

  // 输出时序表供参考
  console.log('📋 时序表（可用于剪映对齐 TTS）：');
  console.log('┌──────────┬────────────┬──────────────────────────────────────┐');
  console.log('│  Slide   │ 时长(秒)   │ 说明                                 │');
  console.log('├──────────┼────────────┼──────────────────────────────────────┤');
  let cum = 0;
  for (const e of entries) {
    const ts = `${String(Math.floor(cum/60)).padStart(2,'0')}:${String(Math.floor(cum%60)).padStart(2,'0')}`;
    console.log(`│ ${ts}     │ ${e.holdSec.toFixed(1).padEnd(10)} │ ${e.label.padEnd(36)} │`);
    cum += e.holdSec;
  }
  console.log('└──────────┴────────────┴──────────────────────────────────────┘');
}

main().catch(err => {
  console.error('\n❌ 出错：', err.message);
  console.error(err.stack);
  process.exit(1);
});
