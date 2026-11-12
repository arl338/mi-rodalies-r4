#!/usr/bin/env python3
"""Chromium Android reproduction of 12 Nov 2026 RL3 Anglesola -> Lleida:
13:15-21:15 must show two official trains even with Trenalia offline.
"""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DATA=Path('/tmp/rl3-official-test')
DAY='2026-11-12'
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
def api_offline(route):
 return route.fulfill(status=503,body='temporary provider unavailable',headers={'Access-Control-Allow-Origin':'*'})
def main():
 from playwright.sync_api import sync_playwright
 data=json.loads((DATA/(DAY+'.json')).read_text())
 c=json.loads((DATA/'catalog.json').read_text())
 assert c['official_rl3_pdf']['source'].endswith('/RL3RL4.pdf')
 assert len([t for t in data['trains'] if t['l']=='RL3'])==12
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,
   timezone_id='Europe/Madrid',locale='es-ES',service_workers='block')
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('https://rodalies.test/**',route_app)
  for host in ('trenalia.org','trenes.valfiguer.com','radardetrenes.com'):page.route('https://'+host+'/**',api_offline)
  page.goto('https://rodalies.test/',wait_until='domcontentloaded')
  page.wait_for_function("document.querySelector('#line-select')?.options.length>=19")
  page.locator('#line-select').select_option('RL3')
  page.locator('#origin-input').select_option('78407')
  page.locator('#dest-input').select_option('78400')
  page.locator('#trip-date').fill(DAY)
  page.locator('#from-time').fill('13:15')
  page.locator('#to-time').fill('21:15')
  page.locator('#search').click()
  page.wait_for_function("document.querySelector('#results-total')?.textContent?.startsWith('2 ')",timeout=23000)
  cards=page.locator('#results .train-card')
  assert cards.count()==2
  assert cards.locator('.train-time').all_inner_texts()==['15:58','19:31']
  assert cards.locator('.train-status').all_inner_texts()==['Solo horario','Solo horario']
  text=cards.locator('.train-evidence').all_inner_texts()
  assert all('cuadro horario oficial RL3/RL4' in t for t in text),text
  assert page.evaluate('document.documentElement.scrollWidth')<=392
  assert not errors,errors
  print('RL3_SCREENSHOT_REPRODUCTION_PASS 2026-11-12 Anglesola->Lleida 13:15-21:15 15:58 19:31, APIs OFFLINE')
  browser.close()
if __name__=='__main__':main()
