"""List iherng property-review videos and public episode metadata.

Editorial research helper; it does not run in the website.
"""
from __future__ import annotations

import json
import re
from urllib.parse import quote
from urllib.request import Request, urlopen


def get(url: str) -> str:
    request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urlopen(request, timeout=30).read().decode("utf-8", "ignore")


search_url = "https://www.youtube.com/@iherng/search?query=" + quote("PROPERTY REVIEW")
search_page = get(search_url)
ids: list[str] = []
for video_id in re.findall(r'"videoId":"([\w-]{11})"', search_page):
    if video_id not in ids:
        ids.append(video_id)

results = []
for video_id in ids[:24]:
    page = get(f"https://www.youtube.com/watch?v={video_id}")
    match = re.search(r"var ytInitialPlayerResponse = (.*?);</script>", page)
    if not match:
        continue
    player = json.loads(match.group(1))
    details = player.get("videoDetails", {})
    title = details.get("title", "")
    if details.get("author") != "iherng" or not title.startswith("PROPERTY REVIEW"):
        continue
    seconds = int(details.get("lengthSeconds", "0"))
    results.append(
        {
            "videoId": video_id,
            "title": title,
            "date": player.get("microformat", {})
            .get("playerMicroformatRenderer", {})
            .get("publishDate", "")[:10],
            "duration": f"{seconds // 60}:{seconds % 60:02d}",
            "description": details.get("shortDescription", ""),
        }
    )

print(json.dumps(results, ensure_ascii=False, indent=2))
