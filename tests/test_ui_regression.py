"""End-to-end UI regression against deterministic GTFS and mock feed responses."""
import tempfile,shutil,json,re,sys
from pathlib import Path
from datetime import date
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'));from test_builder import make_zip
sys.path.insert(0,str(ROOT/'scripts'));from build_network import build

def run_tests():
 with tempfile.TemporaryDirectory() as td, sync_playwright() as p:
  site=Path(td)
  for n in ('index.html','styles.css','app.js','engine.js','sw.js','manifest.webmanifest','icon-192.png','icon-512.png'):
   shutil.copy(ROOT/n,site/n)
  build(make_zip(),None,site/'data'/'v2',2,base=date(2026,11,12))
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':360,'height':800},is_mobile=True,has_touch=True,locale='es-ES',timezone_id='Europe/Madrid',service_workers='block')
  def serve(route):
   name=urlparse(route.request.url).path.lstrip('/') or 'index.html';path=site/name
   if not path.is_file():return route.fulfill(status=404,body='missing')
   ext=path.suffix;ctype={'.js':'application/javascript','.json':'application/json','.css':'text/css','.html':'text/html'}.get(ext,'image/png')
   return route.fulfill(status=200,content_type=ctype,body=path.read_bytes())
  page.route('https://rodalies.test/**',serve)
  page.route('https://trenes.valfiguer.com/**',lambda r:r.fulfill(status=200,content_type='application/json',body='{"trains":[],"alerts":[],"features":[]}'))
  page.route('https://radardetrenes.com/**',lambda r:r.fulfill(status=200,content_type='application/json',body='{"trains":[],"departures":[]}'))
  html=(site/'index.html').read_text()
  html=re.sub(r'<link rel="stylesheet" href="\./styles\.css\?v=\d+">','',html)
  html=re.sub(r'<script src="\./(?:engine|app)\.js\?v=\d+" defer></script>','',html)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html)
  page.evaluate("window.__MIRODALIES_DATA_ROOT__='https://rodalies.test/data/v2/'")
  page.add_style_tag(content=(site/'styles.css').read_text())
  page.add_script_tag(content=(site/'engine.js').read_text())
  page.add_script_tag(content=(site/'app.js').read_text())
  page.wait_for_selector('#network-tag:text("3 líneas")',timeout=10000)
  page.locator('#trip-date').fill('2026-11-12');page.locator('#from-time').fill('07:00');page.locator('#to-time').fill('08:00')
  page.locator('#search').click()
  page.wait_for_function("document.querySelector('#status').textContent.includes('directos')",timeout=12000)
  assert '1 directos' in page.locator('#status').inner_text()
  assert 'AVE' not in page.locator('#results').inner_text()
  # Changing one input clears the old journey (including incidents and diagnostics).
  page.locator('#dest-input').fill('gir')
  assert page.locator('#results').locator('article').count()==0
  assert 'El trayecto o la franja han cambiado' in page.locator('#status').inner_text()
  assert 'Selección modificada' in page.locator('#source-details').text_content()
  page.locator('#dest-options .suggest-option').first.click()
  assert 'Girona' in page.locator('#dest-input').input_value()
  assert page.locator('#fav-ida').get_attribute('aria-pressed')=='false'
  # Restore route + verify touch states persist.
  page.locator('#fav-ida').click()
  assert page.locator('#fav-ida').get_attribute('aria-pressed')=='true'
  page.locator('[data-hours="4"]').click()
  assert page.locator('[data-hours="4"]').get_attribute('aria-pressed')=='true'
  page.locator('#from-time').fill('07:15')
  assert page.locator('[data-hours="4"]').get_attribute('aria-pressed')=='false'
  # On final covered day an overnight query must fail transparently, not fetch missing date.
  page.locator('#trip-date').fill('2026-11-13')
  page.locator('#from-time').fill('23:00')
  page.locator('#to-time').fill('01:00')
  page.locator('#search').click()
  assert 'cruza a un día' in page.locator('#status').inner_text()
  assert 'no existe' in page.evaluate("() => {try{madridEpoch('2026-03-29','02:30');return 'incorrecto'}catch(e){return e.message}}")
  assert 'aparece dos veces' in page.evaluate("() => {try{madridEpoch('2026-10-25','02:30');return 'incorrecto'}catch(e){return e.message}}")
  assert not errors,errors
  assert page.evaluate('document.documentElement.scrollWidth')<=362
  print('OK browser regression: input invalidation, source reset, touch selection, overnight bound, correct filtering, 0 JS errors')
  page.close();browser.close()

if __name__=='__main__':run_tests()
