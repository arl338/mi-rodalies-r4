#!/usr/bin/env python3
"""Browser regression using real, regenerated R4 service data and synthetic API responses."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
DATA=Path('/tmp/rodalies-r4-check')
DAY='2026-11-12'
def route_app(route):
 p=route.request.url.split('?')[0].split('://',1)[-1].split('/',1)[-1]
 if p in ('','index.html'):return route.fulfill(status=200,content_type='text/html',body=(ROOT/'index.html').read_bytes())
 if p.startswith('data/v2/'):
  f=DATA/Path(p).name
  if f.exists():return route.fulfill(status=200,content_type='application/json',body=f.read_bytes())
  return route.fulfill(status=404,body='not found')
 if p.startswith('data/reference/fallback_catalog'):
  return route.fulfill(status=404,body='not found')
 f=ROOT/p
 if f.is_file() and p in ('app.js','engine.js','styles.css','manifest.webmanifest','icon-192.png','icon-512.png'):
  mime='application/javascript' if p.endswith('.js') else ('text/css' if p.endswith('.css') else 'image/png')
  return route.fulfill(status=200,content_type=mime,body=f.read_bytes())
 return route.fulfill(status=404,body='missing')
def route_api(route):
 url=route.request.url
 if '/timetable?' in url:
  data={'date':DAY,'total':0,'trains':[]}
 else:data={}
 return route.fulfill(status=200,content_type='application/json',headers={'Access-Control-Allow-Origin':'*'},body=json.dumps(data))
def main():
 assert (DATA/(DAY+'.json')).is_file()
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,
   timezone_id='Europe/Madrid',locale='es-ES',service_workers='block')
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('https://rodalies.test/**',route_app)
  for host in ('trenes.valfiguer.com','radardetrenes.com','trenalia.org'):
   page.route('https://'+host+'/**',route_api)
  page.goto('https://rodalies.test/',wait_until='domcontentloaded')
  page.wait_for_function("document.querySelector('#line-select').options.length>2",timeout=15000)
  page.locator('#line-select').select_option('R4')
  page.locator('#origin-input').select_option('78710')
  page.locator('#dest-input').select_option('78805')
  page.locator('#trip-date').fill(DAY)
  page.locator('#from-time').fill('06:00')
  page.locator('#to-time').fill('07:10')
  page.locator('#search').click()
  page.wait_for_function("document.querySelector('#results-total')?.textContent?.includes('opciones')",timeout=20000)
  expected=['06:03','06:18','06:33','06:48','06:55','07:03']
  found=page.locator('#results .train-time').all_inner_texts()
  assert found==expected,(found,expected)
  cards=page.locator('#results .train-card')
  card=cards.nth(3)
  assert card.locator('.train-time').inner_text()=='06:48'
  assert card.locator('.train-status').inner_text()=='Solo horario'
  assert 'cuadro horario oficial R4' in card.locator('.train-evidence').inner_text()
  assert page.evaluate('document.documentElement.scrollWidth')<=392
  assert not errors,errors
  print('PASS R4 UI complete:',found,'PDF service 06:48 only scheduled, no JS errors, mobile 390px')
  browser.close()
if __name__=='__main__':main()
