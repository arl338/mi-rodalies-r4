import json
import sys
import unittest
from datetime import date
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from official_regional import load_reference, materialize_day, supplement_day

class RegionalOfficialTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.ref=load_reference()
  cls.inventory=json.loads((ROOT/'data/reference/network_stations.json').read_text(encoding='utf8'))
  cls.valid={s['name'] for s in cls.inventory['stations']}
 def test_weekday_weekend(self):
  wd=materialize_day(date(2026,11,12),self.ref)
  sat=materialize_day(date(2026,11,14),self.ref)
  self.assertEqual(sum(t['l']=='R11' for t in wd),7)
  self.assertEqual(sum(t['l']=='R11' for t in sat),5)
  self.assertEqual(sum(t['l']=='R16' for t in wd),8)
  self.assertEqual(sum(t['l']=='R16' for t in sat),8)
 def test_all_verified_calls_chronological(self):
  for item in self.ref['services']:
   stops=item['stops']
   self.assertTrue(all(stops[i][1]<stops[i+1][1] for i in range(len(stops)-1)))
   if item['line']=='R11':
    self.assertIn(len(stops),(27,28))
   if item['line']=='R16':
    self.assertTrue(11<=len(stops)<=17)
 def test_duplicate_prevention(self):
  day=date(2026,11,12)
  existing=materialize_day(day,self.ref)
  self.assertEqual(supplement_day(day,existing,self.ref),[])
 def test_outside_train_products_not_attributed(self):
  identifiers={(x['line'],x['train_number']) for x in self.ref['services']}
  self.assertNotIn(('R16','08869'),identifiers)
  self.assertNotIn(('R11','15720'),identifiers)

if __name__=='__main__': unittest.main()
