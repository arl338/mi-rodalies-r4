#!/usr/bin/env python3
"""Generate an R4 timetable from Renfe's GTFS for two designated journeys.

The output represents the planned timetable, never a confirmation of circulation.
The upstream GTFS can publish overlapping date-scoped services for successive
weeks. These are deduplicated by day, journey, time and train number.

Usage: python scripts/build_gtfs.py --days 21
       python scripts/build_gtfs.py --zip /path/to/fomento_transit.zip
Requires Python >=3.10; standard library only.
"""
from __future__ import annotations
import argparse
import csv
import io
import json
import os
import re
import sys
import unicodedata
import urllib.request
import zipfile
from collections import defaultdict, Counter
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

OFFICIAL = 'https://ssl.renfe.com/ftransit/Fichero_CER_FOMENTO/fomento_transit.zip'
TZ = ZoneInfo('Europe/Madrid')
ROUTES = {'ida': ('78710', '78805'), 'vuelta': ('71801', '78710')}
STATION_NAMES = {
    '78710': ['terrassa est'],
    '78805': ['placa de catalunya', 'plaza de cataluna', 'barcelona pl catalunya', 'barcelona placa catalunya'],
    '71801': ['barcelona sants', 'barcelona-sants'],
}

def simplify(s):
    s = unicodedata.normalize('NFKD', str(s or '').lower())
    return ' '.join(re.sub(r'[^a-z0-9]+', ' ', ''.join(c for c in s if not unicodedata.combining(c))).split())

def load_txt(z, basename):
    matches = [n for n in z.namelist() if n.lower().split('/')[-1] == basename]
    if not matches:
        return []
    with z.open(matches[0]) as stream:
        data = stream.read().decode('utf-8-sig', errors='replace')
    return list(csv.DictReader(io.StringIO(data)))

def station_code(stop):
    stop_id = str(stop.get('stop_id') or '')
    name = simplify(stop.get('stop_name'))
    for code, aliases in STATION_NAMES.items():
        if re.search(rf'(?<!\d){code}(?!\d)', stop_id):
            return code
        if name in [simplify(x) for x in aliases] or name.startswith(tuple(simplify(x) + ' ' for x in aliases)):
            return code
    return None

def hms(s):
    try:
        bits = str(s).strip().split(':')
        if len(bits) != 3:
            return None
        h, m, sec = (int(x) for x in bits)
        if 0 <= h <= 48 and 0 <= m <= 59 and 0 <= sec <= 59:
            return h * 3600 + m * 60 + sec
    except (ValueError, TypeError):
        pass
    return None

