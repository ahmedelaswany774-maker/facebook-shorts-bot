#!/usr/bin/env python3
"""
generate_facebook_short.py

End-to-end generator for a single Facebook-ready short vertical video +
caption, meant to run in Termux or GitHub Actions. Mirrors the user's
existing YouTube Shorts pipeline (Groq -> gTTS -> Pollinations.ai -> FFmpeg).
Publishes ONLY to a Facebook Page via the official Graph API -- never to
a personal profile, since Meta does not support that.

Env vars required:
    GROQ_API_KEY
    FB_PAGE_ACCESS_TOKEN   (optional -- enables auto-publish to the Page)
    FB_PAGE_ID             (optional -- enables auto-publish to the Page)

Usage:
    python generate_facebook_short.py ["optional topic in Arabic"]
"""

import json
import os
import subprocess
import sys
import textwrap
import time
from datetime import datetime
from pathlib import Path

import requests
from gtts import gTTS

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GROQ_MODEL = "llama-3.3-70b-versatile"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

# -- Facebook Page publishing (Pages Graph API only -- NEVER personal profiles) --
FB_PAGE_ACCESS_TOKEN = os.environ.get("FB_PAGE_ACCESS_TOKEN")
FB_PAGE_ID = os.environ.get("FB_PAGE_ID")
FB_GRAPH_VERSION = "v21.0"

OUTPUT_ROOT = Path.home() / "facebook_shorts"


def call_groq(topic: str | None) -> dict:
    """Ask Groq for {title, script, caption}. Handles markdown-fenced JSON."""
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY environment variable is not set.")

    topic_line = f"الموضوع المطلوب: {topic}" if topic else (
        "اختر موضوعًا عامًا مثيرًا للاهتمام (قصة قصيرة، معلومة غريبة، أو موقف إنساني)."
    )

    prompt = textwrap.dedent(f"""
        أنت كاتب محتوى عربي لفيديوهات على فيسبوك مدتها حوالي 3 دقائق (حوالي 420-480 كلمة نطق).
        {topic_line}

        اكتب القصة/المحتوى بحيث يكون مقسّم لمقدمة تشد الانتباه، وسط فيه تطور وتفاصيل، وخاتمة قوية.

        أرجع الرد بصيغة JSON فقط، بدون أي نص إضافي وبدون Markdown fences، بالشكل التالي بالظبط:
        {{
          "title": "عنوان قصير جذاب",
          "script": "نص السرد الصوتي الكامل بالعربية الفصحى المبسطة، حوالي 420-480 كلمة (حوالي 3 دقائق نطق)",
          "caption": "كابشن جذاب لفيسبوك يبدأ بجملة startling/hook، يتبعها نص قصير، ثم سطر بـ 5-8 هاشتاجات مناسبة بالعربية والإنجليزية"
        }}
    """).strip()

    resp = requests.post(
        GROQ_URL,
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": GROQ_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.9,
        },
        timeout=60,
    )
    resp.raise_for_status()
    raw = resp.json()["choices"][0]["message"]["content"]

    cleaned = raw.replace("```json", "").replace("```", "").strip()
    return json.loads(cleaned)


def generate_voiceover(script_text: str, out_path: Path) -> float:
    """Generate Arabic TTS audio and return its duration in seconds."""
    tts = gTTS(text=script_text, lang="ar")
    tts.save(str(out_path))

    result = subprocess.run(
        [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(out_path),
        ],
        capture_output=True, text=True, check=True,
    )
    return float(result.stdout.strip())


