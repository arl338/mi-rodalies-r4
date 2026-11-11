#!/usr/bin/env python3
"""Aggregate-only scrutiny of Trenalia timetable provenance and identity.

Prevents mistaking a successful HTTP response or another line's trips for
verified schedules for R2N/R2S or other GTFS-missing lines.
"""
import json, urllib.request, urllib.parse
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

DAY="2026-11-12"
PAIRS={
 "R4_TerrassaEst_PlacaCatalunya":("78710","78805"),
 "R4_Sants_TerrassaEst":("71801","78710"),
 "R2N_Sants_GranollersCentre":("71801","79100"),
 "R2S_Sants_Vilanova":("71801","71700"),
 "R11_Sants_Girona":("71801","79101"),
}
def fetch(a,b):
    url="https://trenalia.org/api/v1/timetable?"+urllib.parse.urlencode({
       "from":a,"to":b,"date":DAY,"limit":400})
    req=urllib.request.Request(url,headers={"User-Agent":"MiRodalies/2.1 source-provenance-audit",
            "Accept":"application/json","Origin":"https://arl338.github.io"})
    with urllib.request.urlopen(req,timeout=15) as resp:
        if resp.status!=200:raise ValueError("HTTP "+str(resp.status))
        return json.load(resp)
def classify(obj):
    rows=obj.get("trains",[])
    categories=Counter(); operators=Counter();feeds=Counter();kind=Counter()
    stops_details=Counter()
    for r in rows:
        categories[str(r.get("product"))]+=1
        operators[str(r.get("operator"))]+=1
        feeds[str(r.get("feed"))]+=1
        kind["train_null" if r.get("train") is None else "train_known"]+=1
        stops=r.get("stops")
        stops_details[type(stops).__name__]+=1
    first=next((r for r in rows if isinstance(r,dict)),{})
    example_shapes={"dep":type(first.get("dep")).__name__,
                    "arr":type(first.get("arr")).__name__,
                    "depMs":type(first.get("depMs")).__name__,
                    "arrMs":type(first.get("arrMs")).__name__,
                    "stops":type(first.get("stops")).__name__,
                    "stops_list_size":len(first.get("stops") or []) if isinstance(first.get("stops"),list) else None,
                    "first_stop_keys":sorted(first["stops"][0]) if isinstance(first.get("stops"),list) and first["stops"] and isinstance(first["stops"][0],dict) else []}
    return {"total":obj.get("total"),"records":len(rows),"date":obj.get("date"),
            "products":dict(categories),"operators":dict(operators),"feeds":dict(feeds),
            "train_identity":dict(kind),"stops_shapes":dict(stops_details),
            "example_field_shapes":example_shapes,"missingOperators":obj.get("missingOperators"),
            "notes":obj.get("notes"),"attribution":obj.get("attribution")}
def main():
    report={"schema":1,"checked_at":datetime.now(timezone.utc).isoformat(),
     "note":"Counts per requested origin/destination. Product must identify requested line before any use.",
     "pairs":{}}
    for name,(a,b) in PAIRS.items():
        try:report["pairs"][name]=classify(fetch(a,b))
        except Exception as exc:report["pairs"][name]={"error":type(exc).__name__}
        print(name,json.dumps(report["pairs"][name],ensure_ascii=False)[:3000])
    Path("trenalia-source-provenance.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")

if __name__=="__main__":main()
