"""No fuzzy auto-merges: two real nearby stations remain distinct."""
import json,sys,tempfile,unittest
from pathlib import Path
from datetime import date
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from build_network import build,validate_official_reference,official_reference,canonical_station_names,LINES
from test_builder import make_zip
class StationAliasesTest(unittest.TestCase):
    def test_renamed_stations_by_code_not_geographic_similarity(self):
        with tempfile.TemporaryDirectory() as directory:
            cat=build(make_zip(),None,Path(directory),1,base=date(2026,11,12))
            st={x['id']:x for x in cat['stations']}
            self.assertEqual(st['78700']['name'],'Terrassa Estació del Nord')
            self.assertEqual(st['78710']['name'],'Terrassa Est')
            self.assertIn('Terrassa Nord',st['78700']['aliases']) # original GTFS old label
            self.assertNotIn('Terrassa',st['78710']['aliases'])
            self.assertEqual(st['78805']['name'],'Barcelona-Plaça de Catalunya')
            self.assertEqual(st['78805']['gtfs_name'],'Barcelona Plaça Catalunya')
            self.assertEqual(st['71801']['name'],'Barcelona-Sants')
            r4=next(x for x in cat['official_reference']['lines'] if x['id']=='R4')
            self.assertIn(('78710','codigo_adif'),{(x['station_id'],x['match_method']) for x in r4['matched']})
    def test_wrong_code_same_name_never_autovalidates(self):
        ref={'source_index':'official','lines':[{'id':i,'area':'x','corridor':'x','url':'x','checkpoints':[{'name':'Terrassa Est','adif_code':'78710','aliases':[]} ] if i=='R4' else []} for i in LINES]}
        stops=[{'id':'78700','name':'Terrassa Est','lines':['R4']}]
        lines=[{'id':i,'present':i=='R4','scheduled_trips_in_period':1 if i=='R4' else 0} for i in LINES]
        r4=next(x for x in validate_official_reference(ref,stops,lines)['lines'] if x['id']=='R4')
        self.assertEqual(r4['matched'],[])
        self.assertEqual(r4['not_found_in_gtfs'],['Terrassa Est'])
        self.assertEqual(r4['status'],'pendiente_contraste')
    def test_source_codes(self):
        names=canonical_station_names()
        self.assertEqual(names['78802']['display_name'],'Barcelona-Fabra i Puig')
        self.assertEqual(names['72209']['display_name'],'Martorell Central')
        self.assertNotEqual(names['78700']['display_name'],names['78710']['display_name'])
if __name__=='__main__':unittest.main()
