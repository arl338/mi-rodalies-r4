import json
import sys
import unittest
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from official_r4 import load_reference, supplement_day

TZ=ZoneInfo("Europe/Madrid")

class OfficialR4Tests(unittest.TestCase):
    def setUp(self):
        self.reference=load_reference()
        # Published daily files are a moving 15-day window. A fixed filename
        # becomes unavailable within days and must never break a daily rebuild.
        catalog=json.loads((ROOT/'data/v2/catalog.json').read_text(encoding='utf8'))
        first=date.fromisoformat(catalog['coverage_start'])
        last=date.fromisoformat(catalog['coverage_end'])
        self.day=next((first+timedelta(days=i)
                       for i in range((last-first).days+1)
                       if (first+__import__('datetime').timedelta(days=i)).weekday()<5),None)
        if self.day is None:
            self.fail('No published weekday available for R4 PDF verification')
        source=ROOT/'data/v2'/f'{self.day.isoformat()}.json'
        self.gtfs=json.loads(source.read_text(encoding='utf8'))
        self.assertEqual(self.gtfs['batch_id'],catalog['batch_id'],
                         'R4 reference test must use a consistent current data batch')

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
        # Every published PDF southbound departure is retained, either
        # independently or as an existing GTFS train. A GTFS/PDF match is
        # defined by two station-time witnesses within 120 seconds, so this
        # test allows the same documented margin at Terrassa Est.
        from official_r4 import materialize_day, duplicate_gtfs
        for pdf in materialize_day(self.day,self.reference):
            stops={s[0]:s[2] for s in pdf['s']}
            if '78710' not in stops or '78805' not in stops:continue
            expected=stops['78710']
            matched=any(t['l']=='R4' and any(
                s[0]=='78710' and abs(s[2]-expected)<=120 for s in t['s'])
                and any(s[0]=='78805' for s in t['s']) for t in combined)
            self.assertTrue(matched or duplicate_gtfs(pdf,combined),
                'Published PDF R4 departure silently lost: '+pdf['id'])
        self.assertTrue(all(t['id'] not in {s['id'] for s in original} for t in additions))

    def test_original_gtfs_remains_principal(self):
        from official_r4 import materialize_day
        published=materialize_day(self.day,self.reference)
        example=next(x for x in published if len(x['s'])>=3)
        gtfs_witness={**example,'id':'gtfs-test-identity','src':'cer','n':'77512'}
        additions=supplement_day(self.day,[gtfs_witness],self.reference)
        self.assertNotIn(example['id'],{x['id'] for x in additions},
            'A GTFS service corroborated at multiple official stops must not be duplicated')
        self.assertEqual(gtfs_witness['src'],'cer',
            'Never mutate a real GTFS service when supplementing official PDF hours')

if __name__=='__main__':
    unittest.main()