def generate_images(script_text: str, out_dir: Path, num_images: int = 12) -> list[Path]:
    """Generate still images from Pollinations.ai based on script beats."""
    words = script_text.split()
    chunk_size = max(1, len(words) // num_images)
    beats = [
        " ".join(words[i:i + chunk_size])
        for i in range(0, len(words), chunk_size)
    ][:num_images]

    paths = []
    for i, beat in enumerate(beats):
        prompt = requests.utils.quote(f"cinematic illustration, {beat}"[:200])
        url = f"https://image.pollinations.ai/prompt/{prompt}?width=1080&height=1920&nologo=true"
        img_path = out_dir / f"image_{i:02d}.jpg"
        r = requests.get(url, timeout=60)
        r.raise_for_status()
        img_path.write_bytes(r.content)
        paths.append(img_path)
        time.sleep(1)
    return paths


def assemble_video(images: list[Path], audio_path: Path, audio_duration: float, out_path: Path):
    """Combine images + narration into a vertical 1080x1920 mp4 with ffmpeg."""
    per_image = audio_duration / len(images)

    concat_file = out_path.parent / "concat_list.txt"
    with open(concat_file, "w") as f:
        for img in images:
            f.write(f"file '{img.resolve()}'\n")
            f.write(f"duration {per_image}\n")
        f.write(f"file '{images[-1].resolve()}'\n")

    silent_video = out_path.parent / "silent.mp4"
    subprocess.run(
        [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_file),
            "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
            "-r", "30", "-pix_fmt", "yuv420p", str(silent_video),
        ],
        check=True, capture_output=True,
    )

    subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(silent_video), "-i", str(audio_path),
            "-c:v", "copy", "-c:a", "aac", "-map", "0:v:0", "-map", "1:a:0",
            str(out_path),
        ],
        check=True, capture_output=True,
    )

    silent_video.unlink(missing_ok=True)
    concat_file.unlink(missing_ok=True)


def publish_to_facebook_page(video_path: Path, caption: str) -> str:
    """
    Upload and publish a video to a Facebook PAGE (not a personal profile)
    via the official Graph API. Requires FB_PAGE_ACCESS_TOKEN + FB_PAGE_ID.
    """
    if not FB_PAGE_ACCESS_TOKEN or not FB_PAGE_ID:
        raise RuntimeError(
            "FB_PAGE_ACCESS_TOKEN or FB_PAGE_ID is not set. "
            "This function only publishes to a Facebook Page, never a personal profile."
        )

    url = f"https://graph-video.facebook.com/{FB_GRAPH_VERSION}/{FB_PAGE_ID}/videos"
    with open(video_path, "rb") as video_file:
        resp = requests.post(
            url,
            data={
                "access_token": FB_PAGE_ACCESS_TOKEN,
                "description": caption,
            },
            files={"source": video_file},
            timeout=300,
        )
    resp.raise_for_status()
    result = resp.json()
    if "id" not in result:
        raise RuntimeError(f"Facebook API did not return a video id: {result}")
    return result["id"]


def main():
    topic = sys.argv[1] if len(sys.argv) > 1 else None

    print("جاري توليد النص من Groq...")
    data = call_groq(topic)

    stamp = datetime.now().strftime("%Y-%m-%d_%H%M")
    out_dir = OUTPUT_ROOT / stamp
    out_dir.mkdir(parents=True, exist_ok=True)

    print("جاري توليد الصوت...")
    audio_path = out_dir / "voice.mp3"
    duration = generate_voiceover(data["script"], audio_path)

    print("جاري توليد الصور...")
    images = generate_images(data["script"], out_dir)

    print("جاري تجميع الفيديو...")
    video_path = out_dir / "video.mp4"
    assemble_video(images, audio_path, duration, video_path)

    caption_path = out_dir / "caption.txt"
    caption_path.write_text(data["caption"], encoding="utf-8")

    for img in images:
        img.unlink(missing_ok=True)
    audio_path.unlink(missing_ok=True)

    print("\n✅ الفيديو جاهز:")
    print(f"   الفيديو : {video_path}")
    print(f"   الكابشن : {caption_path}")

    if FB_PAGE_ACCESS_TOKEN and FB_PAGE_ID:
        print("\nجاري النشر على صفحة الفيسبوك...")
        post_id = publish_to_facebook_page(video_path, data["caption"])
        print(f"✅ اتنشر بنجاح على الصفحة! Video ID: {post_id}")
    else:
        print(
            "\n(FB_PAGE_ACCESS_TOKEN / FB_PAGE_ID مش متظبطين -- "
            "الفيديو محفوظ محليًا بس من غير نشر تلقائي.)"
        )


if __name__ == "__main__":
    main()
