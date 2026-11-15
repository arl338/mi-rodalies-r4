#!/usr/bin/env python3
"""Daily GTFS refresh gate; fail closed when the published batch is stale.

This gate does not certify the completeness of all Rodalies timetables.
It only avoids rebuilding an already verified batch on the backup cron.
"""
from __future__ import annotations
import argparse
import json
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Europe/Madrid")

def batch_is_current(root: Path, today: date | None = None) -> tuple[bool, str]:
    today = today or datetime.now(TZ).date()
    try:
        catalog = json.loads((root / "catalog.json").read_text(encoding="utf-8"))
        generated = datetime.fromisoformat(catalog["generated_at"])
        if generated.tzinfo is None or generated.astimezone(TZ).date() != today:
            return False, "catalog was not generated today (Europe/Madrid)"
        if catalog["coverage_start"] != today.isoformat():
            return False, "catalog coverage starts on a different day"
        if catalog["coverage_end"] != (today + timedelta(days=13)).isoformat():
            return False, "catalog coverage does not extend 14 days"
        if catalog.get("schema") != 2 or len(catalog.get("lines", [])) != 19:
            return False, "catalog metadata incomplete"
        batch = catalog.get("batch_id")
        if not isinstance(batch, str) or len(batch) < 12:
            return False, "batch id invalid"
        quality = catalog.get("source_quality") or {}
        source = json.loads((root / "source_audit.json").read_text(encoding="utf-8"))
        if not quality.get("source_sha256") or quality["source_sha256"] != source.get("gtfs_sha256"):
            return False, "GTFS source audit does not match catalog source"
        audit = json.loads((root / "coverage_audit.json").read_text(encoding="utf-8"))
        if (audit.get("batch_id") != batch or audit.get("generated_at") != catalog["generated_at"]
                or len(audit.get("lines", [])) != 19):
            return False, "per-station audit not current"
        dates = [(today + timedelta(days=i)).isoformat() for i in range(-1, 14)]
        published = sorted(p.name for p in root.glob("20??-??-??.json"))
        if published != [day + ".json" for day in dates]:
            return False, "missing, obsolete, or extra daily timetable"
        train_count = 0
        for day in dates:
            file = json.loads((root / (day + ".json")).read_text(encoding="utf-8"))
            if (file.get("schema") != 2 or file.get("day") != day
                    or file.get("batch_id") != batch
                    or not isinstance(file.get("trains"), list)):
                return False, "daily timetable from a different or invalid batch: " + day
            train_count += len(file["trains"])
        if train_count <= 0:
            return False, "daily files contain no train services"
        # Reapply the same integrity gate used before publication: batch,
        # source SHA, every train call, every line total and all daily files.
        from validate_generated import validate
        validate(root, days=14)
        return True, "today's validated GTFS batch and station audit are present"
    except (OSError, ValueError, TypeError, KeyError, AssertionError) as exc:
        return False, "cannot verify daily batch: " + str(exc)[:200]

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=Path("data/v2"))
    parser.add_argument("--mode", choices=("schedule", "force"), default="schedule")
    parser.add_argument("--github-output", type=Path)
    args = parser.parse_args()
    valid, reason = batch_is_current(args.out)
    refresh = args.mode == "force" or not valid
    message = "REFRESH" if refresh else "SKIP"
    print(f"DAILY GTFS {message}: {reason}")
    if args.github_output:
        with args.github_output.open("a", encoding="utf-8") as fp:
            fp.write("refresh=" + ("true" if refresh else "false") + "\n")
    if args.mode == "force":
        print("Manual/code change: rebuild is mandatory even when an earlier daily batch is valid.")

if __name__ == "__main__":
    main()
