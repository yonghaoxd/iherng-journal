import urllib.request
import re
import json

candidate_vids = ['mYiV-w5E31U', 'PX_oVjn95E8', 'DP9DzO1tmNY', 'hc6yjq2h9Uw', '4YwanbKHaZM', 'BKu_jopZlPY']
details = {}

for vid in candidate_vids:
    url = f'https://www.youtube.com/watch?v={vid}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8', errors='ignore')
        m = re.search(r'var ytInitialPlayerResponse = (.*?);</script>', html)
        if m:
            p = json.loads(m.group(1))
            d = p.get('videoDetails', {})
            details[vid] = {
                'title': d.get('title'),
                'author': d.get('author'),
                'lengthSeconds': d.get('lengthSeconds'),
                'publishDate': p.get('microformat', {}).get('playerMicroformatRenderer', {}).get('publishDate')
            }
        else:
            details[vid] = 'no player response'
    except Exception as e:
        details[vid] = str(e)

print(json.dumps(details, indent=2))
