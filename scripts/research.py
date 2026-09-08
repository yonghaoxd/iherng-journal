import requests, json, re, pathlib
base = pathlib.Path(__file__).resolve().parent.parent
out = base / '.research'
out.mkdir(exist_ok=True)
urls = {
 'channel':'https://www.youtube.com/@iherng/videos',
 'manor':'https://www.youtube.com/watch?v=Em5Ls6ECFJ8',
 'feed':'https://anchor.fm/s/13462f90/podcast/rss',
 'cempaka':'https://pokok.asia/make-townhouses-great-again-cempaka-seri-property-review/',
}
for name,url in urls.items():
 try:
  r=requests.get(url,timeout=30)
  (out/(name+'.html')).write_text(r.text,encoding='utf-8')
  print(name,r.status_code,len(r.content))
  if name=='channel':
   match=re.search(r'var ytInitialData = (.*?);</script>',r.text)
   if match:
    data=json.loads(match.group(1))
    (out/'channel.json').write_text(json.dumps(data,ensure_ascii=False),encoding='utf-8')
  if name=='cempaka': print(re.findall(r'(?:embed/|watch\?v=)([a-zA-Z0-9_-]{11})',r.text))
 except Exception as e: print(name,str(e))
