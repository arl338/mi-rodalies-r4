import csv, io, hashlib, json, sys, tempfile, unittest
from pathlib import Path
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
import build_network as b
from test_builder import make_zip
from validate_generated import validate

class QualityGate(unittest.TestCase):
    def test_padded_gtfs_csv_header(self):
        r=list(b.normalized_csv_rows(io.StringIO('start_date,end_date   ,service_id\n20261111,20261125   ,S\n')))
        self.assertEqual(r[0]['end_date'].strip(),'20261125')
        self.assertEqual(list(r[0].keys()),['start_date','end_date','service_id'])
    def test_spring_dst_uses_gtfs_noon_rule(self):
        # 2026-03-29 skips 02:xx local. GTFS 03:00 corresponds to 03:00 CEST.
        dt=datetime.fromtimestamp(b.as_ts(date(2026,3,29),3*3600),b.TZ)
        self.assertEqual((dt.hour,dt.minute),(3,0))
        self.assertEqual(dt.utcoffset().total_seconds(),7200)
    def test_autumn_dst_uses_gtfs_noon_rule(self):
        # On 2026-10-25 GTFS 02:00 resolves to the second 02:00 (CET).
        dt=datetime.fromtimestamp(b.as_ts(date(2026,10,25),2*3600),b.TZ)
        self.assertEqual((dt.hour,dt.fold),(2,1))
    def test_generated_files_use_same_batch(self):
        raw=make_zip()
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)
            audit={'gtfs_sha256':hashlib.sha256(raw).hexdigest(), 'by_line':{'R4':{'usable_two_stop_trips':0,'samples':[]}}, 'discarded_stop_times':{}}
            (path/'source_audit.json').write_text(json.dumps(audit),encoding='utf8')
            c=b.build(raw,None,path,2,base=date(2026,11,12))
            self.assertEqual(c['source_quality']['by_line']['R4']['usable_two_stop_trips'],0)
            self.assertEqual(validate(path,2,min_stations=1)['trains'],6)
            day=json.loads((path/'2026-11-12.json').read_text())
            self.assertEqual(c['batch_id'],day['batch_id'])
    def test_mismatched_audit_not_trusted(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)
            (path/'source_audit.json').write_text(json.dumps({'gtfs_sha256':'wrong','by_line':{}}))
            c=b.build(make_zip(),None,path,1,base=date(2026,11,12))
            self.assertIsNone(c['source_quality'])
            self.assertTrue(any('otro ZIP' in w for w in c['warnings']))
            with self.assertRaises(AssertionError):validate(path,1,min_stations=1)

if __name__=='__main__':unittest.main()
