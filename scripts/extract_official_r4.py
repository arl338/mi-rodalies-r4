#!/usr/bin/env python3
"""Extract only *observed cells* from the official R4 timetable PDF.

- The 40 ordered stations are reconciled against a full-length, known R4 GTFS
  journey, NOT guessed from text names in a rotated header.
- Layout, column grid, row chronology and independent GTFS samples are checked.
- The output is a service-template reference, NOT a claim of train circulation.
- Never extract blank stations by interpolation.
"""
from __future__ import annotations
import argparse, hashlib, io, json, re, sys, urllib.request
from pathlib import Path
from statistics import median
import fitz

SOURCE="https://rodalies.gencat.cat/web/.content/02_Horaris/horaris/R4.pdf"
TIME=re.compile(r"^(\d{1,2})\.(\d{2})$")
ROOT=Path(__file__).resolve().parents[1]

def fetch_pdf():
    req=urllib.request.Request(SOURCE,headers={"User-Agent":"MiRodalies/2.2.3 public-timetable-check"})
    with urllib.request.urlopen(req,timeout=45) as response:
        raw=response.read(10_000_001)
    if not raw.startswith(b"%PDF") or len(raw)>10_000_000:
        raise ValueError("Official R4 document is not a bounded PDF")
    return raw

def station_order(gtfs_day:Path):
    doc=json.loads(gtfs_day.read_text(encoding='utf8'))
    trains=[r for r in doc['trains'] if r.get('l')=='R4' and len(r.get('s',[]))==40]
    south=next((r for r in trains if r['s'][0][0]=='78600' and r['s'][-1][0]=='71600'),None)
    north=next((r for r in trains if r['s'][0][0]=='71600' and r['s'][-1][0]=='78600'),None)
    if south is None or north is None:raise ValueError('No complete GTFS R4 stop-order witness')
    south_codes=[s[0] for s in south['s']]
    north_codes=[s[0] for s in north['s']]
    if north_codes!=list(reversed(south_codes)) or len(set(north_codes))!=40:
        raise ValueError('GTFS R4 directions do not match a 40-stop canonical route')
    return north_codes,south_codes

def cell_words(page):
    result=[]
    for w in page.get_text('words'):
        x,y=w[0],w[1]
        if not (32<=x<=940 and 530<=y<=2240):continue
        m=TIME.fullmatch(w[4])
        if not m:continue
        hh,mm=map(int,m.groups())
        if hh>=24 or mm>=60:continue
        result.append((x,y,hh*60+mm))
    return result

def parse_grid(page,station_codes,calendar,direction):
    words=cell_words(page)
    if len(words)<200:raise ValueError(f'{calendar}/{direction}: PDF page without a timetable grid')
    # The R4 table has 40 equally spaced stop columns on all four pages.
    xs=[w[0] for w in words]
    x0=min(xs)
    step=(max(xs)-x0)/39
    if not 20.0<=step<=25.0:raise ValueError(f'{calendar}/{direction}: unexpected grid step {step:.2f}')
    by_row=[]
    for w in sorted(words,key=lambda z:z[1]):
        if not by_row or w[1]-by_row[-1]['y']>3.5:
            by_row.append({'y':w[1],'items':[w]})
        else:by_row[-1]['items'].append(w)
    services=[]
    skipped={'few_cells':0,'bad_index':0,'duplicate_index':0,'bad_chronology':0}
    for row in by_row:
        if len(row['items'])<2:
            skipped['few_cells']+=1;continue
        grid={}
        corrupt=False
        for x,y,minutes in row['items']:
            col=round((x-x0)/step)
            if not (0<=col<40) or abs((x0+col*step)-x)>5:
                corrupt=True;skipped['bad_index']+=1;break
            if col in grid:
                corrupt=True;skipped['duplicate_index']+=1;break
            grid[col]=minutes
        if corrupt:continue
        indices=sorted(grid)
        # Monotone clock for one journey. Crossing midnight is allowed once.
        sequence=[]
        overnight=False
        previous=-1
        for idx in indices:
            minute=grid[idx]+(1440 if overnight else 0)
            if previous>=0 and minute<previous:
                if previous>=22*60 and grid[idx]<=4*60 and not overnight:
                    overnight=True;minute=grid[idx]+1440
                else:
                    corrupt=True;break
            previous=minute
            sequence.append([station_codes[idx],minute])
        if corrupt or sequence[-1][1]-sequence[0][1]>6*60:
            skipped['bad_chronology']+=1;continue
        # Avoid treating unlabelled R7/RL4 special rows as R4 unless their
        # physical stop pattern matches a known contiguous R4 section.
        if len(sequence)<3:skipped['few_cells']+=1;continue
        identifier=hashlib.sha256(repr((calendar,direction,sequence)).encode()).hexdigest()[:16]
        services.append({'id':f'pdf-r4-{calendar}-{direction}-{identifier}',
                         'calendar':calendar,'direction':direction,'stops':sequence})
    seen=set();distinct=[]
    for s in services:
        key=tuple((p[0],p[1]) for p in s['stops'])
        if key not in seen:seen.add(key);distinct.append(s)
    return distinct,{'page_words':len(words),'grid_first_x':round(x0,2),
                     'grid_step':round(step,3),'rows':len(by_row),
                     'accepted_services':len(distinct),'skipped':skipped}

