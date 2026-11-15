"""Regression tests for the daily/backup-UTC cron refresh decision.

These use a fixed *synthetic* date; production validation always uses Madrid's
current date and the actual current catalog.
"""
import json
import sys
import tempfile
import unittest
from datetime import date, datetime, timedelta
from pathlib import Path
from unittest.mock import patch
from zoneinfo import ZoneInfo

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from check_daily_refresh import batch_is_current

TODAY=date(2026,11,15)
BATCH="fixture-valid-gtfs-abcdef12345"

class DailyRefreshTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.root=Path(self.tmp.name)
        self.catalog={
            "schema":2,
            "batch_id":BATCH,
            "generated_at":datetime(2026,11,15,8,30,tzinfo=ZoneInfo("Europe/Madrid")).isoformat(),
            "coverage_start":TODAY.isoformat(),
            "coverage_end":(TODAY+timedelta(days=13)).isoformat(),
            "source_quality":{"source_sha256":"test-sha"},
            "lines":[{"id":str(i)} for i in range(19)]
        }
        self.write("catalog.json",self.catalog)
        self.write("source_audit.json",{"gtfs_sha256":"test-sha"})
        self.write("coverage_audit.json",{
            "batch_id":BATCH,"generated_at":self.catalog["generated_at"],
            "lines":[{"id":str(i)} for i in range(19)]})
        for i in range(-1,14):
            day=(TODAY+timedelta(days=i)).isoformat()
            self.write(day+".json",{"schema":2,"batch_id":BATCH,"day":day,
                                    "trains":[{"id":"fixture"}] if i==0 else []})
    def tearDown(self):
        self.tmp.cleanup()
    def write(self,name,object_):
        (self.root/name).write_text(json.dumps(object_),encoding="utf-8")
    @patch("validate_generated.validate")
    def test_skip_only_a_complete_current_batch(self,validated):
        current,explanation=batch_is_current(self.root,TODAY)
        self.assertTrue(current,explanation)
        validated.assert_called_once()
    @patch("validate_generated.validate")
    def test_next_calendar_day_forces_download(self,validated):
        current,_=batch_is_current(self.root,TODAY+timedelta(days=1))
        self.assertFalse(current)
        validated.assert_not_called()
    @patch("validate_generated.validate")
    def test_missing_file_forces_download(self,validated):
        (self.root/(TODAY+timedelta(days=2)).isoformat()).with_suffix(".json").unlink()
        current,_=batch_is_current(self.root,TODAY)
        self.assertFalse(current)
    @patch("validate_generated.validate")
    def test_mixed_batch_forces_download(self,validated):
        day=TODAY.isoformat()+".json"
        self.write(day,{"schema":2,"day":TODAY.isoformat(),"batch_id":"wrong","trains":[]})
        self.assertFalse(batch_is_current(self.root,TODAY)[0])
    @patch("validate_generated.validate")
    def test_failed_integrity_validation_forces_download(self,validated):
        validated.side_effect=AssertionError("broken station calls")
        valid,reason=batch_is_current(self.root,TODAY)
        self.assertFalse(valid)
        self.assertIn("broken station calls",reason)

if __name__=="__main__":
    unittest.main()
