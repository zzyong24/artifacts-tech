#!/usr/bin/env node
/**
 * subtitle-gen.js — timing.json → SRT 字幕生成
 *
 * 用法：
 *   node tools/subtitle-gen.js <timing.json路径> [输出SRT路径]
 *
 * 也可作为模块使用：
 *   const { generateSRT } = require('./subtitle-gen');
 *   const srt = generateSRT(timing);
 */

const fs   = require('fs');
const path = require('path');

/**
 * 毫秒转 SRT 时间格式 (HH:MM:SS,mmm)
 */
function msToSRT(ms) {
  const h  = Math.floor(ms / 3600000);
  const m  = Math.floor((ms % 3600000) / 60000);
  const s  = Math.floor((ms % 60000) / 1000);
  const mm = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(mm).padStart(3, '0')}`;
}

/**
 * 将长文本按字数分行（适配竖屏字幕）
 * 每行最多 maxChars 个字符
 */
function splitSubtitleText(text, maxChars = 18) {
  if (text.length <= maxChars) return text;

  const lines = [];
  let remaining = text;

  while (remaining.length > maxChars) {
    // 在 maxChars 附近找标点断句
    let splitPos = maxChars;
    const punctuation = /[，。！？、；：,\.!\?;:]/;

    // 从 maxChars 向前找标点
    for (let i = maxChars; i >= maxChars - 6 && i > 0; i--) {
      if (punctuation.test(remaining[i])) {
        splitPos = i + 1;
        break;
      }
    }

    lines.push(remaining.substring(0, splitPos).trim());
    remaining = remaining.substring(splitPos).trim();
  }

  if (remaining) lines.push(remaining);
  return lines.join('\n');
}

/**
 * timing 数组 → SRT 字幕字符串
 *
 * @param {Array} timing — [{ index, slideRef, startMs, endMs, text, isStepEnd }]
 * @param {Object} options — { maxCharsPerLine }
 * @returns {string} SRT 格式字幕
 */
function generateSRT(timing, options = {}) {
  const { maxCharsPerLine = 18 } = options;
  const entries = [];
  let seq = 1;

  for (const t of timing) {
    const text = (t.text || '').trim();
    if (!text) continue;
    if (t.endMs <= t.startMs) continue;

    const displayText = splitSubtitleText(text, maxCharsPerLine);

    entries.push([
      String(seq++),
      `${msToSRT(t.startMs)} --> ${msToSRT(t.endMs)}`,
      displayText,
      '',
    ].join('\n'));
  }

  return entries.join('\n');
}

/**
 * 生成 SRT 文件
 */
function generateSRTFile(timingPath, outputPath) {
  const timing = JSON.parse(fs.readFileSync(timingPath, 'utf-8'));
  const srt = generateSRT(timing);

  if (!outputPath) {
    outputPath = timingPath.replace(/timing\.json$/, 'subtitles.srt');
  }

  fs.writeFileSync(outputPath, srt, 'utf-8');
  console.log(`✅ 字幕生成: ${outputPath} (${timing.length} 条)`);
  return outputPath;
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('用法: node tools/subtitle-gen.js <timing.json> [output.srt]');
    process.exit(1);
  }
  generateSRTFile(args[0], args[1]);
}

module.exports = { generateSRT, generateSRTFile, msToSRT };
