#!/usr/bin/env python3
"""Read-only R1 official PDF grid geometry, no automatic schedules accepted."""
import io, re, collections, urllib.request, json
import fitz
url="https://rodalies.gencat.cat/web/.content/02_Horaris/horaris/R1.pdf"
req=urllib.request.Request(url,headers={"User-Agent":"MiRodalies/2.3.1 R1 validation"})
with urllib.request.urlopen(req,timeout=45) as r:raw=r.read(15_000_000)
assert raw.startswith(b'%PDF')
doc=fitz.open(stream=raw,filetype='pdf')
print('DOC',json.dumps({'pages':len(doc),'bytes':len(raw)}))
for page_no,p in enumerate(doc):
 w=p.get_text('words')
 tim=[]
 for x0,y0,x1,y1,t,*_ in w:
  if re.fullmatch(r'\d{1,2}\.\d\d',t):
   h,m=map(int,t.split('.'))
   if 0<=h<24 and 0<=m<60:tim.append((x0,y0,t))
 xs=[a for a,b,t in tim];ys=[b for a,b,t in tim]
 buckets=collections.Counter(round(x/5)*5 for x in xs)
 rows=collections.Counter(round(y/6)*6 for y in ys)
 report={'page':page_no,'size':[round(p.rect.width,1),round(p.rect.height,1)],
  'words':len(w),'time_words':len(tim),'x_span':[round(min(xs),2),round(max(xs),2)],
  'y_span':[round(min(ys),2),round(max(ys),2)],
  'x_buckets':buckets.most_common(36),'y_buckets':rows.most_common(10),
  'early_words':[{'x':round(x,1),'y':round(y,1),'v':t} for x,y,t in tim[:34]],
  'headers':[(round(a,1),round(b,1),t) for a,b,c,d,t,*_ in w if b<520 and t in ('L’Hospitalet','Mataró','Maçanet-Massanes','Hospitalet')][:15]}
 print('PAGE',json.dumps(report,ensure_ascii=False))
