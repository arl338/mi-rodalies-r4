import sys, json, shutil, tempfile, threading, os, re
from pathlib import Path
from urllib.parse import urlparse
from datetime import date
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tests'))
from test_builder import make_zip
sys.path.insert(0,str(ROOT/'scripts'))
from build_network import build

def run_tests():
    with tempfile.TemporaryDirectory() as d:
        site=Path(d)
        for name in ('index.html','styles.css','app.js','engine.js','sw.js','manifest.webmanifest','icon-192.png','icon-512.png'):
            shutil.copy2(ROOT/name,site/name)
        build(make_zip(),None,site/'data'/'v2',2,base=date(2026,11,12))
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
            def serve(route):
                p=urlparse(route.request.url).path.lstrip('/') or 'index.html'
                path=site/p
                if not path.is_file():return route.fulfill(status=404,body='missing '+p)
                typ='application/javascript' if p.endswith('.js') else 'application/json' if p.endswith('.json') else 'text/css' if p.endswith('.css') else 'text/html' if p.endswith('.html') or p=='' else 'image/png'
                return route.fulfill(status=200,content_type=typ,body=path.read_bytes())
            for width in (320,360,390,768):
                page=browser.new_page(viewport={'width':width,'height':850},device_scale_factor=1,has_touch=True,is_mobile=True,locale='es-ES',timezone_id='Europe/Madrid',service_workers='block')
                page.route('https://rodalies.test/**',serve)
                page.route('https://trenes.valfiguer.com/**',lambda r:r.fulfill(status=200,content_type='application/json',body='{"trains":[],"features":[],"alerts":[],"feeds":[]}'))
                page.route('https://radardetrenes.com/**',lambda r:r.fulfill(status=200,content_type='application/json',body='{"trains":[],"features":[]}'))
                errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                html=(site/'index.html').read_text()
                html=re.sub(r'<link rel="stylesheet" href="\./styles\.css\?v=\d+">','',html)
                html=re.sub(r'<script src="\./(?:engine|app)\.js\?v=\d+" defer></script>','',html)
                page.set_content(html)
                page.evaluate("window.__MIRODALIES_DATA_ROOT__='https://rodalies.test/data/v2/'")
                page.add_style_tag(content=(site/'styles.css').read_text())
                page.add_script_tag(content=(site/'engine.js').read_text())
                page.add_script_tag(content=(site/'app.js').read_text())
                page.wait_for_selector('#network-tag:text("3 líneas")',timeout=10000)
                assert page.locator('#catalog-audit-lines .catalog-line-row').count()==19
                assert '19 líneas en la referencia' in page.locator('#catalog-audit-intro').text_content()
                assert 'pendientes de contraste' in page.locator('#catalog-audit-intro').text_content()
                page.locator('#catalog-audit-panel summary').click()
                assert page.locator('#catalog-audit-panel').get_attribute('open') is not None
                assert page.locator('#catalog-audit-lines a').count()==19
                page.locator('#algorithm-panel summary').click()
                assert page.locator('#algorithm-panel').get_attribute('open') is not None
                assert 'GTFS de Renfe' in page.locator('#algorithm-panel').inner_text()
                if width==390:page.screenshot(path=str(ROOT/'tests'/'preview-algoritmo-390.png'),full_page=True)
                page.locator('#algorithm-panel summary').click()
                assert page.evaluate('document.documentElement.scrollWidth')<=width+2
                if width==390:page.screenshot(path=str(ROOT/'tests'/'preview-catalog-generalitat-390.png'),full_page=True)
                page.locator('#catalog-audit-panel summary').click()
                page.locator('#trip-date').fill('2026-11-12');page.locator('#from-time').fill('07:00');page.locator('#to-time').fill('08:00')
                page.locator('#search').click();page.wait_for_function("document.querySelector('#status').textContent.includes('directos')",timeout=15000)
                assert '1 directos' in page.locator('#status').inner_text(),page.locator('#status').inner_text()
                assert 'R4' in page.locator('#results').inner_text()
                assert 'AVE' not in page.locator('#results').inner_text()
                if width==390:
                    page.wait_for_timeout(2600)  # allow transient toast to disappear before visual snapshot
                    page.screenshot(path=str(ROOT/'tests'/'preview-v2-390.png'),full_page=True)
                page.locator('#fav-vuelta').click();page.wait_for_function("document.querySelector('#origin-input').value.toLowerCase().includes('sants')")
                assert page.locator('#fav-vuelta').get_attribute('aria-pressed')=='true'
                page.locator('#swap').click();page.wait_for_function("document.querySelector('#origin-input').value.toLowerCase().includes('terrassa')")
                page.locator('[data-hours="4"]').click();assert page.locator('[data-hours="4"]').get_attribute('aria-pressed')=='true'
                page.locator('#dest-input').fill('gir');page.wait_for_selector('#dest-options .suggest-option',timeout=4000);page.locator('#dest-options .suggest-option').first.click();assert 'Girona' in page.locator('#dest-input').input_value()
                w=page.evaluate('document.documentElement.scrollWidth');assert w<=width+2,(width,w)
                assert not errors,(width,errors)
                print('OK interfaz',width,'px, 0 errores JS, sin scroll horizontal, favoritos, franja y búsqueda')
                page.close()
            browser.close()

if __name__=='__main__':run_tests()
