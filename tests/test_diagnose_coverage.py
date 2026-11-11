#!/usr/bin/env python3
"""Unit tests for read-only catalogue coverage diagnostics."""
import json
import tempfile
import unittest
from pathlib import Path
from scripts.diagnose_coverage import analyse


class DiagnoseCoverageTests(unittest.TestCase):
    def test_line_without_trains_and_orphan_stops(self):
        with tempfile.TemporaryDirectory() as temp:
            p = Path(temp)
            catalog = {
                "batch_id": "batch-test", "coverage_start": "2026-11-12",
                "coverage_end": "2026-11-12",
                "lines": [
                    {"id": "R4", "present": True, "scheduled_trips_in_period": 1},
                    {"id": "R2N", "present": False, "scheduled_trips_in_period": 0}],
                "stations": [
                    {"id": "78710", "name": "Terrassa Est", "lines": ["R4"]},
                    {"id": "78805", "name": "Barcelona-Plaça de Catalunya", "lines": ["R4"]},
                    {"id": "70000", "name": "Estación sin servicios", "lines": ["R4"]}],
                "source_quality": {"by_line": {
                    "R2N": {"active_trip_ids": 30, "trips_without_raw_stops": 30}}},
                "official_reference": {"lines": [
                    {"id": "R4", "status": "controles_localizados", "reference_checkpoints": 2},
                    {"id": "R2N", "status": "sin_horarios_publicados", "reference_checkpoints": 2}]}
            }
            (p / "catalog.json").write_text(json.dumps(catalog), encoding="utf-8")
            day = {"day": "2026-11-12", "batch_id": "batch-test",
                   "trains": [{"l": "R4", "id": "train1", "s": [
                       ["78710", 123, 123], ["78805", 456, 456]]}]}
            (p / "2026-11-12.json").write_text(json.dumps(day), encoding="utf-8")
            report = analyse(p)
            self.assertEqual(report["errors"], [])
            by = {r["line"]: r for r in report["lines"]}
            self.assertEqual(by["R4"]["published_instances"], 1)
            self.assertEqual(by["R4"]["catalog_stations_without_calls"], ["70000"])
            self.assertEqual(by["R4"]["two_stop_published_instances"], 1)
            self.assertEqual(by["R2N"]["published_instances"], 0)
            self.assertEqual(by["R2N"]["source_trips_without_stop_times"], 30)

    def test_detects_invalid_stop_and_mixed_batches(self):
        with tempfile.TemporaryDirectory() as temp:
            p = Path(temp)
            (p / "catalog.json").write_text(json.dumps({
                "batch_id": "old", "coverage_start": "2026-11-12",
                "coverage_end": "2026-11-12",
                "lines": [{"id": "R4", "present": True,
                           "scheduled_trips_in_period": 1}],
                "stations": [{"id": "78710", "lines": ["R4"]}]}), encoding="utf-8")
            (p / "2026-11-12.json").write_text(json.dumps({
                "day": "2026-11-12", "batch_id": "new",
                "trains": [{"l": "R4", "s": [
                    ["78710", 123, 123], ["missing", 456, 456]]}]}), encoding="utf-8")
            report = analyse(p)
            self.assertTrue(any("batch_id" in err for err in report["errors"]))
            self.assertTrue(any("sin catálogo" in err for err in report["errors"]))


if __name__ == "__main__":
    unittest.main()
