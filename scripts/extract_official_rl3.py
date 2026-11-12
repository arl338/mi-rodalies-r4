#!/usr/bin/env python3
"""Extract RL3-specific exact timetable cells from Rodalies' CURRENT July 6 PDF.

Do not infer RL3 times from RL4 services that share the same track.
Only lines explicitly labelled RL3 and containing nine real time cells pass.
Weekend page has two opposite tables with independent column layouts.
"""
import argparse,hashlib,json,re,urllib.request
from pathlib import Path
import fitz

SOURCE='https://rodalies.gencat.cat/web/.content/02_Horaris/horaris/RL3RL4.pdf'
EAST=['78400','78402','78403','78404','78405','78406','78407','78408','78500']
WEST=list(reversed(EAST))
CLOCK=re.compile(r'^([0-2]?\d)\.([0-5]\d)$')

def extract(pdf_bytes):
 pdf=fitz.open(stream=pdf_bytes,filetype='pdf')
 if len(pdf)!=3:raise ValueError('Unexpected official RL3RL4 PDF page count')
 collected=[]
 stats=[]
 for page_no,page in enumerate(pdf):
  words=page.get_text('words')
  found=[]
  # Train number is paired with an RL3 label on the same printed row.
  for label in words:
   if label[4]!='RL3':continue
   y=(label[1]+label[3])/2
   nearby=[w for w in words if abs((w[1]+w[3])/2-y)<=4]
   nums=[w for w in nearby if re.fullmatch(r'\d{5}',w[4]) and w[0]>label[2] and w[0]-label[2]<90]
   if len(nums)!=1:continue
   number=nums[0][4]
   clocks=[]
   for w in nearby:
    m=CLOCK.fullmatch(w[4])
    if m:
     h,mm=map(int,m.groups())
     if h<24:clocks.append((w[0],60*h+mm,w[4]))
   clocks.sort(key=lambda t:t[0])
   if len(clocks)!=9:raise ValueError(f'RL3 {number} has {len(clocks)} printed station cells, expected 9')
   clock_values=[t[1] for t in clocks]
   if any(clock_values[i]>=clock_values[i+1] for i in range(8)):
    raise ValueError(f'RL3 {number} non-monotonic PDF times')
   # Page 0 west, page 1 east. Page 2 has two printed tables:
   # upper west, lower east (different origins and column anchors).
   direction=('west' if page_no==0 else 'east' if page_no==1 else 'west' if y<page.rect.height*0.65 else 'east')
   stops=list(zip(WEST if direction=='west' else EAST,clock_values))
   found.append({'id':f'pdf-rl3-{page_no}-{number}',
      'train_number':number,'calendar':'weekday' if page_no<2 else 'weekend',
      'direction':direction,'stops':stops})
  stats.append({'page':page_no,'rl3_rows':len(found),
    'numbers':[f['train_number'] for f in found]})
  collected+=found
 if [x['rl3_rows'] for x in stats]!=[6,6,4]:
  raise ValueError(f'Unexpected RL3 timetable counts {stats}')
 if sum(r['calendar']=='weekend' and r['direction']=='west' for r in collected)!=2:
  raise ValueError('Wrong weekend west count')
 if sum(r['calendar']=='weekend' and r['direction']=='east' for r in collected)!=2:
  raise ValueError('Wrong weekend east count')
 checks={(t['train_number'],t['calendar']):{k:v for k,v in t['stops']} for t in collected}
 assert checks[('15609','weekday')]['78407']==15*60+58
 assert checks[('33541','weekday')]['78407']==19*60+31
 assert checks[('33541','weekday')]['78400']==20*60+8
 assert checks[('33548','weekday')]['78407']==18*60+30
 assert checks[('33548','weekday')]['78500']==18*60+46
 result={'schema':1,'line':'RL3','source':SOURCE,'pdf_sha256':hashlib.sha256(pdf_bytes).hexdigest(),
  'published_date':'2026-07-06','verified_date':'2026-11-12','stats':stats,
  'note':'Exact RODALIES RL3 timetable cells, not live positions; weekdays vs weekends only; no special public holiday handling.',
  'services':collected}
 return result

def main():
 ap=argparse.ArgumentParser()
 ap.add_argument('--out',default='data/reference/rl3_official_timetable.json')
 args=ap.parse_args()
 req=urllib.request.Request(SOURCE,headers={'User-Agent':'MiRodalies/2.3.2 RL3 verification'})
 with urllib.request.urlopen(req,timeout=35) as r:raw=r.read(10000001)
 if not raw.startswith(b'%PDF') or len(raw)>=10000001:raise ValueError('Unexpected source document')
 reference=extract(raw)
 out=Path(args.out);out.parent.mkdir(parents=True,exist_ok=True)
 out.write_text(json.dumps(reference,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf8')
 print('RL3_OFFICIAL',json.dumps({'sha':reference['pdf_sha256'],
 'stats':reference['stats'],'test_corridor':[15*60+58,19*60+31]}))
if __name__=='__main__':main()
