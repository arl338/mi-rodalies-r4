import unittest, json, csv, io, zipfile, sys, tempfile
from pathlib import Path
from datetime import date
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import build_network as b

def make_zip():
    routes=[{'route_id':'rr4','route_short_name':'R4','route_long_name':'Manresa – Sant Vicenç'},
            {'route_id':'r2','route_short_name':'R2 Nord','route_long_name':'Aeroport – Maçanet'},
            {'route_id':'r11','route_short_name':'R11','route_long_name':'Barcelona - Portbou'},
            {'route_id':'ld','route_short_name':'AVE','route_long_name':'Madrid - Barcelona'}]
    trips=[{'trip_id':'5115J77512R4','route_id':'rr4','service_id':'S','trip_short_name':'77512','trip_headsign':'Sant Vicenç'},
           {'trip_id':'5116J77512R4','route_id':'rr4','service_id':'S','trip_short_name':'77512','trip_headsign':'Sant Vicenç'},
           {'trip_id':'B88888R2N','route_id':'r2','service_id':'S','trip_short_name':'88888','trip_headsign':'Aeroport'},
           {'trip_id':'C11111R11','route_id':'r11','service_id':'S','trip_short_name':'11111','trip_headsign':'Portbou'},
           {'trip_id':'D12345R4','route_id':'ld','service_id':'S','trip_short_name':'12345','trip_headsign':'Madrid'}]
    stops=[{'stop_id':'78710','stop_name':'Terrassa Est','stop_lat':'41.56','stop_lon':'2.04'},
           {'stop_id':'78700','stop_name':'Terrassa Nord','stop_lat':'41.57','stop_lon':'2.02'},
           {'stop_id':'78805','stop_name':'Barcelona Plaça Catalunya','stop_lat':'41.38','stop_lon':'2.17'},
           {'stop_id':'71801','stop_name':'Barcelona Sants','stop_lat':'41.37','stop_lon':'2.14'},
           {'stop_id':'79101','stop_name':'Girona','stop_lat':'41.98','stop_lon':'2.82'},
           {'stop_id':'79300','stop_name':'Portbou','stop_lat':'42.43','stop_lon':'3.16'},
           {'stop_id':'79301','stop_name':'Cerbère','stop_lat':'42.44','stop_lon':'3.16'},
           {'stop_id':'10101','stop_name':'Madrid Atocha','stop_lat':'40.40','stop_lon':'-3.7'}]
    st=[]
    journeys={
      '5115J77512R4':[('78710','07:03:00'),('78700','07:06:00'),('78805','07:46:00')],
      '5116J77512R4':[('78710','07:03:00'),('78700','07:06:00'),('78805','07:46:00')],
      'B88888R2N':[('71801','07:55:00'),('78805','08:04:00')],
      'C11111R11':[('71801','08:05:00'),('79101','09:20:00'),('79300','10:00:00'),('79301','10:05:00')],
      'D12345R4':[('71801','09:00:00'),('10101','11:00:00')]
    }
    for tid,arr in journeys.items():
      for i,(sid,t) in enumerate(arr):st.append({'trip_id':tid,'stop_id':sid,'arrival_time':t,'departure_time':t,'stop_sequence':str(i+1)})
    cal=[dict(service_id='S',start_date='20261112',end_date='20261120',monday='1',tuesday='1',wednesday='1',thursday='1',friday='1',saturday='1',sunday='1')]
    tables={'routes.txt':routes,'trips.txt':trips,'stops.txt':stops,'stop_times.txt':st,'calendar.txt':cal}
    out=io.BytesIO()
    with zipfile.ZipFile(out,'w') as z:
      for name,rows in tables.items():
        s=io.StringIO();w=csv.DictWriter(s,fieldnames=rows[0].keys());w.writeheader();w.writerows(rows);z.writestr(name,s.getvalue())
    return out.getvalue()

class BuilderTest(unittest.TestCase):
  def test_line_exactness(self):
    self.assertEqual(b.line_id('R2 Nord'),'R2N')
    self.assertEqual(b.line_id('R2 Sud'),'R2S')
    self.assertIsNone(b.line_id('AVE'))
    self.assertIsNone(b.line_id('R22'))
    self.assertIsNone(b.infer_line({'trip_id':'D12345R4'},{'route_short_name':'AVE','route_long_name':'Madrid'}))
  def test_build_and_dedup(self):
    with tempfile.TemporaryDirectory() as directory:
      cat=b.build(make_zip(),None,Path(directory),days=2,base=date(2026,11,12))
      self.assertTrue(cat['stations']);self.assertGreaterEqual(len(cat['stations']),5)
      d=json.loads((Path(directory)/'2026-11-12.json').read_text())
      self.assertEqual(len([x for x in d['trains'] if x['l']=='R4']),1)
      self.assertEqual(set(x['l'] for x in d['trains']),{'R4','R2N','R11'})
      r11=next(x for x in d['trains'] if x['l']=='R11')
      self.assertEqual(r11['s'][-1][0],'79300')
      self.assertNotIn('79301',{x['id'] for x in cat['stations']})
      self.assertEqual(next(x for x in d['trains'] if x['l']=='R4')['n'],'77512')
      self.assertEqual(d['trains'][0]['s'][0][2]%60,0)
  def test_gtfs_no_false_services(self):
    with tempfile.TemporaryDirectory() as directory:
      cat=b.build(make_zip(),None,Path(directory),days=1,base=date(2026,11,12))
      self.assertFalse(any(x['present'] for x in cat['lines'] if x['id'] not in ('R4','R2N','R11')))
      self.assertTrue(cat['warnings'])
if __name__=='__main__':unittest.main()
