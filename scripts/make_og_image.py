"""Generate the default Open Graph card at public/og-default.png.

Run after changing the site palette, wordmark or collection counts:

    python scripts/make_og_image.py

The card intentionally uses the same fallback families the site's font stack
declares (Georgia for the serif accent, Segoe UI for the sans), so the image
stays close to the rendered site without shipping webfont binaries.
"""

from __future__ import annotations

import json
import pathlib

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "og-default.png"

W, H = 1200, 630
BG = (14, 16, 15)
TEXT_MAIN = (243, 241, 233)
TEXT_MUTED = (180, 181, 174)
TEXT_SUBTLE = (133, 137, 129)
TERRACOTTA = (255, 107, 61)
BORDER = (48, 53, 47)

FONTS = pathlib.Path("C:/Windows/Fonts")
SANS = FONTS / "segoeui.ttf"
SANS_BOLD = FONTS / "segoeuib.ttf"
SERIF_ITALIC = FONTS / "georgiai.ttf"


def font(path: pathlib.Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size)


def tracked(draw: ImageDraw.ImageDraw, xy, text, fnt, fill, tracking: float):
    """Draw text with letter spacing, which PIL does not support natively."""
    x, y = xy
    for char in text:
        draw.text((x, y), char, font=fnt, fill=fill)
        x += draw.textlength(char, font=fnt) + tracking
    return x


def counts() -> dict[str, int]:
    tally: dict[str, int] = {}
    for path in sorted((ROOT / "content" / "articles").glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        tally[data["series"]] = tally.get(data["series"], 0) + 1
    return tally


def main() -> None:
    img = Image.new("RGB", (W, H), BG)

    # Soft terracotta glow bleeding in from the lower right.
    glow = Image.new("RGB", (W, H), BG)
    gd = ImageDraw.Draw(glow)
    gd.ellipse([W - 340, H - 300, W + 260, H + 220], fill=(70, 32, 20))
    gd.ellipse([-260, -300, 240, 160], fill=(28, 32, 29))
    img = Image.blend(img, glow.filter(ImageFilter.GaussianBlur(150)), 0.9)

    draw = ImageDraw.Draw(img)

    # Hairline frame.
    draw.rectangle([40, 40, W - 41, H - 41], outline=BORDER, width=1)

    # Accent rule above the eyebrow.
    draw.rectangle([88, 104, 88 + 54, 107], fill=TERRACOTTA)

    tracked(
        draw,
        (88, 132),
        "EDITORIAL COMPANION  ·  INDEPENDENT CURATION",
        font(SANS_BOLD, 19),
        TEXT_SUBTLE,
        3.2,
    )

    draw.text((84, 196), "A little perspective.", font=font(SANS_BOLD, 72), fill=TEXT_MAIN)
    draw.text(
        (84, 288),
        "A better place to call home.",
        font=font(SERIF_ITALIC, 74),
        fill=TERRACOTTA,
    )

    draw.text(
        (88, 404),
        "Malaysian property walkthroughs, honest conversations and",
        font=font(SANS, 27),
        fill=TEXT_MUTED,
    )
    draw.text(
        (88, 442),
        "practical buyer playbooks from Sean Tan (@iherng).",
        font=font(SANS, 27),
        fill=TEXT_MUTED,
    )

    # Footer divider and wordmark.
    draw.line([88, 522, W - 88, 522], fill=BORDER, width=1)

    x = draw.text((84, 548), "iherng", font=font(SANS_BOLD, 38), fill=TEXT_MAIN)
    wordmark_w = draw.textlength("iherng", font=font(SANS_BOLD, 38))
    draw.text((84 + wordmark_w, 548), ".", font=font(SANS_BOLD, 38), fill=TERRACOTTA)
    tracked(
        draw,
        (84 + wordmark_w + 22, 562),
        "JOURNAL",
        font(SANS_BOLD, 18),
        TEXT_SUBTLE,
        3.0,
    )
    del x

    tally = counts()
    summary = (
        f"{tally.get('property-reviews', 0)} PROPERTY REVIEWS   ·   "
        f"{tally.get('iherng-podcast', 0)} PODCAST READS   ·   "
        f"{tally.get('buyer-guides', 0)} BUYER GUIDES"
    )
    fnt = font(SANS_BOLD, 18)
    width = sum(draw.textlength(c, font=fnt) + 2.4 for c in summary)
    tracked(draw, (W - 88 - width, 560), summary, fnt, TEXT_SUBTLE, 2.4)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