def service_dates(services, modifications, dates):
    result = defaultdict(set)
    for row in services:
        service = row.get('service_id')
        if not service:
            continue
        start, end = row.get('start_date', '00000000'), row.get('end_date', '99999999')
        weekdays = [row.get(x) == '1' for x in ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')]
        for d in dates:
            v = d.strftime('%Y%m%d')
            if start <= v <= end and weekdays[d.weekday()]:
                result[service].add(d)
    for row in modifications:
        service = row.get('service_id')
        try:
            d = datetime.strptime(row.get('date', ''), '%Y%m%d').date()
        except ValueError:
            continue
        if d not in dates:
            continue
        if row.get('exception_type') == '1':
            result[service].add(d)
        elif row.get('exception_type') == '2':
            result[service].discard(d)
    return result

def train_number(trip):
    explicit = str(trip.get('trip_short_name') or '').strip()
    if explicit:
        return explicit
    # This Renfe feed embeds the train number in trip_ids such as 5114X77512R4.
    # Do not guess when a different naming convention is encountered.
    match = re.search(r'(\d{5})R4$', str(trip.get('trip_id') or ''), re.I)
    return match.group(1) if match else ''

def deduplicate(rows):
    """Collapse overlapping GTFS services that advertise the same train at the same time.

    Retain the most recent lexical trip_id as canonical, plus the alternative IDs
    for audit. This ID is NOT independently proven to be the operational trip ID.
    """
    groups = defaultdict(list)
    for row in rows:
        key = (row['route'], row['service_day'], row['from_code'], row['to_code'],
               row['planned_ts'], row['arrival_ts'], row['train_number'])
        groups[key].append(row)
    deduped = []
    for group in groups.values():
        group.sort(key=lambda r: r['trip_id'])
        chosen = group[-1].copy()
        if len(group) > 1:
            chosen['alternative_trip_ids'] = sorted({r['trip_id'] for r in group if r['trip_id'] != chosen['trip_id']})
            chosen['duplicate_services_collapsed'] = len(group)
        deduped.append(chosen)
    deduped.sort(key=lambda r: (r['planned_ts'], r['route'], r['train_number'], r['trip_id']))
    return deduped

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--zip', dest='zip_path', help='Use an already downloaded official GTFS ZIP')
    ap.add_argument('--url', default=OFFICIAL, help='Renfe GTFS ZIP URL')
    ap.add_argument('--output', default='data/schedule-r4.json')
    ap.add_argument('--days', type=int, default=21)
    args = ap.parse_args()
    days = max(1, min(args.days, 35))
    today = datetime.now(TZ).date()
    dates = [today + timedelta(days=i) for i in range(days)]
    if args.zip_path:
        raw = Path(args.zip_path).read_bytes()
    else:
        request = urllib.request.Request(args.url, headers={'User-Agent':'MiRodaliesPWA/1.3 (personal non-commercial GTFS client)'})
        try:
            with urllib.request.urlopen(request, timeout=35) as response:
                raw = response.read(40 * 1024 * 1024)
        except Exception as e:
            sys.exit('No se pudo obtener el GTFS oficial: ' + str(e) + '. No se publicarán datos ficticios.')
    if raw[:2] != b'PK':
        sys.exit('La respuesta no es un ZIP: descartada.')
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        stops = load_txt(z, 'stops.txt')
        trips = load_txt(z, 'trips.txt')
        stop_times = load_txt(z, 'stop_times.txt')
        routes = load_txt(z, 'routes.txt')
        calendar = load_txt(z, 'calendar.txt')
        exceptions = load_txt(z, 'calendar_dates.txt')
    if not stops or not trips or not stop_times:
        sys.exit('GTFS incompleto: faltan archivos obligatorios.')
    stop_map = {r.get('stop_id'): station_code(r) for r in stops}
    target_stops = {key for key, value in stop_map.items() if value}
    if not target_stops:
        sys.exit('GTFS sin estaciones conocidas: se descarta.')
    route_by_id = {r['route_id']: r for r in routes if r.get('route_id')}
    active = service_dates(calendar, exceptions, dates)
    trips_by_id = {t.get('trip_id'): t for t in trips if t.get('trip_id') and active.get(t.get('service_id'))}
    by_trip = defaultdict(list)
    for row in stop_times:
        if row.get('trip_id') not in trips_by_id or row.get('stop_id') not in target_stops:
            continue
        code = stop_map.get(row['stop_id'])
        if code:
            try:
                seq = int(row.get('stop_sequence') or 0)
            except ValueError:
                continue
            by_trip[row['trip_id']].append((seq,code,row))
    rows = []
    for tid, target_list in by_trip.items():
        trip = trips_by_id[tid]
        target_list.sort(key=lambda x: x[0])
        route_data = route_by_id.get(trip.get('route_id'), {})
        designation = simplify(' '.join(str(route_data.get(x) or '') for x in ('route_short_name','route_long_name')))
        # No asumir que cualquier tren que pase por ambas estaciones sea R4.
        # La línea debe estar identificada por la ruta GTFS o por un trip_id terminado en R4.
        designated_r4 = bool(re.search(r'\br\s*4\b', designation))
        trip_named_r4 = bool(re.search(r'R4$', tid, re.IGNORECASE))
        if not (designated_r4 or trip_named_r4):
            continue
        # Rechazar rutas etiquetadas exclusivamente como otra línea.
        if re.search(r'\br\s*(?:1|2|3|5|6|7|8|9|10|11|12|13|14|15|16|17)\b', designation) and not designated_r4:
            continue
        for label, (from_code,to_code) in ROUTES.items():
            for i, (seq,code,departure_row) in enumerate(target_list):
                if code != from_code:
                    continue
                next_stop = next(((s,c,r) for s,c,r in target_list[i+1:] if c==to_code),None)
                if not next_stop:
                    continue
                depart = hms(departure_row.get('departure_time') or departure_row.get('arrival_time'))
                arrive = hms(next_stop[2].get('arrival_time') or next_stop[2].get('departure_time'))
                if depart is None or arrive is None or arrive <= depart:
                    continue
                for service_day in active.get(trip['service_id'], []):
                    planned = datetime.combine(service_day,datetime.min.time(),tzinfo=TZ) + timedelta(seconds=depart)
                    arrival = datetime.combine(service_day,datetime.min.time(),tzinfo=TZ) + timedelta(seconds=arrive)
                    rows.append({
                        'route':label, 'service_day':service_day.isoformat(), 'trip_id':tid,
                        'train_number':train_number(trip), 'product':'R4',
                        'planned_ts':int(planned.timestamp()), 'arrival_ts':int(arrival.timestamp()),
                        'from_code':from_code, 'to_code':to_code,
                        'destination':str(trip.get('trip_headsign') or '').strip()
                    })
                break
    if not rows:
        sys.exit('No hay circulaciones R4 identificables. No se reemplaza el archivo anterior.')
    before = len(rows)
    rows = deduplicate(rows)
    removed = before-len(rows)
    counts = Counter((r['service_day'],r['route']) for r in rows)
    print(f'Duplicados de servicios GTFS solapados: {removed}; salidas únicas: {len(rows)}')
    for day in dates[:3]:
        print(day.isoformat(), 'ida:', counts[(day.isoformat(),'ida')], 'vuelta:', counts[(day.isoformat(),'vuelta')])
    result = {
        'schema':1, 'source':'Renfe Data · GTFS Cercanías/Rodalies',
        'source_url':args.url if not args.zip_path else OFFICIAL,
        'generated_at':datetime.now(TZ).isoformat(),
        'coverage_start':dates[0].isoformat(), 'coverage_end':dates[-1].isoformat(),
        'license':'CC BY 4.0', 'trains':rows,
        'quality':{'original_rows':before, 'overlapping_services_deduplicated':removed}
    }
    output=Path(args.output)
    output.parent.mkdir(parents=True,exist_ok=True)
    tmp=output.with_suffix('.tmp')
    tmp.write_text(json.dumps(result, ensure_ascii=False, separators=(',',':'))+'\n',encoding='utf-8')
    os.replace(tmp,output)
    print(f'Exportadas {len(rows)} salidas oficiales R4, cobertura {dates[0]}–{dates[-1]} → {output}')

if __name__ == '__main__':
    main()
