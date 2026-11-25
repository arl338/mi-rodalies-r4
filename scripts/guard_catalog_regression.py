#!/usr/bin/env python3
"""Fail closed on catastrophic timetable losses between daily publications.

This is an anomaly guard, NOT a guarantee that every train exists. A severe
real service suspension may also trigger it: hold the new publication for
manual review rather than silently replacing the last validated timetable.
"""
from __future__ import annotations
import argparse
import json
from datetime import date
from pathlib import Path

def evaluate(previous: dict, current: dict) -> list[str]:
    problems = []
    previous_day = date.fromisoformat(previous["coverage_start"])
    current_day = date.fromisoformat(current["coverage_start"])
    if current_day < previous_day:
        problems.append("Candidate timetable is older than the previously published catalog")
    if current["schema"] != 2 or len(current.get("lines", [])) != 19:
        problems.append("Candidate has missing official line definitions")
        return problems
    if previous.get("schema") != 2 or len(previous.get("lines", [])) != 19:
        return problems  # Invalid prior data cannot serve as a trusted baseline.
    pcount = sum(int(x["scheduled_trips_in_period"]) for x in previous["lines"])
    ccount = sum(int(x["scheduled_trips_in_period"]) for x in current["lines"])
    if pcount >= 100 and ccount < pcount * 0.60:
        problems.append(f"Total scheduled train instances collapsed: {pcount} -> {ccount}")
    pstation = len(previous.get("stations", []))
    cstation = len(current.get("stations", []))
    if pstation >= 100 and cstation < pstation * 0.85:
        problems.append(f"Station catalog collapsed: {pstation} -> {cstation}")
    pactive = sum(bool(x["present"]) for x in previous["lines"])
    cactive = sum(bool(x["present"]) for x in current["lines"])
    if pactive >= 10 and cactive < pactive - 2:
        problems.append(f"Commercial lines with any scheduled calls collapsed: {pactive} -> {cactive}")
    original = {x["id"]: x for x in previous["lines"]}
    new = {x["id"]: x for x in current["lines"]}
    for line in ("R1", "R3", "R4"):
        if line not in original or line not in new:
            problems.append(f"Missing major commercial line: {line}")
            continue
        n = int(original[line]["scheduled_trips_in_period"])
        m = int(new[line]["scheduled_trips_in_period"])
        if n >= 500 and m < n * 0.50:
            problems.append(f"Major line {line} lost over half its programmed trips: {n} -> {m}")
    return problems

def daily_source_warnings(previous: dict, current: dict) -> list[str]:
    """Compare identical service dates; source anomalies are not cancellations."""
    warnings = []
    old = previous.get("source_quality", {}).get("by_line", {})
    new = current.get("source_quality", {}).get("by_line", {})
    for line, quality in sorted(new.items()):
        prior = old.get(line, {}).get("by_date", {})
        for day, counts in sorted(quality.get("by_date", {}).items()):
            if not current["coverage_start"] <= day <= current["coverage_end"]:
                continue
            n = counts.get("active_trip_ids")
            p = prior.get(day, {}).get("active_trip_ids")
            if n == 0:
                warnings.append(f"{line} {day}: no active GTFS trip IDs; verify official alternatives")
            elif counts.get("at_least_two_usable_stops") == 0:
                warnings.append(f"{line} {day}: active GTFS IDs but no usable journeys; verify official alternatives")
            elif isinstance(p, int) and isinstance(n, int) and p >= 10 and n < p * 0.60:
                warnings.append(f"{line} {day}: GTFS trip IDs fell over 40%: {p} -> {n}")
    return warnings

def main() -> None:
    ap=argparse.ArgumentParser()
    ap.add_argument("--previous",type=Path,required=True)
    ap.add_argument("--current",type=Path,required=True)
    args=ap.parse_args()
    if not args.previous.exists():
        print("QUALITY GUARD: no existing catalog, new installation or missing baseline; verify other integrity gates")
        return
    previous=json.loads(args.previous.read_text(encoding="utf-8"))
    current=json.loads(args.current.read_text(encoding="utf-8"))
    for warning in daily_source_warnings(previous,current):
        print('SOURCE COVERAGE WARNING: '+warning)
    problems=evaluate(previous,current)
    if problems:
        print("CRITICAL REGRESSION: refusing to publish a potentially incomplete timetable")
        for p in problems:
            print(" - "+p)
        raise SystemExit(1)
    print("QUALITY GUARD OK: no catastrophic station, line or trip losses versus existing publication")

if __name__=="__main__":
    main()
