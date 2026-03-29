#!/usr/bin/env python3
"""
edge-tts-worker.py — 逐段调用 edge-tts 合成语音

输入：JSON (stdin) — { segments, voice, rate, outputDir }
输出：JSON (stdout) — { files: [{ index, path, durationMs }], totalDurationMs }

每段独立生成一个 MP3，便于精确控制时间戳。
"""

import sys
import json
import asyncio
import os
import time

try:
    import edge_tts
except ImportError:
    print(json.dumps({"error": "edge-tts not installed. Run: pip install edge-tts"}), file=sys.stdout)
    sys.exit(1)


async def synthesize_segment(seg, voice, rate, output_dir):
    """合成单段文本为 MP3，返回文件路径和时长。"""
    index = seg["index"]
    text = seg["text"].strip()
    if not text:
        return {"index": index, "path": None, "durationMs": 0}

    filename = f"seg_{str(index).zfill(4)}.mp3"
    filepath = os.path.join(output_dir, filename)

    communicate = edge_tts.Communicate(text, voice, rate=rate)
    await communicate.save(filepath)

    # 用 ffprobe 获取精确时长
    duration_ms = get_audio_duration_ms(filepath)

    return {"index": index, "path": filepath, "durationMs": duration_ms}


def get_audio_duration_ms(filepath):
    """用 ffprobe 获取音频时长（毫秒）。"""
    import subprocess
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-print_format", "json",
             "-show_format", filepath],
            capture_output=True, text=True, timeout=10
        )
        info = json.loads(result.stdout)
        duration = float(info["format"]["duration"])
        return int(duration * 1000)
    except Exception:
        # fallback：按文件大小估算（MP3 ~16kbps for edge-tts）
        try:
            size = os.path.getsize(filepath)
            return int(size / 16 * 8)  # rough estimate
        except Exception:
            return 0


async def main():
    raw = sys.stdin.read()
    params = json.loads(raw)

    segments = params["segments"]
    voice = params.get("voice", "zh-CN-YunxiNeural")
    rate = params.get("rate", "+0%")
    output_dir = params["outputDir"]

    os.makedirs(output_dir, exist_ok=True)

    results = []
    for seg in segments:
        result = await synthesize_segment(seg, voice, rate, output_dir)
        results.append(result)
        # 进度输出到 stderr（不干扰 JSON stdout）
        print(f"  [TTS] seg {seg['index']}: {result['durationMs']}ms", file=sys.stderr)

    total_ms = sum(r["durationMs"] for r in results)

    output = {
        "files": results,
        "totalDurationMs": total_ms
    }

    print(json.dumps(output, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())
