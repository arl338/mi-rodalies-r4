import sys
import unittest
from datetime import date
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from official_supplement import load_reference, materialize_day, supplement_day

class OfficialSupplementTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.reference = load_reference()
    def test_stations_and_calendar(self):
        wd = materialize_day(date(2026, 11, 12), self.reference)
        sat = materialize_day(date(2026, 11, 14), self.reference)
        self.assertEqual(sum(t['l']=='RT1' for t in wd), 10)
        self.assertEqual(sum(t['l']=='RT1' for t in sat), 9)
        self.assertEqual(sum(t['l']=='RT2' for t in wd), 16)
        self.assertEqual(sum(t['l']=='RT2' for t in sat), 16)
        self.assertEqual(sum(t['l']=='RG1' for t in wd), 17)
        self.assertEqual(sum(t['l']=='RG1' for t in sat), 0)
        self.assertEqual(sum(t['l']=='R17' for t in wd), 6)
        self.assertEqual(sum(t['l']=='R17' for t in sat), 6)
        self.assertEqual(sum(t['l']=='RL4' for t in wd), 9)
        self.assertEqual(sum(t['l']=='RL4' for t in sat), 7)
        self.assertTrue(all(len(t['s'])>=2 for t in wd+sat))
        self.assertTrue(all(all(t['s'][i][2]<t['s'][i+1][1] for i in range(len(t['s'])-1)) for t in wd+sat))
    def test_no_invented_rt2_intermediate(self):
        day = materialize_day(date(2026, 11, 12), self.reference)
        self.assertTrue(all([s[0] for s in t['s']] in
          (['71500','65411'],['65411','71500']) for t in day if t['l']=='RT2'))
    def test_no_duplicate_supplements(self):
        day = date(2026, 11, 12)
        rows = materialize_day(day,self.reference)
        self.assertEqual(len(supplement_day(day, rows, self.reference)),0)
    def test_anomalies_excluded(self):
        nums={(t['calendar'],t['train_number']) for t in self.reference['services'] if t['line']=='RL4'}
        self.assertNotIn(('weekday','33526'),nums)
        self.assertNotIn(('weekend','35626'),nums)

if __name__=='__main__':unittest.main()
