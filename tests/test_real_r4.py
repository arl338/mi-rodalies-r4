"""Regression against the user's Nov 11 Renfe GTFS-derived extract.
This test is optional and runs only if the uploaded fixture is present.
It ensures that the expected two routes are preserved with no false trains.
"""
import unittest,json,sys
from datetime import datetime
from zoneinfo import ZoneInfo
from pathlib import Path

class RealR4Test(unittest.TestCase):
 def test_first_evening_departures(self):
  file=Path('/mnt/data/schedule-r4.json')
  if not file.exists(): self.skipTest('User-provided fixture unavailable outside this conversation')
  original=json.loads(file.read_text())
  TZ=ZoneInfo('Europe/Madrid')
  today=[x for x in original['trains'] if x['service_day']=='2026-11-11']
  expected={'ida':{ '18:03','19:03','20:03'},'vuelta':{'18:28','19:28','20:28'}}
  for r,hours in expected.items():
   observed={datetime.fromtimestamp(x['planned_ts'],TZ).strftime('%H:%M') for x in today if x['route']==r}
   self.assertTrue(hours.issubset(observed),(r,hours-observed))
  self.assertEqual(len([x for x in today if x['route']=='ida']),8)
  self.assertEqual(len([x for x in today if x['route']=='vuelta']),8)
if __name__=='__main__':unittest.main()
