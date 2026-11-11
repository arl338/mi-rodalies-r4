#!/usr/bin/env python3
"""Audit original Renfe GTFS stop_times before any line/station corrections."""
import json, io, zipfile, hashlib, argparse
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from pathlib import Path
import build_network as B

def analyze(raw,days=14):
    base=datetime.now(B.TZ).date()
    requested=[base+timedelta(days=i) for i in range(-1,days)]
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        routes={r['route_id']:r for r in B.load(z,'routes.txt')}
        trips=B.load(z,'trips.txt')
        valid=B.service_days(B.load_optional(z,'calendar.txt'),B.load_optional(z,'calendar_dates.txt'),requested)
        selected={t['trip_id']:(B.infer_line(t,routes.get(t.get('route_id'),{})),t) for t in trips if valid.get(t.get('service_id'))}
        selected={k:v for k,v in selected.items() if v[0]}
        stops={s['stop_id']:s for s in B.load(z,'stops.txt')}
        raw_counts=Counter();kept_counts=Counter();discarded=Counter();sample=defaultdict(list)
        with B.txt(z,'stop_times.txt') as f:
            for row in B.normalized_csv_rows(f):
                tid=row.get('trip_id')
                if tid not in selected:continue
                raw_counts[tid]+=1
                sid=row.get('stop_id');stop=stops.get(sid)
                if not stop:discarded['unknown_stop']+=1;continue
                if stop.get('parent_station') in stops:stop=stops[stop['parent_station']]
                if not B.in_catalonia(stop):discarded['outside_catalonia']+=1;continue
                if B.hms(row.get('arrival_time')) is None and B.hms(row.get('departure_time')) is None:
                    discarded['invalid_time']+=1;continue
                try:int(row.get('stop_sequence') or 0)
                except (ValueError,TypeError):discarded['invalid_sequence']+=1;continue
                kept_counts[tid]+=1
                if selected[tid][0]=='R3' and len(sample[tid])<12:
                    sample[tid].append([sid,stop.get('stop_name'),row.get('arrival_time')])
        lines={}
        for line in B.LINES:
            ids=[tid for tid,(l,_) in selected.items() if l==line]
            if not ids:continue
            two=[tid for tid in ids if kept_counts[tid]==2]
            snippets=([tid for tid in two if raw_counts[tid]>2][:3]+
                      [tid for tid in two if raw_counts[tid]==2][:3])
            lines[line]={
                'active_trip_ids':len(ids),
                'raw_two_stop_trips':sum(raw_counts[tid]==2 for tid in ids),
                'usable_two_stop_trips':len(two),
                'trips_with_removed_stops':sum(raw_counts[tid]>kept_counts[tid] for tid in ids),
                'trips_without_raw_stops':sum(raw_counts[tid]==0 for tid in ids),
                'trips_with_fewer_than_two_usable_stops':sum(kept_counts[tid]<2 for tid in ids),
                'distribution':dict(Counter(kept_counts[tid] for tid in ids)),
                'samples':[{'trip_id':tid,'raw_stop_times':raw_counts[tid],
                            'usable_stop_times':kept_counts[tid],
                            'original_stops':sample.get(tid,[])} for tid in snippets]
            }
    return {'schema':1,'source':B.CERCANIAS,'gtfs_sha256':hashlib.sha256(raw).hexdigest(),
            'generated_at':datetime.now(B.TZ).isoformat(),'date_start':str(requested[0]),
            'date_end':str(requested[-1]),'discarded_stop_times':dict(discarded),
            'by_line':lines,'note':'La auditoría compara stop_times original con el filtrado. Nunca reconstruye horarios.'}

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--days',type=int,default=14)
    ap.add_argument('--out',default='data/v2/source_audit.json')
    ap.add_argument('--zip')
    args=ap.parse_args()
    raw=Path(args.zip).read_bytes() if args.zip else B.download(B.CERCANIAS)
    report=analyze(raw,args.days)
    out=Path(args.out);out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf8')
    print('AUDITORIA FUENTE ZIP SHA256',report['gtfs_sha256'],flush=True)
    for key,value in report['by_line'].items():
        print('AUDITORIA',key,'trips',value['active_trip_ids'],
              'raw2',value['raw_two_stop_trips'],
              'usable2',value['usable_two_stop_trips'],
              'removed',value['trips_with_removed_stops'],flush=True)
