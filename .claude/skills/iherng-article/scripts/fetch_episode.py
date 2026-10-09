"""Fetch one of Sean's videos for an iherng Journal article and print what the article needs.

    python .claude/skills/iherng-article/scripts/fetch_episode.py VIDEO_ID [VIDEO_ID ...] --series buyer-guides

For each video this downloads Sean's own English captions (en-orig) and the
metadata into the transcript folder that scripts/verify_quotes.py reads,
cleans the captions into <id>.en-orig.txt, and prints the facts the article
JSON takes verbatim: title, date in Malaysia time, duration and transcript
length. It also flags videos the Journal already covers and descriptions that
suggest a guest, not Sean, does the answering.

yt-dlp runs from ask-sean/.venv (see ask-sean/README.md to create it).
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import pathlib
import re
import subprocess
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parents[4]
FOLDERS = {"iherng-podcast": ".research/podcast", "buyer-guides": ".research/buyer-guides"}
PYTHON = ROOT / "ask-sean" / ".venv" / ("Scripts/python.exe" if sys.platform == "win32" else "bin/python")
MYT = dt.timezone(dt.timedelta(hours=8))
GUEST_HINTS = re.compile(r"\b(lawyer|shout[- ]?out to|special thanks|with (?:mr|ms|dr|datuk|dato)\b|guest|panel|keynote|forum|interview)", re.I)


def covered_video_ids() -> dict[str, str]:
    found = {}
    for path in (ROOT / "content" / "articles").glob("*.json"):
        article = json.loads(path.read_text(encoding="utf-8"))
        if article.get("videoId"):
            found[article["videoId"]] = article["slug"]
    return found


def fetch(video_id: str, folder: pathlib.Path) -> None:
    vtt = folder / f"{video_id}.en-orig.vtt"
    if not vtt.exists():
        subprocess.run(
            [str(PYTHON), "-m", "yt_dlp", "--skip-download", "--write-auto-subs", "--write-subs",
             "--sub-langs", "en-orig", "--sub-format", "vtt", "--write-info-json", "--no-warnings",
             "-o", str(folder / "%(id)s.%(ext)s"), f"https://www.youtube.com/watch?v={video_id}"],
            check=False,
        )
    if not vtt.exists():
        print(f"{video_id}: no English captions (YouTube may still be generating them, or rate-limited; retry later)")
        return
    subprocess.run([sys.executable, str(ROOT / "scripts" / "clean_youtube_vtt.py"), str(vtt)], check=True,
                   stdout=subprocess.DEVNULL)

    info = json.loads((folder / f"{video_id}.info.json").read_text(encoding="utf-8"))
    text = (folder / f"{video_id}.en-orig.txt").read_text(encoding="utf-8")
    published = dt.datetime.fromtimestamp(info["timestamp"], MYT) if info.get("timestamp") else None
    description = (info.get("description") or "").strip()

    print(f"\n{video_id}  {info['title']}")
    print(f"  date (MYT):  {published:%Y-%m-%d}" if published else f"  upload_date: {info.get('upload_date')} (no timestamp; this is UTC)")
    print(f"  duration:    {info.get('duration_string')}")
    print(f"  transcript:  {len(text.split())} words -> {folder.relative_to(ROOT) / (video_id + '.en-orig.txt')}")
    if GUEST_HINTS.search(description[:600]):
        print("  CHECK:       the description mentions a guest, sponsor or event; confirm Sean himself gives the answer and note any sponsor or interest he declares")
    print("  description: " + re.sub(r"\s+", " ", description)[:400])


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("video_ids", nargs="+")
    parser.add_argument("--series", choices=sorted(FOLDERS), required=True)
    args = parser.parse_args()

    if not PYTHON.exists():
        sys.exit(f"{PYTHON} not found; create ask-sean/.venv and install yt-dlp first (ask-sean/README.md)")
    folder = ROOT / FOLDERS[args.series]
    folder.mkdir(parents=True, exist_ok=True)
    covered = covered_video_ids()

    for index, video_id in enumerate(args.video_ids):
        if video_id in covered:
            print(f"\n{video_id}: already published as /articles/{covered[video_id]}; skipping")
            continue
        if index:
            time.sleep(4)  # YouTube answers rapid caption requests with HTTP 429
        fetch(video_id, folder)


if __name__ == "__main__":
    main()
