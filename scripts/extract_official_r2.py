#!/usr/bin/env python3
"""Reconstruct ONLY verifiable R2 Nord/R2 Sud cells from Rodalies' PDF.

Grid extraction uses the actual x/y coordinates of printed PDF characters,
never OCR, interpolated stop times or a third-party timetable.
Ambiguous commercial patterns, visually exceptional Saturday/Sunday rows,
R11 interleavings and any invalid chronology are excluded.
"""
from __future__ import annotations
import argparse
import hashlib
import io
import json
import math
import re
import urllib.request
from collections import Counter
from datetime import datetime
from pathlib import Path

SOURCE = "https://rodalies.gencat.cat/web/.content/01_Actualitat/2026/11_09_Gava_Castelldefels/R2_2026-A-partir-del12.11.26-Castelldefels-acaben-en-Gava-1.pdf"
ISSUED_ON = "2026-11-10"
VALID_FROM = "2026-11-12"
VALID_THROUGH = "2026-12-14"  # Dated R2 infrastructure alteration; review before renewing.
# Verified ADIF station IDs, in exact official PDF order (left-to-right page 0).
STATIONS = (
    "79200", "79107", "79106", "79105", "79104", "79103", "79102",
    "79101", "79109", "79100", "79007", "79006", "79011", "79005",
    "79004", "79009", "79400", "71802", "71801", "71708", "71707",
    "72400", "71709", "71706", "71705", "71704", "71703", "71701",
    "71700", "71604", "71603", "71602", "71601", "71600",
)
assert len(STATIONS)==34 and len(set(STATIONS))==34
CLOCK=re.compile(r"^([0-2]?\d)[.:]([0-5]\d)$")
COLUMN_ZERO=55.7
COLUMN_STEP=26.365

def clock(value: str) -> int:
    match=CLOCK.fullmatch(value)
    if not match or int(match.group(1))>23:raise ValueError("Invalid printed clock "+value)
    return 60*int(match.group(1))+int(match.group(2))

def group_rows(cells):
    """Group same-baseline time words, tolerating tiny glyph/font offsets."""
    rows=[]
    for item in sorted(cells,key=lambda x:(x["y"],x["x"])):
        if not rows or item["y"]-rows[-1][-1]["y"]>0.70:
            rows.append([item])
        else:
            rows[-1].append(item)
    return rows

def parse_row(page_index, row, highlighted=False):
    if len(row)<3 or highlighted:return None,"too_short_or_calendar_exception"
    order=STATIONS if page_index%2==0 else STATIONS[::-1]
    cells={}
    for item in row:
        col=round((item["x"]-COLUMN_ZERO)/COLUMN_STEP)
        if not 0<=col<34 or abs(item["x"]-(COLUMN_ZERO+col*COLUMN_STEP))>1.55:
            return None,"column_ambiguous"
        if col in cells:return None,"duplicated_column"
        cells[col]=clock(item["time"])
    if len(cells)<3:return None,"too_few_cells"
    codes=[order[i] for i in sorted(cells)]
    if "72400" in codes and not any(code in
            {"71704","71703","71701","71700","71604","71603","71602","71601","71600"}
            for code in codes):
        line="R2N"
    elif "79400" in codes and "72400" not in codes and any(code in
            {"71706","71705","71704","71703","71701","71700","71604",
             "71603","71602","71601","71600"} for code in codes):
        line="R2S"
    else:
        return None,"not_unambiguously_R2N_or_R2S"
    pairs=[]
    offset=0
    last=None
    for i in sorted(cells):
        minute=cells[i]+offset
        if last is not None and minute<last-720:
            minute+=1440
            offset+=1440
        if last is not None and minute<=last:return None,"nonmonotone_clock"
        last=minute
        pairs.append([order[i],minute])
    return {"line":line,"calendar":"weekday" if page_index<2 else "weekend",
            "direction":"forward" if page_index%2==0 else "reverse",
            "source_page":page_index+1,
            "printed_y":round(sum(x["y"] for x in row)/len(row),2),
            "stops":pairs},None

