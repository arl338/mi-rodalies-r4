#!/usr/bin/env python3
"""V2.2.1 Chromium smoke: timetable boundary, real ETA label and Android layout.

All data and HTTP APIs are synthetic. Tests behaviour and rendering, not the
accuracy of any live train observation. No real user information is accessed.
"""
import json
from datetime import datetime,timedelta
from zoneinfo import ZoneInfo
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
TZ=ZoneInfo('Europe/Madrid')
NOW=datetime.now(TZ)
DAY=NOW.date().isoformat()
DEP=int((NOW+timedelta(minutes=32)).timestamp())
ARR=DEP+2400
ORIGIN='78710'
DEST='78805'
TRIP='5115J77512R4'
def utc_iso(dt):
 return dt.astimezone(ZoneInfo('UTC')).isoformat()
CATALOG={
 'schema':2,'batch_id':'ui-v221-synthetic','reference_only':False,
 'coverage_start':DAY,'coverage_end':(NOW+timedelta(days=13)).date().isoformat(),
 'generated_at':utc_iso(NOW),
 'lines':[{'id':'R4','name':'R4','present':True,'scheduled_trips_in_period':1},
          {'id':'R2N','name':'R2 Nord','present':False,'scheduled_trips_in_period':0}],
 'stations':[{'id':'78710','name':'Terrassa Est','lines':['R4'],'schedule_lines':['R4']},
             {'id':'78805','name':'Barcelona-Plaça de Catalunya','lines':['R4'],'schedule_lines':['R4']},
             {'id':'71801','name':'Barcelona-Sants','lines':['R4','R2N'],'schedule_lines':['R4']},
             {'id':'79100','name':'Granollers Centre','lines':['R2N'],'schedule_lines':[]}],
 'official_reference':{'lines':[]},'source_quality':{'by_line':{}},
 'network_reference':{'reference_station_count':4,'line_station_counts':{'R4':3,'R2N':2}}
}
DAILY={'schema':2,'day':DAY,'batch_id':'ui-v221-synthetic',
 'trains':[{'id':TRIP,'n':'77512','l':'R4','day':DAY,'s':[
    [ORIGIN,DEP,DEP],[DEST,ARR,ARR]]}]}
def respond(route):
 from urllib.parse import urlparse
 u=urlparse(route.request.url)
 p=u.path
 if p.endswith('/catalog.json'):
  return route.fulfill(status=200,content_type='application/json',body=json.dumps(CATALOG))
 if p.endswith('/'+DAY+'.json'):
  return route.fulfill(status=200,content_type='application/json',body=json.dumps(DAILY))
 if p.startswith('/data/v2/'):
  return route.fulfill(status=404,body='No published file for previous day')
 if p in ('/','/index.html'):
  return route.fulfill(status=200,content_type='text/html',
    body=(ROOT/'index.html').read_bytes())
 for f in ('app.js','engine.js','styles.css','manifest.webmanifest','icon-192.png','icon-512.png'):
  if p=='/'+f:
   ty={'js':'application/javascript','css':'text/css','webmanifest':'application/manifest+json','png':'image/png'}[f.split('.')[-1]]
   return route.fulfill(status=200,content_type=ty,body=(ROOT/f).read_bytes())
 return route.fulfill(status=404,body='not found')

def run():
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
  for width in (320,390,768):
   page=browser.new_page(viewport={'width':width,'height':820},
      device_scale_factor=1,is_mobile=width<700,has_touch=width<700,
      locale='es-ES',timezone_id='Europe/Madrid',service_workers='block')
   errors=[]
   page.on('pageerror',lambda err:errors.append(str(err)))
   page.route('https://rodalies.test/**',respond)
   def api(route):
    u=route.request.url
    if '/timetable?' in u:
     return route.fulfill(status=200,content_type='application/json',
      body=json.dumps({'date':DAY,'total':0,'trains':[]}))
    if '/stations/78710' in u and 'trenes.valfiguer.com' in u:
     return route.fulfill(status=200,content_type='application/json',
      body=json.dumps({'station':{'code':ORIGIN},'generated_at':utc_iso(NOW),
       'trains':[{'trip_id':TRIP,'train_number':'77512','line':'R4',
        'planned_ts':DEP,'delay_s':240,'age_s':12,'stale':False}]}))
    if 'board-renfe' in u:
     return route.fulfill(status=200,content_type='application/json',
      body=json.dumps({'station':{'code':ORIGIN},'updatedAt':utc_iso(NOW),
        'departures':[]}))
    return route.fulfill(status=200,content_type='application/json',body='{}')
   page.route('https://trenes.valfiguer.com/**',api)
   page.route('https://radardetrenes.com/**',api)
   page.route('https://trenalia.org/**',api)
   page.goto('https://rodalies.test/',wait_until='domcontentloaded')
   page.wait_for_function("document.querySelector('#network-tag').textContent.includes('estaciones')",timeout=15000)
   page.wait_for_function("document.querySelector('#results .train-card') !== null",timeout=20000)
   assert page.locator('#origin-input').input_value()==ORIGIN
   assert page.locator('#dest-input').input_value()==DEST
   assert page.locator('#results .train-status').first.inner_text()=='Hora estimada'
   assert page.locator('#results .train-time-label').first.inner_text().startswith('Salida prevista')
   assert '+4 min' in page.locator('#results').inner_text()
   assert page.evaluate('document.documentElement.scrollWidth')<=width+2,width
   assert not errors,errors
   # This deliberately did not provide a daily file prior to DAY. The
   # successful train result proves the catalog boundary bug was fixed.
   page.locator('#line-select').select_option('R2N')
   assert page.locator('#origin-input').input_value()==''
   assert 'Granollers Centre' in page.locator('#dest-input').inner_text()
   print('PASS',width,'px: ETA label, first-day search, native selectors, no horizontal scroll')
   page.close()
  browser.close()

if __name__=='__main__':
 run()
