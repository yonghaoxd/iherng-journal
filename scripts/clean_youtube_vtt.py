"""Convert YouTube word-timed VTT captions into readable research text."""
from __future__ import annotations

import html
import re
import sys
from pathlib import Path


for raw_path in sys.argv[1:]:
    path = Path(raw_path)
    source = path.read_text(encoding="utf-8")
    transcript: list[str] = []
    for block in re.split(r"\r?\n\r?\n", source):
        lines = block.splitlines()
        timestamp_index = next((i for i, line in enumerate(lines) if "-->" in line), None)
        if timestamp_index is None:
            continue
        cue = " ".join(lines[timestamp_index + 1 :])
        cue = html.unescape(re.sub(r"<[^>]+>", "", cue))
        cue_tokens = cue.split()
        overlap = 0
        for size in range(min(len(transcript), len(cue_tokens)), 0, -1):
            if transcript[-size:] == cue_tokens[:size]:
                overlap = size
                break
        transcript.extend(cue_tokens[overlap:])
    cleaned = re.sub(r"\s+([,.?!:;])", r"\1", " ".join(transcript))
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    target = path.with_suffix(".txt")
    target.write_text(cleaned, encoding="utf-8")
    print(target)
