import json,sys,unittest
from datetime import date,datetime
from pathlib import Path
from zoneinfo import ZoneInfo
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from official_rl3 import load_reference,materialize_day,supplement_day
TZ=ZoneInfo('Europe/Madrid')

class RL3Official(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.reference=load_reference()
  cls.day=date(2026,11,12)
  cls.trains=materialize_day(cls.day,cls.reference)
 def test_complete_official_source(self):
  r=self.reference
  self.assertEqual(r['published_date'],'2026-07-06')
  self.assertEqual(len(r['services']),16)
  self.assertEqual(len(self.trains),12)
  self.assertTrue(all(t['src']=='official-rl3-pdf' and len(t['s'])==9 for t in self.trains))
  self.assertEqual(len({(t['n'],t['s'][0][2]) for t in self.trains}),12)
 def test_anglesola_lleida_user_exact_window(self):
  a=int(datetime(2026,11,12,13,15,tzinfo=TZ).timestamp())
  b=int(datetime(2026,11,12,21,15,tzinfo=TZ).timestamp())
  matches=[]
  for t in self.trains:
   pos=next((i for i,s in enumerate(t['s']) if s[0]=='78407'),-1)
   if pos<0 or not any(s[0]=='78400' for s in t['s'][pos+1:]):continue
   ts=t['s'][pos][2]
   if a<=ts<=b:
    target=next(s[2] for s in t['s'][pos+1:] if s[0]=='78400')
    matches.append((t['n'],datetime.fromtimestamp(ts,TZ).strftime('%H:%M'),datetime.fromtimestamp(target,TZ).strftime('%H:%M')))
  self.assertEqual(matches,[('15609','15:58','16:35'),('33541','19:31','20:08')])
 def test_no_falsely_removed_trains(self):
  self.assertEqual(len(supplement_day(self.day,[],self.reference)),12)
  self.assertEqual(len(supplement_day(self.day,self.trains,self.reference)),0)
 def test_weekend_four_services(self):
  self.assertEqual(len(materialize_day(date(2026,11,14),self.reference)),4)
if __name__=='__main__':unittest.main()
