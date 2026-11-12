"""Verified station/time cells from supplementary 2026 official Rodalies tables.

Only directly printed stops and time cells are present. Explicitly ambiguous
rows remain excluded, never reconstructed by interpolation or guessing.
"""
from __future__ import annotations
import json
from datetime import datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

REFERENCE = Path(__file__).resolve().parents[1] / 'data/reference/additional_official_timetables.json'
TZ = ZoneInfo('Europe/Madrid')
LINES = ('RT1', 'RT2', 'RL4')

def load_reference(path=REFERENCE):
    d = json.loads(Path(path).read_text(encoding='utf8'))
    if d.get('schema') != 1 or set(d.get('sources', {})) != set(LINES):
        raise ValueError('Invalid supplementary official timetable manifest')
    counts = {x: 0 for x in LINES}
    keys = set()
    for item in d['services']:
        line, cal, n = item['line'], item['calendar'], item['train_number']
        if line not in counts or cal not in ('weekday', 'weekend', 'daily'):
            raise ValueError('Unknown line or calendar in official timetable')
        key = (line, cal, n)
        if key in keys: raise ValueError('Duplicated official service '+str(key))
        keys.add(key)
        stops = item['stops']
        if not isinstance(n, str) or not n.isdigit() or len(stops) < 2:
            raise ValueError('Invalid official train identity/stops')
        if len({code for code,minute in stops}) != len(stops):
            raise ValueError('Duplicated stop in official timetable')
        if any(not isinstance(code,str) or len(code)!=5 or not code.isdigit()
               or not isinstance(minute,int) or not 0<=minute<1440 for code,minute in stops):
            raise ValueError('Invalid official station or clock cell')
        if any(stops[i][1]>=stops[i+1][1] for i in range(len(stops)-1)):
            raise ValueError('Chronologically inconsistent printed official schedule: '+n)
        counts[line] += 1
    if counts != {'RT1':10,'RT2':16,'RL4':16}:
        raise ValueError('Official timetable row count changed: '+str(counts))
    if not d.get('excluded'):
        raise ValueError('Expected explicit unresolved source anomaly record')
    return d

def materialize_day(day, reference):
    mode = 'weekend' if day.weekday() >= 5 else 'weekday'
    anchor = datetime.combine(day, time.min, tzinfo=TZ)
    result = []
    for item in reference['services']:
        if item['calendar'] not in (mode, 'daily'):
            continue
        stops = []
        for code, minute in item['stops']:
            when = int((anchor+timedelta(minutes=minute)).timestamp())
            stops.append([code,when,when])
        result.append({'id':'official-'+item['line'].lower()+'-'+item['train_number']+'-'+day.isoformat(),
                       'n':item['train_number'], 'l':item['line'],
                       'src':'official-supplement-pdf', 'dest':stops[-1][0], 's':stops})
    return result

def duplicate(candidate, existing):
    if candidate['l']!=existing.get('l'):return False
    if candidate['n'] and existing.get('n') and str(int(candidate['n']))!=str(int(existing['n'])):
        return False
    published = {s[0]:s[2] for s in candidate['s']}
    return sum(code in published and abs(published[code]-t)<=60
               for code, _a, t in existing.get('s', []))>=2

def supplement_day(day, existing, reference):
    additions=[]
    for service in materialize_day(day, reference):
        if any(duplicate(service, old) for old in existing+additions):
            continue
        additions.append(service)
    return additions
