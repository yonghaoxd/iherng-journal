import requests,json,re,pathlib,concurrent.futures
out=pathlib.Path(__file__).resolve().parent.parent/'.research'
videos=['Em5Ls6ECFJ8','PHJ67Qx6MG0','xjBhlianxaM','elQNiT-fzkM','iP_ynRJtijc','2YZ4YG0DZJg']
def get(vid):
 try:
  page=requests.get('https://www.youtube.com/watch?v='+vid,timeout=30).text
  (out/(vid+'.html')).write_text(page,encoding='utf-8')
  m=re.search(r'var ytInitialPlayerResponse = (.*?);</script>',page)
  if not m: return (vid,'no player data')
  p=json.loads(m.group(1))
  (out/(vid+'.json')).write_text(json.dumps(p,ensure_ascii=False),encoding='utf-8')
  d=p.get('videoDetails',{})
  tracks=p.get('captions',{}).get('playerCaptionsTracklistRenderer',{}).get('captionTracks',[])
  result={k:d.get(k) for k in ['videoId','title','shortDescription','lengthSeconds','thumbnail']}
  result['date']=p.get('microformat',{}).get('playerMicroformatRenderer',{}).get('publishDate')
  result['tracks']=[{'lang':t.get('languageCode'),'kind':t.get('kind')} for t in tracks]
  for t in tracks[:1]:
   cap=requests.get(t['baseUrl']+'&fmt=json3',timeout=30)
   (out/(vid+'-captions.json')).write_text(cap.text,encoding='utf-8')
   result['captionsResponse']=[cap.status_code,len(cap.content)]
  return result
 except Exception as e:return [vid,str(e)]
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 results=list(pool.map(get,videos))
(out/'episodes.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(results,ensure_ascii=False,indent=2))
