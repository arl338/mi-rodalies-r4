#!/usr/bin/env python3
"""Compare independently hosted Renfe GTFS snapshots for coverage gaps.

Does not merge incompatible feeds or infer times. Reports a source only when
its ZIP was successfully downloaded and audited. Both copies may derive from
the same upstream Renfe publication and are NOT independent confirmations.
"""
import hashlib
import json
import sys
import time
from datetime import datetime, timezone

sys.path.insert(0, "scripts")
from build_network import CERCANIAS, download
from audit_gtfs import analyze

URLS = {
    "renfe_direct": CERCANIAS,
    "transitland_nap_cercanias": "https://gtfs-source-feeds.transit.land/es-nap-1130.zip",
    "transitland_nap_media_distancia": "https://gtfs-source-feeds.transit.land/es-nap-1098.zip",
}

def fetch_audit(name, url):
    start=time.monotonic()
    try:
        raw=download(url, max_mb=85)
        result={"status":"ok","bytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest(),
                "seconds":round(time.monotonic()-start,1)}
        if name == "transitland_nap_media_distancia":
            # The MD feed has different scope and must never be blindly merged
            # with Cercanias. Inspect its provenance and structure separately.
            import io, zipfile
            with zipfile.ZipFile(io.BytesIO(raw)) as z:
                result["files"]=z.namelist()[:50]
        else:
            audit=analyze(raw,days=14)
            result["by_line"]={l:{
                "active_trip_ids":v["active_trip_ids"],
                "trips_without_stop_times":v["trips_without_raw_stops"],
                "trips_with_lt2_usable_stops":v["trips_with_fewer_than_two_usable_stops"],
                "raw_2_stop_trips":v["raw_two_stop_trips"],
                "distribution":v["distribution"]}
                for l,v in audit["by_line"].items()}
        return result
    except Exception as ex:
        return {"status":"unavailable","error_type":type(ex).__name__,
                "error_message":str(ex)[:180],"seconds":round(time.monotonic()-start,1)}

def main():
    report={"schema":1,"generated_at":datetime.now(timezone.utc).isoformat(),
       "disclaimer":"Renfe y Transitland pueden transportar el mismo feed; comparacion de cobertura, no validacion independiente de horarios",
       "sources":{}}
    for name,url in URLS.items():
        result=fetch_audit(name,url)
        report["sources"][name]=result
        print(name, result.get("status"),result.get("bytes"),result.get("sha256"))
        for line in ("R2N","R2S","R3","R4","RG1","R11","RL3","RL4"):
            v=result.get("by_line",{}).get(line,{})
            if v: print(" ",line,v["active_trip_ids"],"sin_stop_times",v["trips_without_stop_times"],
                        "lt2",v["trips_with_lt2_usable_stops"])
    good=[n for n,v in report["sources"].items() if v["status"]=="ok"]
    report["matched_sha256"]=len(good)>=2 and len(set(
        report["sources"][n]["sha256"] for n in good))==1
    with open("alternate-gtfs-coverage.json","w",encoding="utf-8") as f:
        json.dump(report,f,ensure_ascii=False,indent=2)
    if not good:raise RuntimeError("No GTFS downloaded")

if __name__=="__main__":
    main()
