"""Verified R2 Nord/R2 Sud schedules extracted from official Rodalies PDF cells.

Unlike an unstructured PDF-to-text scrape, every scheduled stop has exact
printed horizontal column position and vertical train row (page/y). This
module NEVER generates intermediate stop times. It does not infer train
numbers, observed positions, operation during strikes or special holidays.
"""
from __future__ import annotations
import json
from datetime import date, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo
from extract_official_r2 import SOURCE, STATIONS, VALID_FROM, VALID_THROUGH

REFERENCE = Path(__file__).resolve().parents[1]/"data/reference/r2_official_timetable.json"
TZ=ZoneInfo("Europe/Madrid")
COAST={"71704","71703","71701","71700","71604","71603","71602","71601","71600"}
SOUTH=COAST | {"71706","71705"}

def load_reference(path=REFERENCE):
    obj=json.loads(Path(path).read_text(encoding="utf8"))
    if (obj.get("schema")!=1 or obj.get("source")!=SOURCE
       or obj.get("valid_from")!=VALID_FROM or obj.get("valid_through")!=VALID_THROUGH
       or len(obj.get("document_sha256",""))!=64
       or tuple(obj.get("station_columns_forward",[]))!=STATIONS):
        raise ValueError("Official R2 source reference is absent, changed or unaudited")
    counts={("R2N","weekday"):0,("R2N","weekend"):0,
            ("R2S","weekday"):0,("R2S","weekend"):0}
    unique=set()
    for row in obj.get("services",[]):
        line,cal,page=row["line"],row["calendar"],row["source_page"]
        if (line,cal) not in counts or not isinstance(page,int) or page not in (1,2,3,4):
            raise ValueError("Official R2 timetable line/day/page invalid")
        if cal != ("weekday" if page<=2 else "weekend"):
            raise ValueError("Published R2 calendar does not match PDF page")
        if row.get("direction")!=("forward" if page%2 else "reverse"):
            raise ValueError("Published R2 route direction does not match PDF")
        rid=row.get("id")
        if not rid or rid in unique: raise ValueError("Duplicated official R2 PDF row")
        unique.add(rid)
        calls=row["stops"]
        if len(calls)<3 or len({stop for stop,_ in calls})!=len(calls):
            raise ValueError("Official R2 PDF service has missing/repeated stops")
        if any(not isinstance(minutes,int) or minutes<0 or minutes>=1800 for _,minutes in calls):
            raise ValueError("Invalid official R2 printed clock")
        positions={code:i for i,code in enumerate(STATIONS if page%2 else STATIONS[::-1])}
        if any(code not in positions for code,_ in calls):
            raise ValueError("Unknown official PDF station code")
        if any(positions[calls[i][0]]>=positions[calls[i+1][0]]
               or calls[i][1]>=calls[i+1][1] for i in range(len(calls)-1)):
            raise ValueError("R2 PDF times/station columns are not monotonically ordered")
        codes={code for code,_ in calls}
        if line=="R2N" and ("72400" not in codes or codes & COAST):
            raise ValueError("Unverified R2 Nord branch assignment")
        if line=="R2S" and ("79400" not in codes or "72400" in codes or not codes & SOUTH):
            raise ValueError("Unverified R2 Sud branch assignment")
        counts[line,cal]+=1
    if (counts[("R2N","weekday")]<50 or counts[("R2N","weekend")]<40
        or counts[("R2S","weekday")]<90 or counts[("R2S","weekend")]<80):
        raise ValueError("R2 official timetable extraction incomplete; do not publish partial grid")
    if sum(counts.values()) != len(obj["services"]):
        raise ValueError("R2 service count mismatch")
    return obj

def materialize_day(day, ref):
    if not date.fromisoformat(ref["valid_from"])<=day<=date.fromisoformat(ref["valid_through"]):
        return []
    cal="weekend" if day.weekday()>=5 or day.isoformat() in {'2026-12-08','2026-12-25','2026-12-26'} else "weekday"
    midnight=datetime.combine(day,time.min,tzinfo=TZ)
    output=[]
    for row in ref["services"]:
        if row["calendar"]!=cal:continue
        stops=[]
        for code,minute in row["stops"]:
            ts=int((midnight+timedelta(minutes=minute)).timestamp())
            stops.append([code,ts,ts])
        output.append({"id":f"r2-official-{row['id']}-{day.isoformat()}",
                       "n":"","l":row["line"],"src":"official-r2-pdf",
                       "dest":stops[-1][0], "s":stops,
                       "scope":"R2N/R2S: horario oficial PDF 10/11/2026, "
                               "sin confirmación de circulación ni cambios por huelga"})
    return output

def same_service(pdf,other):
    """Two corroborating station clock cells and consistent direction."""
    if pdf["l"]!=other.get("l"):return False
    expected={station:ts for station,_arr,ts in pdf["s"]}
    matches=[(i,station) for i,(station,_arr,ts) in enumerate(other.get("s",[]))
             if station in expected and abs(expected[station]-ts)<=60]
    if len(matches)<2:return False
    pdf_order={stop:i for i,(stop,_a,_d) in enumerate(pdf["s"])}
    return all(pdf_order[matches[i][1]]<pdf_order[matches[i+1][1]]
               for i in range(len(matches)-1))

def supplement_day(day,existing,ref):
    added=[]
    for pdf in materialize_day(day,ref):
        if any(same_service(pdf,train) for train in existing+added):
            continue
        added.append(pdf)
    return added

def metadata(ref,counts):
    return {"source":ref["source"],"document_sha256":ref["document_sha256"],
            "issued_on":ref["issued_on"],"valid_from":ref["valid_from"],
            "valid_through":ref["valid_through"],
            "weekday_template_count":sum(x["calendar"]=="weekday" for x in ref["services"]),
            "weekend_template_count":sum(x["calendar"]=="weekend" for x in ref["services"]),
            "counts_by_day":counts, "source_cells_per_page":ref["stats"],
            "note":"Printed Rodalies PDF calls, without guessed intermediate stops. "
                   "Only unambiguous branch rows imported; special Sunday/holiday-highlighted "
                   "rows excluded. Strike and service changes require separate verification."}
