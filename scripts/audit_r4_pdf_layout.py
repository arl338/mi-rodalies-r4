#!/usr/bin/env python3
"""Non-publishing inspection of official R4 weekday timetable grid.
No schedules are invented; only station/time cells observed in the PDF.
"""
import io, json, re, urllib.request
import fitz

URL="https://rodalies.gencat.cat/web/.content/02_Horaris/horaris/R4.pdf"
def run():
 req=urllib.request.Request(URL,headers={"User-Agent":"MiRodalies/2.2 timetable verification"})
 with urllib.request.urlopen(req,timeout=45) as r:
  raw=r.read(12_000_000)
 assert raw.startswith(b'%PDF')
 doc=fitz.open(stream=raw,filetype='pdf')
 print('PAGES',len(doc),'BYTES',len(raw))
 for idx,page in enumerate(doc):
  text=page.get_text()
  print('PAGE',idx,'DIM',page.rect.width,page.rect.height,
        'HAS_TERRASSA',bool('Terrassa Est' in text),
        'FIRST',repr(text[:190]))
  if idx not in (2,):continue
  words=page.get_text('words')
  print('PAGE2_WORDS',len(words))
  # The rotated station headings are in a narrow band at the top.
  print('HEADINGS',json.dumps([
    {'x':round(w[0],1),'y':round(w[1],1),'w':w[4]} for w in words
    if w[1]<250 and ('Terrassa' in w[4] or 'Barcelona' in w[4] or 'Catalunya' in w[4])][:60]))
  times=[w for w in words if re.fullmatch(r'(?:0?[4567])\.[0-5][0-9]',w[4])]
  print('EARLY',json.dumps([{'x':round(w[0],1),'y':round(w[1],1),'v':w[4]} for w in times[:160]]))
  print('EARLY_COUNT',len(times))
run()
