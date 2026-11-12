"""Compile independently verified official R4 PDF station cells into daily schedules.

Only southern direction is certified by current PDF extraction. The northern
direction continues to use Renfe GTFS. Never synthesise intermediate stops.
"""
from __future__ import annotations
import json
from datetime import datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

TZ=ZoneInfo("Europe/Madrid")
REFERENCE=Path(__file__).resolve().parents[1]/"data/reference/r4_official_timetable.json"
SOURCE="https://rodalies.gencat.cat/web/.content/02_Horaris/horaris/R4.pdf"

def load_reference(path=REFERENCE):
    doc=json.loads(Path(path).read_text(encoding="utf8"))
    if doc.get("schema")!=1 or doc.get("source")!=SOURCE:
        raise ValueError("Reference is not official R4 PDF v1")
    entries=doc.get("services")
    if not isinstance(entries,list) or len(entries)<75:
        raise ValueError("R4 official timetable is incomplete")
    known={}
    for item in entries:
        if item["calendar"] not in ("weekday","weekend") or item["direction"]!="south":
            raise ValueError("Unverified direction in R4 PDF input")
        stops=item["stops"]
        if len(stops)<2 or any(not isinstance(st[1],int) or not 0<=st[1]<1800 for st in stops):
            raise ValueError("Malformed PDF clock")
        if any(stops[i][1]<stops[i-1][1] for i in range(1,len(stops))):
            raise ValueError("Nonchronological official PDF stops")
        if len({s[0] for s in stops})!=len(stops):
            raise ValueError("Repeated station in official timetable")
        known[item["id"]]=item
    if len(known)!=len(entries):raise ValueError("Duplicate official R4 service IDs")
    return doc

def materialize_day(day,reference):
    calendar="weekend" if day.weekday()>=5 else "weekday"
    anchor=datetime.combine(day,time.min,tzinfo=TZ)
    out=[]
    for item in reference["services"]:
        if item["calendar"]!=calendar:continue
        stops=[]
        for code,minute in item["stops"]:
            stamp=int((anchor+timedelta(minutes=minute)).timestamp())
            stops.append([code,stamp,stamp])
        out.append({"id":item["id"]+"-"+day.isoformat(),"n":"","l":"R4",
                    "src":"official-r4-pdf","dest":stops[-1][0],"s":stops})
    return out

def duplicate_gtfs(source,existing):
    # Require two independent station/time witnesses (<= 2 minutes).
    # Opposite directions can't match two ordered stops of the same journey.
    src={x[0]:x[2] for x in source["s"]}
    for train in existing:
        if train.get("l")!="R4":continue
        match=sum(code in src and abs(src[code]-station[2])<=120 for station in train.get("s",[])
                  for code in [station[0]])
        if match>=2:return True
    return False

def supplement_day(day,gtfs,reference):
    additional=[]
    for pdf in materialize_day(day,reference):
        if duplicate_gtfs(pdf,gtfs) or duplicate_gtfs(pdf,additional):continue
        additional.append(pdf)
    return additional

def reference_metadata(reference,count_by_day):
    return {"source":reference["source"],
            "document_sha256":reference["sha256"],
            "extracted_at":reference["verified_at"],
            "direction":"Manresa to Sant Vicenç de Calders, via Terrassa Est",
            "weekday_template_count":sum(s["calendar"]=="weekday" for s in reference["services"]),
            "weekend_template_count":sum(s["calendar"]=="weekend" for s in reference["services"]),
            "supplement_count_by_day":count_by_day,
            "note":"Published timetable cells; not proof of circulation or of live estimated departure. Service variations may occur."}
