#!/usr/bin/env python3
"""Diagnostic only: inspect positioned words in CURRENT official Rodalies R2 PDF.

This writes no passenger timetable. The R2 Nord/R2 Sud grids use multiple
commercial services in one page, and text extraction without x/y coordinates
would silently associate incorrect stops. Use visible PDF cells as source,
not OCR/interpolation or a third-party journey list.
"""
from __future__ import annotations
import argparse
import io
import json
import re
import urllib.request
from collections import Counter
from pathlib import Path

URL = "https://rodalies.gencat.cat/web/.content/01_Actualitat/2026/11_09_Gava_Castelldefels/R2_2026-A-partir-del12.11.26-Castelldefels-acaben-en-Gava-1.pdf"
CLOCK = re.compile(r"^(?:[012]?\d)[.:][0-5]\d$")

def analyze(raw: bytes) -> dict:
    import fitz
    doc = fitz.open(stream=raw, filetype="pdf")
    report={"source":URL,"pages":[]}
    for n,page in enumerate(doc):
        words=page.get_text("words")
        cells=[]
        for w in words:
            t=w[4].strip()
            if CLOCK.fullmatch(t):
                cells.append({"x":round((w[0]+w[2])/2,2),
                              "y":round((w[1]+w[3])/2,2),"time":t})
        ranked=Counter(round(v["x"],1) for v in cells)
        rows=Counter(round(v["y"],1) for v in cells)
        report["pages"].append({
            "page":n,"width":round(page.rect.width,2),
            "height":round(page.rect.height,2),
            "words":len(words),
            "clock_cells":len(cells),
            "column_counts":ranked.most_common(42),
            "row_counts":rows.most_common(15),
            "sample_cells_y_sorted":sorted(cells,key=lambda x:(x["y"],x["x"]))[:90],
            "sample_header_words":[{"x":round(w[0],1),"y":round(w[1],1),"t":w[4]}
                for w in words if w[1] < page.rect.height*.20][:110],
        })
    return report

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--out",default="/tmp/rodalies-r2-position-audit.json")
    args=p.parse_args()
    request=urllib.request.Request(URL,headers={"User-Agent":"MiRodalies-official-timetable-audit/1.0"})
    with urllib.request.urlopen(request,timeout=45) as response:
        raw=response.read(8*1024*1024)
    if not raw.startswith(b"%PDF"):raise ValueError("Official timetable URL is not PDF")
    data=analyze(raw)
    Path(args.out).write_text(json.dumps(data,indent=2,ensure_ascii=False),encoding="utf-8")
    print("OFFICIAL R2 PDF pages=",len(data["pages"]),"bytes=",len(raw))
    for page in data["pages"]:
        print("PAGE",page["page"],"size",page["width"],page["height"],
              "time_cells",page["clock_cells"],"rows",len(page["row_counts"]))
        print("COLUMN COUNTS",json.dumps(page["column_counts"][:42]))
        print("TOP ROW EXAMPLE",json.dumps(page["sample_cells_y_sorted"][:45]))
        print("HEADERS",json.dumps(page["sample_header_words"][:45],ensure_ascii=False))

if __name__=="__main__":
    main()