def inspect(raw:bytes,gtfs_day:Path):
    north,south=station_order(gtfs_day)
    pdf=fitz.open(stream=raw,filetype='pdf')
    if len(pdf)!=4:raise ValueError('Expected exactly 4 R4 PDF pages')
    specs=[(north,'weekday','north'),(north,'weekend','north'),
           (south,'weekday','south'),(south,'weekend','south')]
    all_services=[];meta=[]
    for page,(ids,daytype,direction) in zip(pdf,specs):
        services,quality=parse_grid(page,ids,daytype,direction)
        all_services.extend(services)
        meta.append({'calendar':daytype,'direction':direction,**quality})
    print('PRECHECK_QUALITY',json.dumps(meta,ensure_ascii=False),'all',len(all_services))
    if len([t for t in all_services if t['direction']=='south'])<65:raise ValueError('Too few southbound services to cover timetable')
    snapshot=json.loads(gtfs_day.read_text(encoding='utf8'))
    from zoneinfo import ZoneInfo
    from datetime import datetime
    tz=ZoneInfo('Europe/Madrid')
    def mins(ts):
        d=datetime.fromtimestamp(ts,tz)
        return d.hour*60+d.minute
    official_south=[t for t in all_services if t['calendar']=='weekday' and t['direction']=='south']
    # Confirm actual station-specific GTFS observations using at least two
    # exact or +/-2 min stop time witnesses in the same service and direction.
    matched=0;unmatched=[]
    for trip in snapshot['trains']:
        if trip.get('l')!='R4' or not {'78710','78805'}<=set(st[0] for st in trip['s']):continue
        s=next((w for w in trip['s'] if w[0]=='78710'),None)
        p=next((w for w in trip['s'] if w[0]=='78805'),None)
        if not s or not p or s[2]>=p[1]:continue
        candidates=[v for v in official_south if
           any(st[0]=='78710' and abs(st[1]-mins(s[2]))<=2 for st in v['stops']) and
           any(st[0]=='78805' and abs(st[1]-mins(p[1]))<=2 for st in v['stops'])]
        if candidates:matched+=1
        else:unmatched.append({'train':trip['n'],'TerrassaEst':mins(s[2]),'PlCatalunya':mins(p[1])})
    print('GRID_QUALITY',json.dumps(meta,ensure_ascii=False))
    print('GTFS_CHECK',json.dumps({'matched':matched,'unmatched_count':len(unmatched),
          'samples':unmatched[:8]},ensure_ascii=False))
    early=[]
    for trip in official_south:
        stamps={stop:time for stop,time in trip['stops']}
        if '78710' in stamps and '78805' in stamps and 360<=stamps['78710']<=430:
            early.append({'origin':'78710','departure':f"{stamps['78710']//60:02d}:{stamps['78710']%60:02d}",
                          'arrival':f"{stamps['78805']//60:02d}:{stamps['78805']%60:02d}",
                          'service_id':trip['id']})
    print('R4_TERRASSA_EST_TO_PL_CATALUNYA_0600_0710',json.dumps(early,ensure_ascii=False))
    if matched<25:raise ValueError('PDF extraction failed GTFS station/time alignment witness')
    if not any(x['departure']=='06:48' for x in early):
        raise ValueError('Official southbound 06:48 service not located')
    return {'schema':1,'source':SOURCE,'sha256':hashlib.sha256(raw).hexdigest(),
        'verified_at':'2026-11-12','note':'PDF timetable cells only, not confirmed running trains.',
        'quality':meta,'services':all_services}

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--pdf')
    ap.add_argument('--gtfs-day',default='data/v2/2026-11-12.json')
    ap.add_argument('--out',default='data/reference/r4_official_timetable.json')
    args=ap.parse_args()
    raw=Path(args.pdf).read_bytes() if args.pdf else fetch_pdf()
    data=inspect(raw,Path(args.gtfs_day))
    out=Path(args.out);out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf8')
    print('OFFICIAL_REFERENCE',out,'SERVICES',len(data['services']),'BYTES',out.stat().st_size)
if __name__=='__main__':main()
