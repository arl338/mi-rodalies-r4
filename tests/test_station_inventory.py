import json
import sys
import unittest
from collections import defaultdict
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from reference_stations import apply_reference, REFERENCE
from build_network import LINES


class StationInventoryTest(unittest.TestCase):
    def test_all_19_lines_have_stations(self):
        data=json.loads(REFERENCE.read_text(encoding='utf-8'))
        self.assertEqual(len(data['stations']),200)
        self.assertEqual(len({s['name'] for s in data['stations']}),200)
        listed={line for item in data['stations'] for line in item['lines']}
        self.assertEqual(listed,set(LINES))
        counts={line:sum(line in s['lines'] for s in data['stations']) for line in LINES}
        self.assertGreaterEqual(min(counts.values()),2)

    def test_reference_never_implies_timetable(self):
        stations={'78710':{'id':'78710','name':'Terrassa Est','lines':{'R4'},
                           'lat':41.5,'lon':2.0}}
        candidate={'71801':{'name':'Barcelona Sants','lat':41.4,'lon':2.1}}
        verified={'71801':{'display_name':'Barcelona-Sants','aliases':['Barcelona Sants']}}
        result=apply_reference(stations,candidate,{'78710':{'R4'}},verified,LINES)
        self.assertEqual(result['reference_station_count'],200)
        self.assertEqual(len(result['line_station_counts']),19)
        self.assertEqual(stations['78710']['schedule_lines'],['R4'])
        self.assertFalse(stations['78710']['reference_only'])
        self.assertIn('71801',stations)
        self.assertTrue(stations['71801']['reference_only'])
        self.assertEqual(stations['71801']['schedule_lines'],[])
        self.assertTrue(all(item['lines'] for item in stations.values()))
        self.assertGreaterEqual(len(stations),200)
        self.assertTrue(any(s['id'].startswith('ref:') for s in stations.values()))

    def test_no_fuzzy_merging_of_similar_stations(self):
        stations={'78710':{'id':'78710','name':'Terrassa Est','lines':{'R4'}}}
        apply_reference(stations,{}, {},{},LINES)
        self.assertIn('78710',stations)
        self.assertIn('ref:', ''.join(s['id'] for s in stations.values()))


if __name__=='__main__':
    unittest.main()
