import json
import sys
import unittest
from datetime import date,datetime
from pathlib import Path
from zoneinfo import ZoneInfo
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from official_r1 import load_reference, supplement_day
TZ=ZoneInfo('Europe/Madrid')

class OfficialR1Completeness(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ref=load_reference()
        cls.snapshot=json.loads((ROOT/'data/v2/catalog.json').read_text(encoding='utf8'))
        cls.day=date.fromisoformat(cls.snapshot['coverage_start'])
        cls.file=ROOT/'data/v2'/f'{cls.day.isoformat()}.json'
        cls.original=[t for t in json.loads(cls.file.read_text(encoding='utf8'))['trains']
                      if t['l']=='R1' and t.get('src')!='official-r1-pdf']

    def test_verified_pdf_integrity(self):
        self.assertEqual(self.ref['schema'],1)
        self.assertEqual(len(self.ref['services']),328)
        self.assertTrue(self.ref['source'].endswith('/R1.pdf'))
        counts={(cal,dr):sum(s['calendar']==cal and s['direction']==dr for s in self.ref['services'])
          for cal in ('weekday','weekend') for dr in ('east','west')}
        self.assertEqual(counts,{('weekday','east'):95,('weekday','west'):95,
                                 ('weekend','east'):69,('weekend','west'):69})
        self.assertFalse(any(code in ('72300','72301','72302','72303')
              for row in self.ref['services'] for code,_ in row['stops']))

    def test_additions_do_not_remove_or_merge_real_services(self):
        adds=supplement_day(self.day,self.original,self.ref)
        all_trains=self.original+adds
        expected=190 if self.day.weekday()<5 else 138
        self.assertGreaterEqual(len(all_trains),expected)
        self.assertEqual(len({t['id'] for t in all_trains}),len(all_trains))
        self.assertEqual(sum(t['l']=='R1' and t.get('src')!='official-r1-pdf' for t in all_trains),len(self.original))
        self.assertTrue(all(x['src']=='official-r1-pdf' and x['n']=='' for x in adds))
        self.assertTrue(all(len(x['s'])>=2 and len({s[0] for s in x['s']})==len(x['s']) for x in adds))
        self.assertTrue(all(x['s'][i][2]<=x['s'][i+1][1]
            for x in adds for i in range(len(x['s'])-1)))
        print('VALIDATED_R1:',self.day,'GTFS',len(self.original),'PDF extras',len(adds),
              'total',len(all_trains))

    def test_match_gtfs_from_original_pdf(self):
        from official_r1 import materialize_day,same_service
        pdf=materialize_day(self.day,self.ref)
        matching=sum(any(same_service(row,t) for row in pdf) for t in self.original)
        self.assertGreaterEqual(matching,35,'Insufficient GTFS-PDF independent corroboration')

if __name__=='__main__':
    unittest.main()