def highlighted_row(page,y) -> bool:
    """Flag PDF rows highlighted for Sunday/holiday-specific operation.
    Do not turn 'Sunday only' into Saturday service or vice versa.
    """
    pix=page.get_pixmap(matrix=__import__("fitz").Matrix(1,1),
                       colorspace=__import__("fitz").csRGB,alpha=False)
    # A bright non-neutral background at multiple cells denotes official
    # salmon/lilac exception highlighting (not alternating grey columns).
    matches=0
    for x in (69,143,353,774,918):
        iy=min(pix.height-1,max(0,round(y)+4))
        ix=min(pix.width-1,max(0,x))
        pos=iy*pix.stride+ix*pix.n
        rgb=pix.samples[pos:pos+3]
        if len(rgb)==3:
            r,g,b=rgb
            if min(rgb)>150 and ((r-g>16 and r-b>13) or (b-g>15 and r-g>7)):
                matches+=1
    return matches>=2

def extract(raw:bytes):
    import fitz
    document=fitz.open(stream=raw,filetype="pdf")
    if len(document)!=4:
        raise ValueError("Expected 4 pages; official PDF was changed and needs re-audit")
    services=[];stats={}
    for pageno,page in enumerate(document):
        if not 950<=page.rect.width<=1000 or not 2500<=page.rect.height<=2600:
            raise ValueError("Official R2 PDF grid geometry changed")
        cells=[]
        for w in page.get_text("words"):
            token=str(w[4]).strip()
            if CLOCK.fullmatch(token):
                x=(w[0]+w[2])/2;y=(w[1]+w[3])/2
                if 575<=y<=page.rect.height-130:
                    cells.append({"x":x,"y":y,"time":token})
        groups=group_rows(cells)
        reasons=Counter()
        for row in groups:
            y=sum(x["y"] for x in row)/len(row)
            # Exception markings appear only on weekend pages. Never infer
            # Saturday vs Sunday/holiday for those highlighted services.
            highlight=highlighted_row(page,y) if pageno>=2 else False
            record,error=parse_row(pageno,row,highlighted=highlight)
            if error:reasons[error]+=1;continue
            record["id"]=f'r2-{pageno+1}-{round(y*10)}'
            services.append(record)
        stats[pageno+1]={"raw_clock_cells":len(cells),"rows":len(groups),
                          "admitted":sum(x["source_page"]==pageno+1 for x in services),
                          "excluded":dict(reasons)}
    summary=Counter((x["line"],x["calendar"]) for x in services)
    result={"schema":1,"source":SOURCE,"issued_on":ISSUED_ON,
            "verified_against_page_screenshots":"2026-11-15",
            "valid_from":VALID_FROM,"valid_through":VALID_THROUGH,
            "document_sha256":hashlib.sha256(raw).hexdigest(),
            "station_columns_forward":list(STATIONS),
            "calendar_caveat":"Workday/weekend templates only; special Sunday/holiday-highlighted rows excluded. Nov 17 strike service not confirmed.",
            "counts":{f"{line}:{cal}":count for (line,cal),count in summary.items()},
            "stats":stats,"services":services}
    return result

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--out",required=True)
    args=ap.parse_args()
    req=urllib.request.Request(SOURCE,headers={"User-Agent":"MiRodalies-R2-source-audit/1.0"})
    with urllib.request.urlopen(req,timeout=45) as resp:
        raw=resp.read(8*1024*1024)
    if not raw.startswith(b"%PDF"):raise ValueError("Official R2 source not a PDF")
    result=extract(raw)
    output=Path(args.out);output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print("PDF SHA256",result["document_sha256"])
    print("ROWS",len(result["services"]),"COUNTS",json.dumps(result["counts"],sort_keys=True))
    print("STATS",json.dumps(result["stats"],sort_keys=True))
    for item in result["services"][:13]:
        print("SAMPLE",json.dumps(item,ensure_ascii=False))

if __name__=="__main__":main()
