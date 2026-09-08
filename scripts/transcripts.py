import requests,re,json,pathlib,concurrent.futures
out=pathlib.Path(__file__).resolve().parent.parent/'.research'
def fetch(p):
 vid=p.stem;page=p.read_text(encoding='utf-8')
 m=re.search(r'"getTranscriptEndpoint":\{"params":"([^"]+)"',page)
 version=re.search(r'"INNERTUBE_CLIENT_VERSION":"([^"]+)"',page)
 if not m:return [vid,'no transcript endpoint']
 data={'context':{'client':{'clientName':'WEB','clientVersion':version.group(1) if version else '2.20260907.00.00','hl':'en','gl':'MY'}},'params':m.group(1)}
 try:
  r=requests.post('https://www.youtube.com/youtubei/v1/get_transcript',json=data,headers={'Origin':'https://www.youtube.com','Referer':'https://www.youtube.com/watch?v='+vid},timeout=30)
  (out/(vid+'-transcript.json')).write_text(r.text,encoding='utf-8')
  segments=[]
  def walk(x):
   if isinstance(x,dict):
    if 'transcriptSegmentRenderer' in x:
     s=x['transcriptSegmentRenderer'];segments.append((s.get('startMs'),s.get('snippet')))
    for y in x.values():walk(y)
   elif isinstance(x,list):
    for y in x:walk(y)
  if r.status_code==200:walk(r.json())
  (out/(vid+'-transcript.txt')).write_text('\n'.join(str(x) for x in segments),encoding='utf-8')
  return [vid,r.status_code,len(segments),r.text[:100] if not segments else str(segments[:1])]
 except Exception as e:return [vid,str(e)]
paths=[out/(x+'.html') for x in ['Em5Ls6ECFJ8','PHJ67Qx6MG0','xjBhlianxaM','elQNiT-fzkM','iP_ynRJtijc','2YZ4YG0DZJg']]
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 for r in pool.map(fetch,paths):print(r)
