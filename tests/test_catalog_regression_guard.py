"""Backoffice release guard: reject implausible data loss before committing."""
import sys
import unittest
from copy import deepcopy
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from guard_catalog_regression import evaluate

def catalog(day="2026-11-15"):
    data={"schema":2,"coverage_start":day,"stations":[{"id":str(i)} for i in range(200)],
          "lines":[{"id":f"L{i}","present":i<17,"scheduled_trips_in_period":70} for i in range(19)]}
    data["lines"][0].update({"id":"R1","scheduled_trips_in_period":2600})
    data["lines"][1].update({"id":"R3","scheduled_trips_in_period":7500})
    data["lines"][2].update({"id":"R4","scheduled_trips_in_period":2100})
    return data

class CatalogRegressionTests(unittest.TestCase):
    def test_normal_day_within_known_variation_passes(self):
        baseline=catalog()
        candidate=deepcopy(baseline)
        candidate["coverage_start"]="2026-11-16"
        candidate["stations"]=candidate["stations"][:-5]
        candidate["lines"][1]["scheduled_trips_in_period"]=6800
        self.assertEqual(evaluate(baseline,candidate),[])
    def test_abnormal_major_line_drop_is_blocked(self):
        candidate=catalog()
        candidate["lines"][2]["scheduled_trips_in_period"]=100
        self.assertTrue(any("R4" in x for x in evaluate(catalog(),candidate)))
    def test_abnormal_station_drop_is_blocked(self):
        candidate=catalog()
        candidate["stations"]=candidate["stations"][:80]
        self.assertTrue(any("Station" in x for x in evaluate(catalog(),candidate)))
    def test_old_batch_cannot_replace_newer_day(self):
        self.assertTrue(any("older" in x for x in evaluate(catalog("2026-11-16"),catalog("2026-11-15"))))
    def test_lost_multiple_lines_is_blocked(self):
        candidate=catalog()
        for x in candidate["lines"][11:17]:
            x["present"]=False
            x["scheduled_trips_in_period"]=0
        self.assertTrue(any("Commercial lines" in x for x in evaluate(catalog(),candidate)))
    def test_massive_total_drop_is_blocked(self):
        candidate=catalog()
        for x in candidate["lines"]:
            x["scheduled_trips_in_period"]=0
        self.assertTrue(any("Total scheduled" in x for x in evaluate(catalog(),candidate)))

if __name__=="__main__":
    unittest.main()
