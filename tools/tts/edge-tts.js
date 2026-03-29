/**
 * edge-tts.js — edge-tts provider
 *
 * 可插拔 TTS 接口：synthesize(segments, options) → { audioPath, timing, totalDurationMs }
 *
 * 策略：逐段合成 → 段间插入静音 → concat 为完整 MP3
 * 避免整段合成导致的时间戳漂移问题。
 */

const { execSync, spawnSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const WORKER_PATH = path.join(__dirname, 'edge-tts-worker.py');
const PROJECT_ROOT = path.resolve(__dirname, '../..');

/**
 * 发现可用的 Python 路径（优先使用项目 venv）
 */
function findPython() {
  const candidates = [
    path.join(PROJECT_ROOT, '.venv', 'bin', 'python3'),   // 项目 venv
    path.join(PROJECT_ROOT, '.venv', 'bin', 'python'),
    'python3',                                              // 系统 PATH
    'python',
  ];
  for (const p of candidates) {
    try {
      execSync(`${p} --version`, { stdio: 'pipe' });
      return p;
    } catch { /* try next */ }
  }
  return null;
}

/**
 * 检查 edge-tts 环境是否可用
 */
function checkDeps() {
  const errors = [];

  const pythonBin = findPython();
  if (!pythonBin) {
    errors.push('python3 not found');
  } else {
    // 检查 edge-tts
    try {
      execSync(`${pythonBin} -c "import edge_tts"`, { stdio: 'pipe' });
    } catch {
      errors.push('edge-tts not installed (pip install edge-tts, or create .venv)');
    }
  }

  // 检查 ffmpeg / ffprobe
  try {
    execSync('ffprobe -version', { stdio: 'pipe' });
  } catch {
    errors.push('ffprobe not found (install ffmpeg)');
  }

  return { ok: errors.length === 0, errors, pythonBin };
}

/**
 * 生成指定时长的静音 MP3
 */
function generateSilence(durationMs, outputPath) {
  const durationSec = (durationMs / 1000).toFixed(3);
  spawnSync('ffmpeg', [
    '-y', '-f', 'lavfi', '-i',
    `anullsrc=channel_layout=mono:sample_rate=24000`,
    '-t', durationSec,
    '-c:a', 'libmp3lame', '-b:a', '48k',
    outputPath
  ], { stdio: 'pipe' });
}

/**
 * 逐段合成语音
 *
 * @param {Array} segments — [{ index, text, slideRef, isStepEnd }]
 * @param {Object} options — { voice, rate, outputDir, segmentPauseMs, slidePauseMs }
 * @returns {{ audioPath: string, timing: Array, totalDurationMs: number }}
 */
async function synthesize(segments, options = {}) {
  const {
    voice = 'zh-CN-YunxiNeural',
    rate = '+0%',
    outputDir,
    segmentPauseMs = 300,
    slidePauseMs = 800,
  } = options;

  if (!outputDir) throw new Error('outputDir is required');

  const tempDir = path.join(outputDir, '_tts_temp');
  fs.mkdirSync(tempDir, { recursive: true });

  // 调用 Python worker 逐段合成
  const workerInput = JSON.stringify({
    segments: segments.map(s => ({ index: s.index, text: s.text })),
    voice,
    rate,
    outputDir: tempDir,
  });

  console.log(`\n🎙  edge-tts: ${segments.length} 段, voice=${voice}, rate=${rate}`);

  const pythonBin = findPython();
  if (!pythonBin) throw new Error('python3 not found');

  const result = spawnSync(pythonBin, [WORKER_PATH], {
    input: workerInput,
    encoding: 'utf-8',
    timeout: 120000,
    stdio: ['pipe', 'pipe', 'inherit'],  // stderr 显示进度
  });

  if (result.status !== 0) {
    throw new Error(`edge-tts worker failed: ${result.stderr || 'unknown error'}`);
  }

  let workerOutput;
  try {
    workerOutput = JSON.parse(result.stdout);
  } catch (e) {
    throw new Error(`Failed to parse worker output: ${result.stdout}`);
  }

  if (workerOutput.error) {
    throw new Error(`edge-tts error: ${workerOutput.error}`);
  }

  // 构建 timing + concat 列表
  const timing = [];
  const concatFiles = [];
  let currentMs = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const fileInfo = workerOutput.files.find(f => f.index === seg.index);
    const durationMs = fileInfo ? fileInfo.durationMs : 0;

    // 记录时间戳
    timing.push({
      index: seg.index,
      slideRef: seg.slideRef,
      startMs: currentMs,
      endMs: currentMs + durationMs,
      isStepEnd: seg.isStepEnd || false,
      text: seg.text,
    });

    // 音频段
    if (fileInfo && fileInfo.path && durationMs > 0) {
      concatFiles.push(fileInfo.path);
    }

    currentMs += durationMs;

    // 段间静音
    const pauseMs = seg.isStepEnd ? slidePauseMs : segmentPauseMs;
    if (pauseMs > 0 && i < segments.length - 1) {
      const silencePath = path.join(tempDir, `silence_${i}.mp3`);
      generateSilence(pauseMs, silencePath);
      concatFiles.push(silencePath);
      currentMs += pauseMs;
    }
  }

  // concat 所有片段为完整 MP3
  const audioPath = path.join(outputDir, 'narration.mp3');

  if (concatFiles.length === 0) {
    throw new Error('No audio segments generated');
  }

  if (concatFiles.length === 1) {
    fs.copyFileSync(concatFiles[0], audioPath);
  } else {
    const concatList = path.join(tempDir, 'concat.txt');
    const lines = concatFiles.map(f => `file '${f.replace(/'/g, "'\\''")}'`);
    fs.writeFileSync(concatList, lines.join('\n'));

    const ffResult = spawnSync('ffmpeg', [
      '-y', '-f', 'concat', '-safe', '0',
      '-i', concatList,
      '-c:a', 'libmp3lame', '-b:a', '128k',
      audioPath,
    ], { stdio: 'pipe' });

    if (ffResult.status !== 0) {
      throw new Error(`ffmpeg concat failed: ${ffResult.stderr}`);
    }
  }

  // 清理临时文件
  fs.rmSync(tempDir, { recursive: true, force: true });

  const totalDurationMs = currentMs;
  console.log(`✅ TTS 合成完成: ${(totalDurationMs / 1000).toFixed(1)}s → ${audioPath}`);

  return { audioPath, timing, totalDurationMs };
}

module.exports = { synthesize, checkDeps };
