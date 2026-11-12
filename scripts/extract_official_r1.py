#!/usr/bin/env python3
"""Extract R1 official PDF *observed* station cells and validate against Renfe GTFS.

The four published R1 grids have 27 station columns:
page 0 weekday Hospitalet->Maçanet, page 1 reverse,
page 2 weekends eastbound, page 3 weekends westbound.
No service/stop/time is interpolated; do not infer service to Molins.
"""
from __future__ import annotations
import argparse,hashlib,json,re,urllib.request
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
import fitz

SOURCE="https://rodalies.gencat.cat/web/.content/02_Horaris/horaris/R1.pdf"
TIME=re.compile(r'^(\d{1,2})\.(\d{2})$')
ROOT=Path(__file__).resolve().parents[1]
TZ=ZoneInfo('Europe/Madrid')

def fetch():
    req=urllib.request.Request(SOURCE,headers={'User-Agent':'MiRodalies/2.3.1 official R1 audit'})
    with urllib.request.urlopen(req,timeout=50) as response: data=response.read(12_000_001)
    if not data.startswith(b'%PDF') or len(data)>12_000_000:
        raise ValueError('Source is not a bounded R1 PDF')
    return data

def station_order(gtfs_day):
    source=json.loads(Path(gtfs_day).read_text(encoding='utf8'))
    r1=[x for x in source['trains'] if x['l']=='R1' and len(x['s'])==27]
    east=next((x for x in r1 if x['s'][0][0]=='72305' and x['s'][-1][0]=='79200'),None)
    west=next((x for x in r1 if x['s'][0][0]=='79200' and x['s'][-1][0]=='72305'),None)
    if east is None or west is None:raise ValueError('No full length R1 trips in BOTH directions')
    ordered=[s[0] for s in east['s']]
    if len(set(ordered))!=27 or ordered!=list(reversed([s[0] for s in west['s']])):
        raise ValueError('R1 GTFS 27-stop order not symmetric')
    return ordered,list(reversed(ordered)),source

def extract_page(page,codes,calendar,direction):
    words=[]
    for w in page.get_text('words'):
        x0,y0,x1,y1,word=w[:5]
        if y0<530 or y0>2390:continue
        match=TIME.fullmatch(word)
        if not match:continue
        hour,minute=map(int,match.groups())
        if hour>=24 or minute>=60:continue
        words.append(((x0+x1)/2,y0,hour*60+minute))
    if len(words)<800:raise ValueError(f'{calendar} {direction}: insufficient time cells {len(words)}')
    minx,maxx=min(x for x,y,t in words),max(x for x,y,t in words)
    step=(maxx-minx)/26
    if not 30<=step<=36:raise ValueError('R1 unexpected 27-column grid '+str(step))
    byrow=[]
    for item in sorted(words,key=lambda x:x[1]):
        if not byrow or item[1]-byrow[-1]['y']>3.5:
            byrow.append({'y':item[1],'words':[item]})
        else:byrow[-1]['words'].append(item)
    skipped={'single_stop':0,'ambiguous_cell':0,'chronology':0}
    accepted=[]
    for row in byrow:
        if len(row['words'])<2:
            skipped['single_stop']+=1;continue
        cells={};error=False
        for x,y,m in row['words']:
            ix=round((x-minx)/step)
            if not 0<=ix<27 or abs(x-(minx+ix*step))>4 or ix in cells:
                error=True;break
            cells[ix]=m
        if error:
            skipped['ambiguous_cell']+=1;continue
        ordered=sorted(cells.items())
        stops=[];last=-1;overnight=False
        for idx,minute in ordered:
            t=minute+1440*overnight
            if t<last:
                if not overnight and last>=22*60 and minute<=4*60:
                    overnight=True;t=minute+1440
                else:error=True;break
            stops.append([codes[idx],t]);last=t
        if error or last-stops[0][1]>6*60:
            skipped['chronology']+=1;continue
        key=json.dumps([calendar,direction,stops],separators=(',',':'))
        accepted.append({'id':'pdf-r1-'+hashlib.sha256(key.encode()).hexdigest()[:16],
            'calendar':calendar,'direction':direction,'stops':stops})
    unique={}
    for service in accepted:
        key=tuple((code,minute) for code,minute in service['stops'])
        unique[key]=service
    return list(unique.values()),{'calendar':calendar,'direction':direction,
         'words':len(words),'rows':len(byrow),'accepted':len(unique),
         'x_first_center':round(minx,2),'step':round(step,3),'skipped':skipped}

def validate(data,gtfs):
    refs=data['services']
    week=[x for x in refs if x['calendar']=='weekday']
    assert len([x for x in week if x['direction']=='east'])>=75
    assert len([x for x in week if x['direction']=='west'])>=75
    assert len(refs)>=250
    matched=0
    for train in gtfs['trains']:
        if train.get('l')!='R1':continue
        observed={s[0]:datetime.fromtimestamp(s[2],TZ).hour*60+datetime.fromtimestamp(s[2],TZ).minute for s in train['s']}
        if any(sum(code in observed and observed[code]==minute for code,minute in r['stops'])>=2 for r in week):
            matched+=1
    print('R1_VALIDATION',json.dumps({'gtfs_trips':sum(t['l']=='R1' for t in gtfs['trains']),
      'two_station_time_matched':matched,'reference_services':len(refs),'quality':data['quality']}))
    if matched<35:raise ValueError(f'Insufficient GTFS matching: {matched}. Do not trust extracted R1 rows')
    if any(code in ('72300','72301','72302','72303') for r in refs for code,_ in r['stops']):
        raise ValueError('No invented Molins/Cornella service allowed')
    return matched

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--out',default='data/reference/r1_official_timetable.json')
    ap.add_argument('--gtfs-day',default='data/v2/2026-11-12.json')
    args=ap.parse_args()
    east,west,gtfs=station_order(args.gtfs_day)
    raw=fetch()
    pdf=fitz.open(stream=raw,filetype='pdf')
    if len(pdf)!=4:raise ValueError('Official R1 PDF no longer has four pages')
    meta=[];rows=[]
    for page,codes,calendar,direction in [
      (pdf[0],east,'weekday','east'),(pdf[1],west,'weekday','west'),
      (pdf[2],east,'weekend','east'),(pdf[3],west,'weekend','west')]:
        services,quality=extract_page(page,codes,calendar,direction)
        rows+=services;meta.append(quality)
    data={'schema':1,'line':'R1','source':SOURCE,'pdf_sha256':hashlib.sha256(raw).hexdigest(),
      'verified_date':'2026-11-12','station_order_east':east,'station_order_west':west,
      'quality':meta,'services':rows,
      'disclaimer':'Published planned timetable only, no confirmed circulation. Does not include Molins de Rei.'}
    validate(data,gtfs)
    out=Path(args.out);out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf8')
    print('R1_REFERENCE_WRITTEN',out,'SERVICES',len(rows),'BYTES',out.stat().st_size)
if __name__=='__main__':main()
