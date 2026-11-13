#!/usr/bin/env python3
"""Audit every published line/station/day timetable, not merely line availability.

Produces machine-readable per-station coverage and an actionable Markdown
summary. An absent call is unknown coverage, not evidence of line suspension.
No external APIs and no fabricated intermediate times.
"""
from __future__ import annotations
import argparse
import csv
import json
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Europe/Madrid")

def audit(path: Path):
    catalog = json.loads((path / "catalog.json").read_text(encoding="utf-8"))
    lines = {l["id"]: l for l in catalog["lines"]}
    stations = {s["id"]: s for s in catalog["stations"]}
    days = sorted(x for x in path.glob("20??-??-??.json"))
    if not days:
        raise ValueError("No daily timetable files found")
    counts = defaultdict(Counter)
    source_counts = defaultdict(Counter)
    daily_counts = defaultdict(Counter)
    two_stops = Counter()
    extras = defaultdict(set)
    errors = []
    total = 0
    for file in days:
        doc = json.loads(file.read_text(encoding="utf-8"))
        day = doc["day"]
        if file.stem != day or doc.get("batch_id") != catalog["batch_id"]:
            raise ValueError("Mismatched or mixed GTFS daily files: " + file.name)
        for train in doc["trains"]:
            line = train["l"]
            if line not in lines:
                errors.append("Unknown line " + str(line))
                continue
            calls = train["s"]
            if len(calls) < 2:
                errors.append("Train without two scheduled calls: " + train["id"])
                continue
            total += 1
            daily_counts[line][day] += 1
            source_counts[line][train.get("src", "unspecified")] += 1
            if len(calls) == 2:
                two_stops[line] += 1
            for i, (sid, arr, dep) in enumerate(calls):
                station = stations.get(sid)
                if not station:
                    errors.append("Uncatalogued call: " + line + " " + sid)
                    continue
                if arr > dep or (i and arr < calls[i-1][2]):
                    errors.append("Nonmonotone train: " + line + " " + train["id"])
                counts[(line, sid)][day] += 1
                if line not in station.get("reference_lines", []):
                    extras[line].add(sid)
    report_lines = []
    station_rows = []
    for line in lines:
        inventory = sorted((s for s in stations.values()
                            if line in s.get("reference_lines", [])),
                           key=lambda s: s["name"])
        active = [s for s in inventory if sum(counts[(line,s["id"])].values()) > 0]
        missing = [s for s in inventory if not sum(counts[(line,s["id"])].values())]
        report_lines.append({
            "line": line,
            "reference_stations": len(inventory),
            "stations_with_published_calls": len(active),
            "missing_station_ids": [s["id"] for s in missing],
            "missing_station_names": [s["name"] for s in missing],
            "out_of_inventory_calls": [{"id": sid, "name": stations[sid]["name"]}
                                       for sid in sorted(extras[line])],
            "services_by_day": dict(sorted(daily_counts[line].items())),
            "services_by_source": dict(sorted(source_counts[line].items())),
            "two_stop_trips_in_period": two_stops[line],
            "coverage_complete": not missing and not extras[line],
        })
        for s in inventory:
            values = counts[(line, s["id"])]
            station_rows.append({
                "line": line, "station_id": s["id"], "station": s["name"],
                "calls_total": sum(values.values()),
                "days_with_calls": len(values),
                "published_days": len(days),
                "minimum_calls_on_any_day": min((values.get(p.stem, 0) for p in days), default=0),
                "maximum_calls_on_any_day": max((values.get(p.stem, 0) for p in days), default=0),
                "source_status": "timetable_calls" if values else "inventory_only",
                "per_day": {p.stem: values.get(p.stem,0) for p in days},
            })
    result = {
        "schema": 1, "batch_id": catalog["batch_id"], "generated_at": catalog["generated_at"],
        "dates": [p.stem for p in days],
        "notes": [
            "Timetable calls, not real-time train operation.",
            "Coverage of inventory does not prove every scheduled service is present.",
            "Absence of published calls is not proof of line closure.",
            "Third-party alternatives are not included in the static catalog.",
        ],
        "total_train_instances": total, "lines": report_lines,
        "stations": station_rows, "integrity_errors": errors,
    }
    if errors:
        raise ValueError("Timetable audit integrity errors: " + "; ".join(errors[:12]))
    (path / "coverage_audit.json").write_text(json.dumps(result, ensure_ascii=False,
        indent=2) + "\n", encoding="utf-8")
    with (path / "coverage_stations.csv").open("w",newline="",encoding="utf-8") as fp:
        writer=csv.DictWriter(fp,fieldnames=["line","station_id","station","calls_total",
           "days_with_calls","published_days","minimum_calls_on_any_day",
           "maximum_calls_on_any_day","source_status"])
        writer.writeheader()
        for row in station_rows:
            writer.writerow({key:row[key] for key in writer.fieldnames})
    lines_md = [
        "# Auditoría automática de horarios, líneas y estaciones",
        "",
        f"**Generado:** {catalog['generated_at']}  ",
        f"**Lote:** \`{catalog['batch_id']}\`  ",
        f"**Días publicados:** {len(days)}; {days[0].stem} a {days[-1].stem}  ",
        f"**Instancias de tren:** {total}",
        "",
        "La presencia de una parada no acredita servicio comercial ni cobertura íntegra.",
        "Las horas son programadas; no se usan feeds de terceros en este informe.",
        "",
        "| Línea | Estaciones inventario | Con horarios | Sin horarios | Servicios con 2 paradas |",
        "|---|---:|---:|---:|---:|",
    ]
    for row in report_lines:
        lines_md.append(f"| {row['line']} | {row['reference_stations']} | "
          f"{row['stations_with_published_calls']} | {len(row['missing_station_ids'])} | "
          f"{row['two_stop_trips_in_period']} |")
    lines_md.extend(["", "## Estaciones sin horarios estructurados", ""])
    for row in report_lines:
        if row["missing_station_names"]:
            lines_md.append(f"**{row['line']}**: " + ", ".join(row["missing_station_names"]))
            lines_md.append("")
    lines_md.extend(["## Horarios fuera del inventario comercial", ""])
    for row in report_lines:
        if row["out_of_inventory_calls"]:
            lines_md.append(f"**{row['line']}**: " + ", ".join(
                x["name"]+" ("+x["id"]+")" for x in row["out_of_inventory_calls"]))
            lines_md.append("")
    lines_md.extend([
        "## Interpretación", "",
        "El CSV incluye cada combinación línea-estación y sus recuentos, incluso cuando son cero.",
        "El JSON incluye el detalle por fecha, fuente y estación.",
        "No deducir horario, cancelación ni retraso a partir de una estación sin datos.",
    ])
    (path / "coverage_audit.md").write_text("\n".join(lines_md)+"\n", encoding="utf-8")
    return result

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--out",type=Path,default=Path("data/v2"))
    args=parser.parse_args()
    result=audit(args.out)
    print("COVERAGE AUDIT:", len(result["lines"]), "lines,",
          len(result["stations"]), "line/station memberships,",
          result["total_train_instances"], "train instances,",
          "missing stations", sum(len(x["missing_station_ids"]) for x in result["lines"]))

if __name__=="__main__":
    main()
