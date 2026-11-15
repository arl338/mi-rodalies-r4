import sys
import unittest
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from official_r2 import load_reference, materialize_day, supplement_day

TZ=ZoneInfo("Europe/Madrid")

class R2OfficialSourceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.reference=load_reference()
    def test_two_commercial_lines_both_directions(self):
        rows=self.reference['services']
        self.assertEqual(len(rows),423)
        counts={}
        for row in rows:
            key=(row['line'],row['calendar'],row['direction'])
            counts[key]=counts.get(key,0)+1
        self.assertEqual(counts,{
           ('R2N','weekday','forward'):37,('R2N','weekday','reverse'):37,
           ('R2S','weekday','forward'):69,('R2S','weekday','reverse'):72,
           ('R2N','weekend','forward'):37,('R2N','weekend','reverse'):37,
           ('R2S','weekend','forward'):68,('R2S','weekend','reverse'):66})
    def test_weekday_official_service_stops_have_exact_printed_times(self):
        day=date(2026,11,16)
        data=materialize_day(day,self.reference)
        self.assertEqual(len(data),215)
        source=next(t for t in data if t['l']=='R2N' and
                    t['s'][0][0]=='79400' and t['s'][-1][0]=='72400')
        self.assertEqual(datetime.fromtimestamp(source['s'][0][2],TZ).strftime('%H:%M'),'04:57')
        self.assertEqual(datetime.fromtimestamp(source['s'][-1][2],TZ).strftime('%H:%M'),'05:30')
        south=next(t for t in data if t['l']=='R2S' and
                   t['s'][0][0]=='79400' and t['s'][-1][0]=='71700')
        self.assertEqual(datetime.fromtimestamp(south['s'][0][2],TZ).strftime('%H:%M'),'05:28')
        self.assertEqual(datetime.fromtimestamp(south['s'][-1][2],TZ).strftime('%H:%M'),'06:29')
    def test_weekend_count(self):
        self.assertEqual(len(materialize_day(date(2026,11,15),self.reference)),208)
    def test_document_validity(self):
        self.assertEqual(materialize_day(date(2026,11,11),self.reference),[])
        self.assertEqual(materialize_day(date(2026,12,15),self.reference),[])
    def test_no_duplicate_on_original_official_rows(self):
        day=date(2026,11,16)
        rows=materialize_day(day,self.reference)
        self.assertEqual(supplement_day(day,rows,self.reference),[])
        self.assertTrue(all(t['src']=='official-r2-pdf' and t['n']=='' for t in rows))
    def test_no_inferred_rail_stops(self):
        day=date(2026,11,16)
        actual=materialize_day(day,self.reference)
        reference={x['id']:x['stops'] for x in self.reference['services']}
        for row in actual:
            identity=row['id'].split('r2-official-',1)[-1].rsplit('-',3)[0]
            # Each materialized service corresponds to one exact official row.
            original=next(x for x in self.reference['services']
                          if 'r2-official-'+x['id']+'-'+day.isoformat()==row['id'])
            self.assertEqual([s[0] for s in row['s']],[s[0] for s in original['stops']])
if __name__=='__main__':
    unittest.main()
