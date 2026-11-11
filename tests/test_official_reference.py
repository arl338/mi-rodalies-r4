"""Coverage audit against a curated (non-exhaustive) Generalitat line reference."""
import json, sys, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import build_network as b

class OfficialReferenceTest(unittest.TestCase):
    def test_official_roster_complete_and_urls(self):
        ref=b.official_reference()
        self.assertEqual(len(ref['lines']),19)
        self.assertEqual({x['id'] for x in ref['lines']},set(b.LINES))
        self.assertTrue(all(x['url'].startswith('https://rodalies.gencat.cat/') for x in ref['lines']))
        self.assertGreaterEqual(sum(len(x['checkpoints']) for x in ref['lines']),45)
    def test_match_station_with_explicit_alias_only(self):
        ref=b.official_reference()
        stations=[{'id':'78710','name':'Terrassa Est','lines':['R4']},
                  {'id':'78805','name':'Barcelona Plaça Catalunya','lines':['R4']},
                  {'id':'71801','name':'Barcelona Sants','lines':['R4']},
                  {'id':'79101','name':'Girona','lines':['R11']},
                  {'id':'79300','name':'Portbou','lines':['R11']}]
        lines=[{'id':i,'present':i in ('R4','R11'),
                'scheduled_trips_in_period':1 if i in ('R4','R11') else 0} for i in b.LINES]
        audit=b.validate_official_reference(ref,stations,lines)
        r4=next(x for x in audit['lines'] if x['id']=='R4')
        self.assertIn('78710',{x['station_id'] for x in r4['matched']})
        self.assertIn('78805',{x['station_id'] for x in r4['matched']})
        self.assertIn('71801',{x['station_id'] for x in r4['matched']})
        self.assertEqual(r4['status'],'pendiente_contraste')
        r1=next(x for x in audit['lines'] if x['id']=='R1')
        self.assertEqual(r1['status'],'sin_horarios_publicados')
        # A matching station in another line is not proof that it belongs to R4.
        self.assertNotIn('79101',{x['station_id'] for x in r4['matched']})
    def test_unrecognized_line_rejected(self):
        self.assertIsNone(b.line_id('AVE'))
        self.assertIsNone(b.line_id('R19'))
        self.assertIsNone(b.infer_line({'trip_id':'G11221R4'},{'route_short_name':'Larga distancia','route_long_name':'AVE'}))

if __name__=='__main__':unittest.main()
