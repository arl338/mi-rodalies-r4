#!/usr/bin/env python3
"""Read-only, privacy-minimized diagnostics of public rail operational feeds.

No credentials, no raw train observations, no persistent raw feed payloads.
Only response status, JSON field names and aggregate counts are persisted.
"""
import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

STATIONS = ("78710", "71801", "78805")
ENDPOINTS = [
    ("val_board", "https://trenes.valfiguer.com/api/v1/stations/{station}"),
    ("radar_board", "https://radardetrenes.com/api/v1/stations/{station}/board-renfe"),
    ("val_positions", "https://trenes.valfiguer.com/api/v1/trains"),
    ("radar_positions", "https://radardetrenes.com/api/v1/fleet?type=commuter"),
    ("val_status", "https://trenes.valfiguer.com/api/v1/status"),
]
ALLOWED = {"trains", "departures", "results", "items", "alerts", "features", "runs",
           "positions", "services", "data", "board", "station"}


def describe(value):
    if isinstance(value, dict):
        keys = sorted(str(k) for k in value.keys())
        arrays = {}
        for key, v in value.items():
            if isinstance(v, list):
                arrays[key] = len(v)
            if isinstance(v, dict) and key in ALLOWED:
                nested = {k: len(x) for k, x in v.items() if isinstance(x, list)}
                if nested:
                    arrays[key + ".*"] = nested
        rows = None
        for key in ("trains", "departures", "results", "items", "features"):
            if isinstance(value.get(key), list):
                rows = value[key]
                break
        if rows is None:
            d = value.get("data") or value.get("board") or {}
            if isinstance(d, dict):
                for key in ("trains", "departures", "results", "items", "features"):
                    if isinstance(d.get(key), list):
                        rows = d[key]
                        break
        row_keys = sorted(str(k) for k in rows[0].keys()) if rows and isinstance(rows[0], dict) else []
        field_diagnostics = {}
        if rows:
            sample = rows[:min(len(rows), 100)]
            for field in ("plannedTime", "estimatedTime", "planned_ts", "estimated_ts", "delayMinutes", "delay_s", "trainCode", "train_number", "trip_id", "tripId", "timestamp", "launchingDate", "line", "product", "nucleo", "stale"):
                values = [row.get(field) for row in sample if isinstance(row, dict)]
                non_null = [v for v in values if v is not None]
                if values:
                    field_diagnostics[field] = {"present": len(non_null), "null": len(values)-len(non_null), "types": sorted(set(type(v).__name__ for v in non_null))}
        geo_properties = {}
        if rows and isinstance(rows[0], dict) and isinstance(rows[0].get("properties"), dict):
            props = rows[0]["properties"]
            geo_properties["keys"] = sorted(props.keys())[:80]
            if isinstance(props.get("runs"), list) and props["runs"] and isinstance(props["runs"][0], dict):
                geo_properties["first_run_keys"] = sorted(props["runs"][0].keys())[:80]
        return {"root_type": "object", "root_keys": keys[:80],
                "field_diagnostics": field_diagnostics, "geo_properties": geo_properties,
                "array_counts": arrays, "first_row_keys": row_keys[:80]}
    if isinstance(value, list):
        return {"root_type": "array", "length": len(value),
                "first_row_keys": sorted(str(k) for k in value[0])[:80]
                if value and isinstance(value[0], dict) else []}
    return {"root_type": type(value).__name__}


def fetch(name, url, station=None):
    result = {"feed": name, "station": station, "url_path": urllib.request.urlparse(url).path
              if hasattr(urllib.request, "urlparse") else url.split(".com", 1)[-1].split("?")[0]}
    request = urllib.request.Request(url, headers={
        "User-Agent": "MiRodalies-R4/diagnostics (+https://github.com/arl338/mi-rodalies-r4)",
        "Accept": "application/json",
        "Origin": "https://arl338.github.io",
    })
    start = time.monotonic()
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            result["status"] = response.status
            result["content_type"] = response.headers.get("Content-Type", "").split(";")[0]
            result["access_control_allow_origin"] = response.headers.get("Access-Control-Allow-Origin", "")
            raw = response.read(2_000_001)
        result["elapsed_ms"] = round((time.monotonic() - start) * 1000)
        result["bytes_read"] = len(raw)
        if len(raw) > 2_000_000:
            result["error"] = "response_too_large_for_diagnostic"
        else:
            try:
                result["schema"] = describe(json.loads(raw))
            except (UnicodeDecodeError, ValueError):
                result["error"] = "non_json_response"
    except urllib.error.HTTPError as exc:
        result["status"] = exc.code
        result["error"] = "http_error"
    except (urllib.error.URLError, TimeoutError) as exc:
        result["error"] = type(exc).__name__
        result["reason_type"] = type(getattr(exc, "reason", None)).__name__
    return result


def main():
    rows = []
    for name, template in ENDPOINTS:
        stations = STATIONS if "{station}" in template else (None,)
        for station in stations:
            url = template.format(station=station) if station else template
            rows.append(fetch(name, url, station))
            time.sleep(0.3)
    report = {"schema": 1, "captured_at": datetime.now(timezone.utc).isoformat(),
              "notes": "Metadata only. This proves neither live accuracy nor browser CORS functionality.",
              "responses": rows}
    target = Path(os.environ.get("PROBE_REPORT", "feed-probe-report.json"))
    target.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
