#!/usr/bin/env node
/**
 * tools/tts/index.js — TTS 入口
 *
 * 读取 config 中的 tts 配置，分发到具体 provider。
 * 可插拔设计：每个 provider 实现 synthesize(segments, options) 接口。
 *
 * 用法：
 *   // 作为模块
 *   const tts = require('./tools/tts');
 *   const { audioPath, timing, totalDurationMs } = await tts.synthesize(segments, options);
 *
 *   // CLI 测试
 *   node tools/tts/index.js --test "这是一段测试文本"
 *   node tools/tts/index.js --test "这是一段测试文本" --voice zh-CN-XiaoyiNeural
 *   node tools/tts/index.js --check-deps
 *
 * 可插拔接口：
 *   segments = [{ index, text, slideRef, isStepEnd }]
 *   返回     = { audioPath, timing, totalDurationMs }
 *   timing   = [{ index, slideRef, startMs, endMs, isStepEnd, text }]
 */

const fs   = require('fs');
const path = require('path');

// 默认配置
const DEFAULT_CONFIG = {
  provider: 'edge-tts',
  voice: 'zh-CN-YunxiNeural',
  rate: '+0%',
  segment_pause_ms: 300,
  slide_pause_ms: 800,
};

// Provider 注册表
const PROVIDERS = {
  'edge-tts': () => require('./edge-tts'),
};

/**
 * 加载配置
 */
function loadConfig() {
  const configPath = path.resolve(__dirname, '../../.claude/artifacts.config.json');
  let userConfig = {};
  if (fs.existsSync(configPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      userConfig = raw.tts || {};
    } catch (e) {
      console.warn('⚠️  无法解析 artifacts.config.json:', e.message);
    }
  }
  return { ...DEFAULT_CONFIG, ...userConfig };
}

/**
 * 获取 provider 实例
 */
function getProvider(name) {
  const factory = PROVIDERS[name];
  if (!factory) {
    throw new Error(`Unknown TTS provider: ${name}. Available: ${Object.keys(PROVIDERS).join(', ')}`);
  }
  return factory();
}

/**
 * 主合成入口
 *
 * @param {Array} segments — [{ index, text, slideRef?, isStepEnd? }]
 * @param {Object} overrides — 覆盖配置
 * @returns {{ audioPath: string, timing: Array, totalDurationMs: number }}
 */
async function synthesize(segments, overrides = {}) {
  const config = loadConfig();
  const merged = { ...config, ...overrides };

  const provider = getProvider(merged.provider);

  return provider.synthesize(segments, {
    voice: merged.voice,
    rate: merged.rate,
    outputDir: merged.outputDir,
    segmentPauseMs: merged.segment_pause_ms,
    slidePauseMs: merged.slide_pause_ms,
  });
}

/**
 * 检查依赖
 */
function checkDeps(providerName) {
  const config = loadConfig();
  const name = providerName || config.provider;
  const provider = getProvider(name);
  return provider.checkDeps();
}

/**
 * 从 script-full.md 解析出 TTS 分段
 *
 * 返回 [{ index, text, slideRef, isStepEnd }]
 */
