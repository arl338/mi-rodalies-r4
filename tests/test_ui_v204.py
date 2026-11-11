"""V2.0.4 Android selectors, official schedule, fallback, favourites and stale-data guards."""
from pathlib import Path
from datetime import date
import json,re,tempfile,shutil,sys,threading,functools,http.server
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'));from test_builder import make_zip
sys.path.insert(0,str(ROOT/'scripts'));from build_network import build

def run():
 with tempfile.TemporaryDirectory() as td,sync_playwright() as p:
  site=Path(td)
  for name in ('index.html','styles.css','app.js','engine.js','sw.js','manifest.webmanifest','icon-192.png','icon-512.png'):
   shutil.copy2(ROOT/name,site/name)
  (site/'data/reference').mkdir(parents=True)
  shutil.copy2(ROOT/'data/reference/fallback_catalog.json',site/'data/reference/fallback_catalog.json')
  build(make_zip(),None,site/'data/v2',2,base=date(2026,11,12))
  # Synthetic test fixture: add an ADIF-verified R4 station not present in this miniature GTFS.
  cp=site/'data/v2/catalog.json';o=json.loads(cp.read_text());o['stations'].append({'id':'71801','name':'Barcelona-Sants','lines':['R4']});cp.write_text(json.dumps(o))

  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  def routefn(route):
   path=site/(urlparse(route.request.url).path.lstrip('/') or 'index.html')
   if not path.is_file():return route.fulfill(status=404,body='not found')
   ext=path.suffix
   ctype={'.js':'application/javascript','.css':'text/css','.json':'application/json','.html':'text/html'}.get(ext,'image/png')
   return route.fulfill(status=200,content_type=ctype,body=path.read_bytes())
  for width in (320,360,390,768):
   page=browser.new_page(viewport={'width':width,'height':820},device_scale_factor=1,is_mobile=True,has_touch=True,locale='es-ES',timezone_id='Europe/Madrid',service_workers='block')
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.route('https://rodalies.test/**',routefn)
   page.route('https://trenes.valfiguer.com/**',lambda r:r.fulfill(status=200,content_type='application/json',body='{"trains":[],"alerts":[],"features":[]}'))
   page.route('https://radardetrenes.com/**',lambda r:r.fulfill(status=200,content_type='application/json',body='{"trains":[],"departures":[]}'))
   html=(site/'index.html').read_text();html=re.sub(r'<link rel="stylesheet" href="\./styles\.css\?v=\d+">','',html)
   html=re.sub(r'<script src="\./(?:engine|app)\.js\?v=\d+" defer></script>','',html)
   page.set_content(html);page.evaluate("window.__MIRODALIES_DATA_ROOT__='https://rodalies.test/data/v2/'")
   page.add_style_tag(content=(site/'styles.css').read_text());page.add_script_tag(content=(site/'engine.js').read_text());page.add_script_tag(content=(site/'app.js').read_text())
   page.wait_for_function("document.querySelector('#network-tag').textContent.includes('estaciones')",timeout=13000)
   page.wait_for_function("document.querySelector('#line-select').value==='R4'",timeout=7000)
   assert page.locator('#line-select').input_value()=='R4'
   assert page.locator('#origin-input').input_value()=='78710'
   assert page.locator('#dest-input').input_value()=='78805'
   assert page.locator('#line-select option').count()==21
   assert 'Girona' not in page.locator('#origin-input').inner_text()
   page.locator('#trip-date').fill('2026-11-12');page.locator('#from-time').fill('07:00');page.locator('#to-time').fill('08:00')
   page.locator('#search').click()
   page.wait_for_function("document.querySelector('#status').textContent.includes('directos')",timeout=12000)
   assert '1 directos' in page.locator('#status').inner_text()
   assert 'AVE' not in page.locator('#results').inner_text()
   if width==390:page.screenshot(path=str(ROOT/'tests/preview-v2.0.4-390.png'),full_page=True)
   page.locator('#line-select').select_option('R1')
   assert page.locator('#origin-input').input_value()==''
   assert page.locator('#dest-input').input_value()==''
   assert 'Selecciona' in page.locator('#status').inner_text() or 'han cambiado' in page.locator('#status').inner_text()
   assert not any('Terrassa Est'==o.inner_text() for o in page.locator('#origin-input option').all())
   page.locator('#fav-vuelta').click()
   assert page.locator('#line-select').input_value()=='R4'
   assert page.locator('#origin-input').input_value()=='71801'
   assert page.locator('#dest-input').input_value()=='78710'
   page.locator('#swap').click()
   assert page.locator('#origin-input').input_value()=='78710'
   page.locator('[data-hours="4"]').click();assert page.locator('[data-hours="4"]').get_attribute('aria-pressed')=='true'
   page.locator('#from-time').fill('07:15');assert page.locator('[data-hours="4"]').get_attribute('aria-pressed')=='false'
   assert page.evaluate('document.documentElement.scrollWidth')<=width+2,(width,page.evaluate('document.documentElement.scrollWidth'))
   assert not errors,(width,errors)
   print('PASS desktop/mobile',width,'selectors, favourites, filter, touch and layout')
   page.close()
  # Missing full GTFS: base URL is mocked to avoid external navigation.
  (site/'data/v2/catalog.json').unlink()
  (site/'data/reference/fallback_catalog.json').unlink()
  page=browser.new_page(viewport={'width':390,'height':820},is_mobile=True,has_touch=True,locale='es-ES',timezone_id='Europe/Madrid',service_workers='block')
  page.route('https://rodalies.test/**',routefn)
  html=(site/'index.html').read_text().replace('<head>','<head><base href="https://rodalies.test/">')
  html=re.sub(r'<link rel="stylesheet" href="\./styles\.css\?v=\d+">','',html)
  html=re.sub(r'<script src="\./(?:engine|app)\.js\?v=\d+" defer></script>','',html)
  page.set_content(html)
  page.evaluate("window.__MIRODALIES_DATA_ROOT__='https://rodalies.test/data/v2/'")
  page.add_style_tag(content=(site/'styles.css').read_text())
  page.add_script_tag(content=(site/'engine.js').read_text())
  page.add_script_tag(content=(site/'app.js').read_text())
  page.wait_for_function("document.querySelector('#network-tag').textContent.includes('Referencia')",timeout=15000)
  assert page.locator('#line-select').input_value()=='R4'
  assert 'PROVISIONAL' in page.locator('#catalog-message').inner_text()
  page.locator('#search').click()
  assert 'provisional' in page.locator('#status').inner_text().lower()
  page.close();browser.close()
  print('PASS fallback incomplete flagged, no fabricated timetables')

if __name__=='__main__':run()
