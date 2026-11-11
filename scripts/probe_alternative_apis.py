#!/usr/bin/env python3
"""Probe alternative public rail APIs without storing train/person identifiers.

Checks HTTP availability, CORS, schema, counts and an example of structured
timetable support. Source provenance is retained; no automatic publishing.
"""
import json
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

URLS = {
 "trenalia_r4_timetable": "https://trenalia.org/api/v1/timetable?from=78710&to=78805&date=2026-11-12&limit=100",
 "trenalia_r2n_timetable": "https://trenalia.org/api/v1/timetable?from=71801&to=79100&date=2026-11-12&limit=100",
 "trenalia_terrassa_board": "https://trenalia.org/api/v1/stations/78710/board?type=departures&limit=40",
 "trenalia_sants_board": "https://trenalia.org/api/v1/stations/71801/board?type=departures&limit=40",
 "trenalia_stations": "https://trenalia.org/api/v1/stations?q=Terrassa&limit=10",
 "radar_terrassa_detail": "https://radardetrenes.com/api/v1/stations/78710/detail",
 "radar_lines": "https://radardetrenes.com/api/v1/lines/meta",
 "penedes_stations": "https://mobilitatpenedes.cat/api/stations?mode=tren&limit=5",
 "penedes_departures": "https://mobilitatpenedes.cat/api/departures?parada=78710",
}

def profile(value):
    if isinstance(value,list):
        return {"type":"array","count":len(value),"first_row_keys":sorted(value[0]) if value and isinstance(value[0],dict) else []}
    if isinstance(value,dict):
        x={"type":"object","keys":sorted(value)}
        x["arrays"]={k:len(v) for k,v in value.items() if isinstance(v,list)}
        for k in ("trains","departures","arrivals","results","services","timetable","rows","items","stops"):
            rows=value.get(k)
            if isinstance(rows,list) and rows and isinstance(rows[0],dict):
                x["first_row_keys"]=sorted(rows[0])
                x["rows_path"]=k
                break
        x["metadata_keys"]={k:sorted(v) for k,v in value.items() if k in ("meta","source","attribution","data") and isinstance(v,dict)}
        return x
    return {"type":type(value).__name__}

def fetch(name,url):
    start=time.monotonic()
    req=urllib.request.Request(url,headers={"Accept":"application/json","Origin":"https://arl338.github.io",
       "User-Agent":"MiRodalies/2.1 diagnostic (public read-only)"})
    out={"name":name}
    try:
        with urllib.request.urlopen(req,timeout=13) as resp:
            out.update(http_status=resp.status,
                 content_type=resp.headers.get("Content-Type","").split(";")[0],
                 cors=resp.headers.get("Access-Control-Allow-Origin",""))
            body=resp.read(1_000_001)
            if len(body)>1_000_000:raise ValueError("response_too_large")
            out["schema"]=profile(json.loads(body))
    except urllib.error.HTTPError as exc:
        out["http_status"]=exc.code
        out["error"]="http_error"
    except Exception as exc:
        out["error"]=type(exc).__name__
    out["elapsed_s"]=round(time.monotonic()-start,2)
    return out

def main():
    result={"schema":1,"checked_at":datetime.now(timezone.utc).isoformat(),
            "description":"Exploratory endpoint probe. Any later integration requires field-level and provenance validation.",
            "endpoints":[]}
    for name,url in URLS.items():
        row=fetch(name,url)
        result["endpoints"].append(row)
        print(json.dumps(row,ensure_ascii=False))
        time.sleep(0.2)
    Path("alternative-api-probe.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n")

if __name__=="__main__":
    main()
