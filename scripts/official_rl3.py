"""Official 6 July 2026 RL3 planned trains, 9 explicit stops per service.

No interpolation and no imputed live ETA. This is a secondary official
data source when Renfe Cercanías GTFS lacks RL3 stop_times.
"""
import json
from datetime import datetime,time,timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

REFERENCE=Path(__file__).resolve().parents[1]/'data/reference/rl3_official_timetable.json'
SOURCE='https://rodalies.gencat.cat/web/.content/02_Horaris/horaris/RL3RL4.pdf'
TZ=ZoneInfo('Europe/Madrid')
STATIONS={'78400','78402','78403','78404','78405','78406','78407','78408','78500'}

def load_reference(path=REFERENCE):
 doc=json.loads(Path(path).read_text(encoding='utf8'))
 if doc.get('schema')!=1 or doc.get('line')!='RL3' or doc.get('source')!=SOURCE:raise ValueError('Invalid RL3 official source')
 counts={(cal,way):sum(r['calendar']==cal and r['direction']==way for r in doc['services'])
         for cal in ['weekday','weekend'] for way in ['west','east']}
 if counts!={('weekday','west'):6,('weekday','east'):6,
            ('weekend','west'):2,('weekend','east'):2}:raise ValueError('RL3 source rows incomplete/changed')
 if len(doc.get('pdf_sha256',''))!=64:raise ValueError('RL3 PDF hash missing')
 ids=set()
 for s in doc['services']:
  if s['id'] in ids:raise ValueError('Duplicate RL3 service')
  ids.add(s['id'])
  stops=s['stops']
  if len(stops)!=9 or {c for c,_ in stops}!=STATIONS:raise ValueError('Wrong RL3 station cells')
  if not all(isinstance(m,int) and 0<=m<1800 for c,m in stops):raise ValueError('Bad RL3 official time')
  if any(stops[i][1]>=stops[i+1][1] for i in range(8)):raise ValueError('Wrong RL3 time direction')
  if not s.get('train_number','').isdigit():raise ValueError('RL3 official number missing')
 return doc

def materialize_day(day,reference):
 cal='weekend' if day.weekday()>=5 else 'weekday'
 anchor=datetime.combine(day,time.min,tzinfo=TZ)
 trains=[]
 for s in reference['services']:
  if s['calendar']!=cal:continue
  stops=[]
  for code,minute in s['stops']:
   when=int((anchor+timedelta(minutes=minute)).timestamp())
   stops.append([code,when,when])
  trains.append({'id':s['id']+'-'+day.isoformat(),'n':s['train_number'],'l':'RL3',
    'src':'official-rl3-pdf','dest':stops[-1][0],'s':stops})
 return trains

def duplicate(candidate,t):
 if t.get('l')!='RL3':return False
 c=candidate['s']
 if candidate['n'] and t.get('n') and candidate['n']!=t['n']:return False
 original={s[0]:s[2] for s in t.get('s',[])}
 return sum(code in original and abs(tm-original[code])<=60 for code,_,tm in c)>=2

def supplement_day(day,gtfs,reference):
 out=[]
 for pdf in materialize_day(day,reference):
  if any(duplicate(pdf,t) for t in gtfs) or any(duplicate(pdf,t) for t in out):continue
  out.append(pdf)
 return out

def metadata(doc,counts):
 return {'source':doc['source'],'document_sha256':doc['pdf_sha256'],
   'published_date':doc['published_date'],'verified_date':doc['verified_date'],
   'scope':'RL3 direct 9-station Cervera <-> Lleida-Pirineus service; exact printed stop times',
   'count_by_day':counts,'weekday_template_count':12,'weekend_template_count':4,
   'warning':'Only theoretical printed times. Public holiday service and disruptions may differ.'}
