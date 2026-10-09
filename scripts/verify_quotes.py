"""Check every Ask Sean quote appears word-for-word in its episode transcript.

Each podcast and buyer guide article presents exactly one line as Sean's own
words. Run this after editing any article to confirm that line is still
verbatim:

    python scripts/verify_quotes.py

Transcripts live in the gitignored .research/ directory (fetched with yt-dlp
and cleaned by scripts/clean_youtube_vtt.py). Captions carry no punctuation or
casing, so both sides are reduced to lowercase words before matching;
apostrophes stay inside words ("don't"). A quote must also stay under 15
words; the rest of each article is paraphrase. Exits non-zero on any problem.
"""

import glob
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
TRANSCRIPT_DIRS = ('.research/buyer-guides', '.research/missing', '.research/podcast')
MAX_QUOTE_WORDS = 15  # quotes stay under this many words


def words(text):
    text = text.lower().replace('’', "'")
    return re.findall(r"[a-z0-9']+", text)


def transcript_for(video_id):
    for directory in TRANSCRIPT_DIRS:
        path = ROOT / directory / f'{video_id}.en-orig.txt'
        if path.exists() and path.stat().st_size > 0:
            return path.read_text(encoding='utf-8')
    return None


failures = 0
for file in sorted(glob.glob(str(ROOT / 'content/articles/*.json'))):
    article = json.loads(pathlib.Path(file).read_text(encoding='utf-8'))
    if 'qa' not in article:
        continue
    quote = article['qa']['quote']
    source = transcript_for(article['videoId'])
    if source is None:
        print(f'NO TRANSCRIPT  {article["slug"]}')
        failures += 1
        continue
    ok = ' '.join(words(quote)) in ' '.join(words(source))
    short = len(words(quote)) < MAX_QUOTE_WORDS
    failures += not (ok and short)
    status = 'NOT FOUND' if not ok else 'TOO LONG ' if not short else 'VERBATIM '
    print(f'{status}  {article["slug"]:34} "{quote}"')

print(f'\n{failures} problem(s)')
raise SystemExit(1 if failures else 0)
