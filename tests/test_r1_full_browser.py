#!/usr/bin/env python3
"""R1 browser E2E using regenerated true GTFS plus verified official PDF services."""
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
import json
ROOT=Path(__file__).resolve().parents[1]
DATA=Path('/tmp/rodalies-r1-check')
DAY='2026-11-12'
FROM='72305';DEST='79500'
TZ=ZoneInfo('Europe/Madrid')
def route_app(route):
 p=route.request.url.split('?')[0].split('://',1)[-1].split('/',1)[-1]
 if p in ('','index.html'):return route.fulfill(status=200,content_type='text/html',body=(ROOT/'index.html').read_bytes())
 if p.startswith('data/v2/'):
  f=DATA/Path(p).name
  return route.fulfill(status=200,content_type='application/json',body=f.read_bytes()) if f.exists() else route.fulfill(status=404,body='not found')
 f=ROOT/p
 if f.is_file() and p in ('app.js','engine.js','styles.css','manifest.webmanifest','icon-192.png','icon-512.png'):
  mime='application/javascript' if p.endswith('.js') else 'text/css' if p.endswith('.css') else 'image/png'
  return route.fulfill(status=200,content_type=mime,body=f.read_bytes())
 return route.fulfill(status=404,body='missing')
def route_api(route):
 body={'date':DAY,'total':0,'trains':[]} if '/timetable?' in route.request.url else {}
 return route.fulfill(status=200,content_type='application/json',headers={'Access-Control-Allow-Origin':'*'},body=json.dumps(body))
def main():
 from playwright.sync_api import sync_playwright
 daily=json.loads((DATA/(DAY+'.json')).read_text())
 catalog=json.loads((DATA/'catalog.json').read_text())
 assert catalog['official_r1_pdf']['source'].endswith('/R1.pdf')
 start=datetime.fromisoformat(DAY+'T06:00:00+01:00').timestamp()
 end=datetime.fromisoformat(DAY+'T14:00:00+01:00').timestamp()
 departures=[]
 for t in daily['trains']:
  if t['l']!='R1':continue
  i=next((i for i,s in enumerate(t['s']) if s[0]==FROM),-1)
  if i<0 or not any(s[0]==DEST for s in t['s'][i+1:]):continue
  ts=t['s'][i][2]
  if start<=ts<=end:
   departures.append((ts,t.get('src')))
 departures.sort()
 expected=[datetime.fromtimestamp(ts,TZ).strftime('%H:%M') for ts,src in departures]
 assert len(departures)>=25,departures
 # A complete refreshed GTFS may already contain all 190 official trains.
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,
    locale='es-ES',timezone_id='Europe/Madrid',service_workers='block')
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('https://rodalies.test/**',route_app)
  for host in ('trenalia.org','trenes.valfiguer.com','radardetrenes.com'):
   page.route('https://'+host+'/**',route_api)
  page.goto('https://rodalies.test/',wait_until='domcontentloaded')
  page.wait_for_function("document.querySelector('#line-select')?.options.length>=19")
  page.locator('#line-select').select_option('R1')
  page.locator('#origin-input').select_option(FROM)
  page.locator('#dest-input').select_option(DEST)
  page.locator('#trip-date').fill(DAY)
  page.locator('#from-time').fill('06:00')
  page.locator('#to-time').fill('14:00')
  page.locator('#search').click()
  page.wait_for_function("document.querySelector('#results-total')?.textContent?.includes('opciones')",timeout=25000)
  total=int(page.locator('#results-total').inner_text().split(' ')[0])
  found=page.locator('#results .train-time').all_inner_texts()
  assert total==len(expected),(total,len(expected))
  assert found==expected[:12],(found,expected[:12])
  assert page.locator('#results .train-card').count()==12
  assert all(x=='Solo horario' for x in page.locator('#results .train-status').all_inner_texts())
  # A recovered PDF service is identified correctly and does not pretend live ETA.
  if any(src=='official-r1-pdf' for _,src in departures[:12]):
   assert any('cuadro horario oficial R1' in x for x in page.locator('#results .train-evidence').all_inner_texts())
  assert page.evaluate('document.documentElement.scrollWidth')<=392
  assert not errors,errors
  print('R1_BROWSER_PASS:',total,'verified trains between 06 and 14, 12 earliest times exact, ETA not invented')
  # Molins is listed on generic R1 overview but absent from the 27-column
  # *current timetable*. Do not invent a departure; explain precisely.
  page.locator('#origin-input').select_option('72300')
  page.locator('#search').click()
  page.wait_for_function("document.querySelector('#results-total')?.textContent==='0 opciones'",timeout=15000)
  assert 'no figura en el cuadro horario R1' in page.locator('#status').inner_text()
  print('R1_MOLINS_PASS: 0 unverified trains; official timetable scope explained')
  browser.close()
if __name__=='__main__':main()
