import urllib.request
import urllib.parse
import re
import json

queries = [
    'iherng defect check',
    'iherng subsale new launch',
    'iherng delayed project abandoned'
]

results = {}
for q in queries:
    url = f'https://www.youtube.com/results?search_query={urllib.parse.quote(q)}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        html = urllib.request.urlopen(req, timeout=15).read().decode('utf-8', errors='ignore')
        matches = re.findall(r'"videoId":"([a-zA-Z0-9_-]{11})"', html)
        # Deduplicate while preserving order
        seen = set()
        vids = []
        for v in matches:
            if v not in seen:
                seen.add(v)
                vids.append(v)
        results[q] = vids[:5]
    except Exception as e:
        results[q] = str(e)

print(json.dumps(results, indent=2))
