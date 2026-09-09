import urllib.request
import re
import json

queries = [
    'iherng subsale vs new launch',
    'iherng first time home buyer',
    'iherng how to buy property malaysia'
]

results = []
for q in queries:
    url = f'https://www.youtube.com/results?search_query={urllib.parse.quote(q)}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8', errors='ignore')
    matches = re.findall(r'"videoId":"([a-zA-Z0-9_-]{11})"', html)
    for vid in matches[:10]:
        if vid not in results:
            results.append(vid)

details = []
for vid in results:
    url = f'https://www.youtube.com/watch?v={vid}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        html = urllib.request.urlopen(req, timeout=8).read().decode('utf-8', errors='ignore')
        m = re.search(r'var ytInitialPlayerResponse = (.*?);</script>', html)
        if m:
            p = json.loads(m.group(1))
            d = p.get('videoDetails', {})
            author = d.get('author')
            sec = int(d.get('lengthSeconds', 0))
            if author == 'iherng' and sec > 300: # long form
                details.append({
                    'videoId': vid,
                    'title': d.get('title'),
                    'duration': f'{sec//60}:{sec%60:02d}',
                    'publishDate': p.get('microformat', {}).get('playerMicroformatRenderer', {}).get('publishDate', '')[:10]
                })
    except:
        pass

print(json.dumps(details, indent=2))