function parseScriptToSegments(scriptPath) {
  const md = fs.readFileSync(scriptPath, 'utf-8');
  const segments = [];
  let segIndex = 0;

  const slideBlocks = md.split(/\n(?=#{2,3}\s+Slide\s+\d)/);

  for (const block of slideBlocks) {
    const hm = block.match(/^#{2,3}\s+Slide\s+(\d+)/);
    if (!hm) continue;
    const slideNum = parseInt(hm[1]);

    // 提取正文（跳过标题、分隔符、引用）
    const bodyLines = block.split('\n').slice(1)
      .filter(l => !l.match(/^#{1,4}\s/) && !l.match(/^---$/) && !l.match(/^>/) && l.trim() !== '');
    const bodyText = bodyLines.join('\n');

    // 按 {step} 分段
    const rawSegs = bodyText.split('{step}');

    for (let i = 0; i < rawSegs.length; i++) {
      const text = cleanText(rawSegs[i]);
      if (!text) continue;

      const isStepEnd = i < rawSegs.length - 1;  // {step} 之前的段

      segments.push({
        index: segIndex++,
        text: optimizeForTTS(text),
        slideRef: `S${slideNum}`,
        isStepEnd,
      });
    }
  }

  return segments;
}

/**
 * 清理文本用于 TTS
 */
function cleanText(raw) {
  return raw
    .replace(/【[^】]*】/g, '')      // 移除动画标注
    .replace(/\[[^\]]*\]/g, '')     // 移除 markdown 链接文本
    .replace(/\{step\}/g, '')       // 移除残留 step 标记
    .replace(/[#>*_`|→]/g, '')      // 移除 markdown 格式符
    .replace(/\s+/g, ' ')           // 压缩空白
    .trim();
}

/**
 * TTS 发音优化：只做真正有帮助的文本预处理
 * 不做中文谐音替换（听感更奇怪），让 edge-tts 直接读英文
 */
function optimizeForTTS(text) {
  return text
    // 破折号 → 逗号停顿（避免 TTS 读出"破折号"或长停顿）
    .replace(/——/g, '，')
    .replace(/—/g, '，')
    // 省略号 → 短停顿
    .replace(/……/g, '，')
    .replace(/\.\.\./g, '，')
    // 书名号内容保留，但去掉书名号本身（TTS 会读"书名号"）
    .replace(/《([^》]+)》/g, '$1')
    // 确保英文缩写前后有空格，帮助 TTS 断句
    .replace(/([^\s\w])([A-Z]{2,})/g, '$1 $2')
    .replace(/([A-Z]{2,})([^\s\w])/g, '$1 $2')
    .trim();
}

// ── CLI 模式 ────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const args = process.argv.slice(2);

  function getOpt(name, fallback) {
    const idx = args.indexOf('--' + name);
    return idx >= 0 ? args[idx + 1] : fallback;
  }

  // --check-deps
  if (args.includes('--check-deps')) {
    const result = checkDeps();
    if (result.ok) {
      console.log('✅ TTS 依赖检查通过');
    } else {
      console.log('❌ TTS 依赖缺失:');
      result.errors.forEach(e => console.log(`   - ${e}`));
    }
    process.exit(result.ok ? 0 : 1);
  }

  // --test "文本"
  if (args.includes('--test')) {
    const testIdx = args.indexOf('--test');
    const text = args[testIdx + 1] || '这是一段测试文本。知识的诅咒告诉我们：你懂得越多，就越难想起不懂是什么感觉。';
    const voice = getOpt('voice', undefined);
    const outputDir = getOpt('output', path.resolve(__dirname, '../../_tts_test'));

    const segments = [
      { index: 0, text: text.split('。')[0] + '。', slideRef: 'S1', isStepEnd: true },
      { index: 1, text: text.split('。').slice(1).join('。'), slideRef: 'S1', isStepEnd: false },
    ].filter(s => s.text.replace(/。/g, '').trim());

    console.log('🧪 TTS 测试模式');
    console.log(`   文本: "${text}"`);
    console.log(`   输出: ${outputDir}\n`);

    const overrides = { outputDir };
    if (voice) overrides.voice = voice;

    synthesize(segments, overrides)
      .then(result => {
        console.log(`\n📊 结果:`);
        console.log(`   音频: ${result.audioPath}`);
        console.log(`   总时长: ${(result.totalDurationMs / 1000).toFixed(1)}s`);
        console.log(`   时间戳:`);
        result.timing.forEach(t => {
          console.log(`     [${t.slideRef}] ${t.startMs}ms → ${t.endMs}ms  "${t.text.substring(0, 30)}..."`);
        });

        // 保存 timing.json
        const timingPath = path.join(outputDir, 'timing.json');
        fs.writeFileSync(timingPath, JSON.stringify(result.timing, null, 2));
        console.log(`   timing: ${timingPath}`);
      })
      .catch(err => {
        console.error('❌ 测试失败:', err.message);
        process.exit(1);
      });
  }
}

module.exports = { synthesize, checkDeps, parseScriptToSegments, loadConfig };
