"""Validate property-review content and built routes before publishing."""
from __future__ import annotations

import json
from pathlib import Path
from urllib.request import Request, urlopen


root = Path(__file__).resolve().parent.parent
content_dir = root / "content" / "articles"
reviews = []
for path in content_dir.glob("*.json"):
    article = json.loads(path.read_text(encoding="utf-8"))
    if article["series"] == "property-reviews":
        reviews.append(article)

assert len(reviews) == 6, f"Expected 6 property reviews, found {len(reviews)}"
assert len({item["slug"] for item in reviews}) == len(reviews), "Duplicate article slug"
assert len({item["videoId"] for item in reviews}) == len(reviews), "Duplicate video ID"

for article in reviews:
    take = article.get("seanTake")
    assert take, f"{article['slug']} has no Sean's Take"
    assert len(take.get("pros", [])) == 3, f"{article['slug']} needs exactly 3 pros"
    assert len(take.get("cons", [])) == 3, f"{article['slug']} needs exactly 3 cons"
    route = root / "dist" / "client" / "articles" / f"{article['slug']}.html"
    assert route.exists(), f"Missing built route: {route}"
    html = route.read_text(encoding="utf-8")
    assert "3 on 3" in html and "WORTH CONSIDERING" in html and "WORTH WATCHING" in html

for article in reviews[-3:]:
    url = f"https://i.ytimg.com/vi/{article['videoId']}/maxresdefault.jpg"
    request = Request(url, method="HEAD", headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(request, timeout=20) as response:
        assert response.status == 200, f"Thumbnail failed: {url}"

print("Validated 6 property reviews, 6 Take 3 on 3 sections, and 3 new thumbnails.")
