#!/usr/bin/env python3
"""Read-only coverage diagnostics for the published Rodalies V2 dataset.

This does NOT attest to commercial completeness or live train circulation.
All counts refer to the selected GTFS publication window, not unique trains.
"""
import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path


def analyse(root):
    root = Path(root)
    catalog = json.loads((root / "catalog.json").read_text(encoding="utf-8"))
    lines = {item["id"]: item for item in catalog["lines"]}
    stations = {str(item["id"]): item for item in catalog["stations"]}
    audit = (catalog.get("source_quality") or {}).get("by_line") or {}
    reference = {item["id"]: item for item in
                 (catalog.get("official_reference") or {}).get("lines", [])}
    by_line = defaultdict(lambda: {"instances": 0, "two_stop_instances": 0,
                                   "stop_ids": set(), "days": set(),
                                   "min_stops": None, "max_stops": 0})
    errors = []
    day_counts = {}
    files = sorted(root.glob("????-??-??.json"))
    if not files:
        errors.append("No hay ficheros diarios")
    for path in files:
        try:
            day = json.loads(path.read_text(encoding="utf-8"))
        except (ValueError, OSError) as exc:
            errors.append(f"{path.name}: JSON inaccesible: {exc}")
            continue
        if day.get("batch_id") != catalog.get("batch_id"):
            errors.append(f"{path.name}: batch_id distinto al catálogo")
        if day.get("day") != path.stem:
            errors.append(f"{path.name}: fecha de servicio incoherente")
        counts = Counter()
        for t in day.get("trains", []):
            line = t.get("l")
            if line not in lines:
                errors.append(f"{path.name}: línea desconocida {line!r}")
                continue
            stops = t.get("s") or []
            item = by_line[line]
            item["instances"] += 1
            item["days"].add(path.stem)
            item["stop_ids"].update(str(s[0]) for s in stops if s)
            item["two_stop_instances"] += (len(stops) == 2)
            item["max_stops"] = max(item["max_stops"], len(stops))
            item["min_stops"] = (len(stops) if item["min_stops"] is None
                                  else min(item["min_stops"], len(stops)))
            for s in stops:
                if str(s[0]) not in stations:
                    errors.append(f"{path.name}: parada {s[0]} sin catálogo ({line})")
            counts[line] += 1
        day_counts[path.stem] = dict(sorted(counts.items()))

    result_lines = []
    for lid, definition in lines.items():
        values = by_line[lid]
        source = audit.get(lid, {})
        ref = reference.get(lid, {})
        catalog_stops = {sid for sid, station in stations.items()
                         if lid in station.get("lines", [])}
        published_stops = values["stop_ids"]
        not_served = sorted(catalog_stops - published_stops)
        if values["instances"] != definition.get("scheduled_trips_in_period"):
            errors.append(f"{lid}: número de servicios distinto del catálogo")
        if bool(values["instances"]) != definition.get("present"):
            errors.append(f"{lid}: indicador de cobertura incoherente")
        result_lines.append({
            "line": lid,
            "published_instances": values["instances"],
            "days_with_instances": len(values["days"]),
            "stations_in_catalog": len(catalog_stops),
            "stations_with_published_calls": len(published_stops),
            "catalog_stations_without_calls": not_served,
            "two_stop_published_instances": values["two_stop_instances"],
            "min_stops_per_instance": values["min_stops"],
            "max_stops_per_instance": values["max_stops"],
            "active_source_trip_ids": source.get("active_trip_ids"),
            "source_trips_without_stop_times": source.get("trips_without_raw_stops"),
            "source_trips_with_fewer_than_two_usable_stops":
                source.get("trips_with_fewer_than_two_usable_stops"),
            "source_two_stop_trip_ids": source.get("raw_two_stop_trips"),
            "reference_status": ref.get("status"),
            "reference_checkpoint_count": ref.get("reference_checkpoints"),
            "unmatched_reference_checkpoints": ref.get("not_found_in_gtfs", []),
        })

    return {
        "schema": 1,
        "batch_id": catalog.get("batch_id"),
        "coverage_start": catalog.get("coverage_start"),
        "coverage_end": catalog.get("coverage_end"),
        "note": ("Los recuentos de origen son IDs de viaje GTFS y los publicados "
                 "son instancias por fecha: NO calcular cobertura porcentual dividiéndolos. "
                 "Las estaciones del catálogo no constituyen una referencia oficial exhaustiva."),
        "days": day_counts,
        "lines": result_lines,
        "errors": sorted(set(errors)),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="data/v2")
    parser.add_argument("--json", help="Ruta de salida del informe (opcional)")
    args = parser.parse_args()
    report = analyse(args.out)
    print("DIAGNÓSTICO COBERTURA", report["coverage_start"], report["coverage_end"],
          "lote", report["batch_id"])
    for item in report["lines"]:
        print(f"{item['line']:4s} servicios={item['published_instances']:5d} "
              f"estaciones={item['stations_with_published_calls']:2d}/"
              f"{item['stations_in_catalog']:2d} "
              f"dos_paradas={item['two_stop_published_instances']:4d} "
              f"GTFS_sin_paradas={item['source_trips_without_stop_times']} "
              f"puntos_referencia_no_conciliados={item['unmatched_reference_checkpoints']}")
    for message in report["errors"]:
        print("ERROR DE INTEGRIDAD:", message)
    if args.json:
        Path(args.json).write_text(json.dumps(report, ensure_ascii=False,
                                              indent=2) + "\n", encoding="utf-8")
    return 1 if report["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
