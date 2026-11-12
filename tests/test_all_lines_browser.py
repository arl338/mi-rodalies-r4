"""Browser E2E: all-lines mode must recover two missing services from the
alternative timetable without falsely labelling either as a live train.
"""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
NOW=datetime.now(ZoneInfo('Europe/Madrid'))
NEXT=NOW+timedelta(minutes=35)
DAY=NEXT.date().isoformat()
DEP=int(NEXT.timestamp())
DAY_END=int((NEXT+timedelta(minutes=70)).timestamp())
stations=[
 {'id':'78400','name':'Lleida-Pirineus','lines':['RL3','RL4'],'schedule_lines':[]},
 {'id':'78500','name':'Cervera','lines':['RL3','RL4'],'schedule_lines':[]},
 {'id':'78710','name':'Terrassa Est','lines':['R4'],'schedule_lines':['R4']},
 {'id':'78805','name':'Barcelona-Plaça de Catalunya','lines':['R4'],'schedule_lines':['R4']}
]
cat={'schema':2,'batch_id':'multi-line-browser-proof',
 'coverage_start':DAY,'coverage_end':(NEXT+timedelta(days=13)).date().isoformat(),
 'generated_at':NOW.isoformat(),'reference_only':False,
 'lines':[{'id':name,'name':name,'present':name=='R4'} for name in ['RL3','RL4','R4']],
 'stations':stations,'network_reference':{'reference_station_count':len(stations)},
 'official_reference':{'lines':[]},'source_quality':{'by_line':{}}}
daily={'schema':2,'batch_id':cat['batch_id'],'day':DAY,'trains':[]}
timets=[('RL3',DEP),('RL4',DEP+300)]
def external(route):
 p=route.request.url
 if '/timetable?' in p:
  raw={'date':DAY,'total':2,'trains':[
   {'feed':'cercanias','operator':'Renfe Cercanías','product':'Cercanías '+ln,
    'train':None,'stops':5,'depMs':ts*1000,'arrMs':(ts+1800)*1000}
   for ln,ts in timets]}
 else:raw={}
 return route.fulfill(status=200,content_type='application/json',
  headers={'Access-Control-Allow-Origin':'*'},body=json.dumps(raw))
def application(route):
 from urllib.parse import urlsplit
 p=urlsplit(route.request.url).path.lstrip('/')
 if not p or p=='index.html':return route.fulfill(status=200,content_type='text/html',body=(ROOT/'index.html').read_bytes())
 if p=='data/v2/catalog.json':return route.fulfill(status=200,content_type='application/json',body=json.dumps(cat))
 if p=='data/v2/'+DAY+'.json':return route.fulfill(status=200,content_type='application/json',body=json.dumps(daily))
 f=ROOT/p
 if f.is_file() and p in ('app.js','engine.js','styles.css','manifest.webmanifest','icon-192.png','icon-512.png'):
  ty='application/javascript' if p.endswith('.js') else 'text/css' if p.endswith('.css') else 'image/png'
  return route.fulfill(status=200,content_type=ty,body=f.read_bytes())
 return route.fulfill(status=404,body='not found')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,
  locale='es-ES',timezone_id='Europe/Madrid',service_workers='block')
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('https://rodalies.test/**',application)
 for domain in ('trenalia.org','trenes.valfiguer.com','radardetrenes.com'):
  page.route('https://'+domain+'/**',external)
 page.goto('https://rodalies.test/',wait_until='domcontentloaded')
 page.wait_for_function("document.querySelector('#line-select')?.options.length >= 4")
 page.locator('#line-select').select_option('ALL')
 page.locator('#origin-input').select_option('78400')
 page.locator('#dest-input').select_option('78500')
 page.locator('#trip-date').fill(DAY)
 page.locator('#from-time').fill((NEXT-timedelta(minutes=2)).strftime('%H:%M'))
 page.locator('#to-time').fill((NEXT+timedelta(minutes=30)).strftime('%H:%M'))
 page.locator('#search').click()
 page.wait_for_function("document.querySelector('#results-total')?.textContent?.startsWith('2 ')",timeout=15000)
 assert page.locator('#results .train-card').count()==2
 assert page.locator('#results .line-pill').all_inner_texts()==['RL3','RL4']
 assert page.locator('#results .train-status').all_inner_texts()==['Solo horario','Solo horario']
 assert all('Trenalia' in text for text in page.locator('#results .train-evidence').all_inner_texts())
 assert page.evaluate('document.documentElement.scrollWidth')<=392
 assert not errors,errors
 print('PASS all-lines mode: RL3 and RL4 2/2 supplemental services, no invented live ETA or horizontal overflow')
 browser.close()
