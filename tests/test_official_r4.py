import json
import sys
import unittest
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from official_r4 import load_reference, supplement_day

TZ=ZoneInfo("Europe/Madrid")

class OfficialR4Tests(unittest.TestCase):
    def setUp(self):
        self.reference=load_reference()
        self.gtfs=json.loads((ROOT/'data/v2/2026-11-12.json').read_text(encoding='utf8'))
        self.day=date(2026,11,12)

    def test_coverage_and_document_provenance(self):
        self.assertEqual(self.reference['schema'],1)
        self.assertTrue(self.reference['source'].endswith('/R4.pdf'))
        self.assertEqual(len(self.reference['sha256']),64)
        weekday=sum(s['calendar']=='weekday' for s in self.reference['services'])
        weekend=sum(s['calendar']=='weekend' for s in self.reference['services'])
        self.assertGreaterEqual(weekday,45)
        self.assertGreaterEqual(weekend,35)
        self.assertTrue(all(s['direction']=='south' for s in self.reference['services']))

    def test_missing_departures_added_without_removing_gtfs(self):
        original=[t for t in self.gtfs['trains'] if t.get('src')!='official-r4-pdf']
        additions=supplement_day(self.day,original,self.reference)
        # Renfe may start publishing the previously missing 06:48 itself.
        # A complete GTFS correctly needs zero PDF additions.
        self.assertTrue(all(x['src']=='official-r4-pdf' and x['n']=='' for x in additions))
        combined=original+additions
        def times(trains):
            out=[]
            for t in trains:
                if t['l']!='R4':continue
                p=next((i for i,s in enumerate(t['s']) if s[0]=='78710'),-1)
                if p<0 or not any(s[0]=='78805' for s in t['s'][p+1:]):continue
                stamp=t['s'][p][2]
                if datetime.fromtimestamp(stamp,TZ).date()!=self.day:continue
                out.append(datetime.fromtimestamp(stamp,TZ).strftime('%H:%M'))
            return set(out)
        before=times(original)
        after=times(combined)
        self.assertEqual(after.intersection(before),before)
        self.assertTrue({'06:03','06:18','06:33','06:48','06:55','07:03'}<=after)
        # The 06:18 / 06:48 / 06:55 services must exist, regardless of
        # whether their source is fresh GTFS or the verified R4 PDF.
        for departure in ('06:18','06:48','06:55'):
            self.assertIn(departure,after)
        self.assertTrue(all(t['id'] not in {s['id'] for s in original} for t in additions))

    def test_original_gtfs_remains_principal(self):
        additions=supplement_day(self.day,[t for t in self.gtfs['trains'] if t.get('src')!='official-r4-pdf'],self.reference)
        pdf_times=[{s[0]:s[2] for s in t['s']} for t in additions]
        # Existing 06:33 and 07:03 are not copied from the PDF.
        self.assertFalse(any('78710' in t and datetime.fromtimestamp(t['78710'],TZ).strftime('%H:%M') in ('06:33','07:03') for t in pdf_times))

if __name__=='__main__':
    unittest.main()
