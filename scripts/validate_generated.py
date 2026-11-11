#!/usr/bin/env python3
"""Data-integrity gate for the public Rodalies GTFS catalogue and daily files.

Checks what can be verified from the GTFS. A green gate does not certify
service operation, missing intermediate stops or completeness of a source.
"""
from __future__ import annotations
import argparse, json, sys
from collections import Counter, defaultdict
from datetime import date, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo
from datetime import datetime

TZ=ZoneInfo('Europe/Madrid')

def validate(out,days=14,min_stations=10):
    path=Path(out)
    c=json.loads((path/'catalog.json').read_text(encoding='utf8'))
    assert c['schema']==2 and isinstance(c.get('batch_id'),str) and len(c['batch_id'])>=12
    assert c.get('source') and len(c['lines'])==19
    assert isinstance(c.get('source_quality'),dict) and c['source_quality'].get('source_sha256'), 'El catálogo no está contrastado con el mismo GTFS original que la auditoría; se bloquea la publicación'
    assert len(set(x['id'] for x in c['lines']))==19
    assert all(isinstance(x['present'],bool) for x in c['lines'])
    stations={s['id']:s for s in c['stations']}
    assert len(stations)==len(c['stations']) and len(stations)>=min_stations
    assert all(s.get('lines') for s in stations.values())
    assert c['coverage_end']>=c['coverage_start']
    start=date.fromisoformat(c['coverage_start'])-timedelta(days=1)
    files=[start+timedelta(days=i) for i in range(days+1)]
    assert str(files[-1])==c['coverage_end'], 'Periodo de cobertura incoherente'
    published={p.name for p in path.glob('20??-??-??.json')}
    assert published=={str(d)+'.json' for d in files}, 'Faltan/sobran archivos diarios'
    total=0;stats=Counter();two=Counter();bad=[];seen=defaultdict(set)
    for day in files:
        d=json.loads((path/(str(day)+'.json')).read_text(encoding='utf8'))
        assert d['schema']==2 and d['day']==str(day) and d.get('batch_id')==c['batch_id'], 'Mezcla de lotes GTFS'
        for train in d['trains']:
            assert train['l'] in {line['id'] for line in c['lines']}
            stops=train['s'];assert len(stops)>=2
            assert isinstance(train.get('id'),str) and train['id']
            assert all(isinstance(s,list) and len(s)==3 and all(isinstance(x,int) for x in s[1:]) for s in stops)
            assert all(s[0] in stations and train['l'] in stations[s[0]]['lines'] for s in stops)
            assert all(a[1]<=a[2] for a in stops)
            assert all(stops[i][1]>=stops[i-1][2] for i in range(1,len(stops)))
            assert stops[-1][1]>stops[0][2]
            assert stops[-1][1]-stops[0][2]<=24*3600, 'Recorrido ferroviario de más de 24 horas'
            key=(train['l'],train['n'],stops[0][0],stops[0][2],stops[-1][0],stops[-1][1])
            assert key not in seen[day], 'Servicio duplicado en '+str(day)
            seen[day].add(key)
            total+=1;stats[train['l']]+=1
            if len(stops)==2:two[train['l']]+=1
    for item in c['lines']:
        assert item['present']==(stats[item['id']]>0), 'Línea marcada presente sin horarios: '+item['id']
        assert item['scheduled_trips_in_period']==stats[item['id']], 'Conteo de horarios incoherente: '+item['id']
    assert total>0
    print('CALIDAD GTFS: lote',c['batch_id'],'estaciones',len(stations),
          'servicios',total,'líneas cubiertas',sum(bool(stats[x['id']]) for x in c['lines']))
    for l in c['lines']:
        if stats[l['id']]:
            print('CALIDAD LÍNEA',l['id'],'trenes',stats[l['id']],
                  'dos_paradas',two[l['id']],
                  'ATENCIÓN_ORIGEN_INCOMPLETO' if two[l['id']] else '')
    if not c.get('source_quality'):
        print('CALIDAD: SIN AUDITORÍA DE ORIGEN COINCIDENTE; no se declara completitud')
    return {'trains':total,'stations':len(stations),'lines':sum(bool(stats[x['id']]) for x in c['lines'])}

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--out',default='data/v2');ap.add_argument('--days',type=int,default=14)
    args=ap.parse_args();validate(args.out,args.days)
