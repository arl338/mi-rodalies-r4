#!/usr/bin/env python3
"""Generate a compact R4 timetable from the official Renfe Cercanías GTFS.

Usage:
  python scripts/build_gtfs.py --zip /path/to/fomento_transit.zip
  python scripts/build_gtfs.py

Only planned trips are exported. GTFS is not evidence of current operations.
Requires Python 3.10+, stdlib only. Output is explicitly day-scoped.
"""
from __future__ import annotations
import argparse, csv, io, json, os, re, sys, unicodedata, urllib.request, zipfile
from collections import defaultdict
from datetime import date, datetime, timedelta
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
    if not matches: return []
    with z.open(matches[0]) as stream:
        data = stream.read().decode('utf-8-sig', errors='replace')
    return list(csv.DictReader(io.StringIO(data)))


def station_code(stop):
    stop_id = str(stop.get('stop_id') or '')
    name = simplify(stop.get('stop_name'))
    for code, aliases in STATION_NAMES.items():
        if re.search(rf'(?<!\d){code}(?!\d)', stop_id): return code
        if name in [simplify(x) for x in aliases] or name.startswith(tuple(simplify(x) + ' ' for x in aliases)):
            return code
    return None


def hms(s):
    try:
        bits = str(s).strip().split(':')
        if len(bits) != 3: return None
        h, m, sec = [int(x) for x in bits]
        if 0 <= h <= 48 and 0 <= m <= 59 and 0 <= sec <= 59: return h * 3600 + m * 60 + sec
    except (ValueError, TypeError): pass
    return None


def service_dates(services, modifications, dates):
    result = defaultdict(set)
    for row in services:
        service = row.get('service_id')
        if not service: continue
        start = row.get('start_date', '00000000')
        end = row.get('end_date', '99999999')
        weekdays = [row.get(x) == '1' for x in ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')]
        for d in dates:
            v = d.strftime('%Y%m%d')
            if start <= v <= end and weekdays[d.weekday()]: result[service].add(d)
    for row in modifications:
        service = row.get('service_id')
        try: d = datetime.strptime(row.get('date',''), '%Y%m%d').date()
        except ValueError: continue
        if d not in dates: continue
        if row.get('exception_type') == '1': result[service].add(d)
        elif row.get('exception_type') == '2': result[service].discard(d)
    return result


def code_or_none(s):
    if not s: return None
    m = re.search(r'\d{5}', str(s))
    return m.group(0) if m else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--zip', dest='zip_path', help='Use an already-downloaded official GTFS ZIP')
    ap.add_argument('--url', default=OFFICIAL, help='Renfe GTFS ZIP URL')
    ap.add_argument('--output', default='data/schedule-r4.json')
    ap.add_argument('--days', type=int, default=21)
    args = ap.parse_args()
    days = max(1, min(args.days, 35))
    today = datetime.now(TZ).date()
    dates = [today + timedelta(days=i) for i in range(days)]
    if args.zip_path: raw = Path(args.zip_path).read_bytes()
    else:
        req = urllib.request.Request(args.url, headers={'User-Agent': 'MiRodaliesPWA/1.3 (personal non-commercial GTFS client)'})
        try:
            with urllib.request.urlopen(req, timeout=35) as response: raw = response.read(40 * 1024 * 1024)
        except Exception as e:
            sys.exit('No se pudo obtener GTFS oficial: ' + str(e) + '. No se publicarán datos ficticios.')
    if raw[:2] != b'PK': sys.exit('Respuesta no ZIP: se descarta.')
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        stops = load_txt(z, 'stops.txt')
        trips = load_txt(z, 'trips.txt')
        stop_times = load_txt(z, 'stop_times.txt')
        routes = load_txt(z, 'routes.txt')
        calendar = load_txt(z, 'calendar.txt')
        exceptions = load_txt(z, 'calendar_dates.txt')
    if not stops or not trips or not stop_times: sys.exit('GTFS incompleto: faltan archivos obligatorios.')
    stop_map = {r.get('stop_id'):station_code(r) for r in stops}
    target_stops = {k for k, v in stop_map.items() if v}
    if not target_stops: sys.exit('GTFS no contiene las estaciones conocidas: se descarta.')
    route_by_id = {r['route_id']: r for r in routes if r.get('route_id')}
    active = service_dates(calendar, exceptions, dates)
    # Some feeds only publish calendar_dates; a fully absent calendar is not a reason to assume daily service.
    trips_by_id = {t.get('trip_id'):t for t in trips if t.get('trip_id') and active.get(t.get('service_id'))}
    stop_times_by_trip = defaultdict(list)
    for row in stop_times:
        if row.get('trip_id') in trips_by_id and row.get('stop_id') in target_stops:
            code = stop_map.get(row['stop_id'])
            if code: stop_times_by_trip[row['trip_id']].append((int(row.get('stop_sequence') or 0), code, row))
    rows = []
    for tid, target_list in stop_times_by_trip.items():
        trip = trips_by_id[tid]
        target_list.sort(key=lambda x:x[0])
        route_data = route_by_id.get(trip.get('route_id'), {})
        designation = simplify(' '.join(str(route_data.get(x) or '') for x in ('route_short_name','route_long_name')))
        # If the GTFS has named R4 routes, prefer them, but accept correctly ordered station pairs
        # only when no conflicting explicitly named line is present.
        if re.search(r'\br\s*[1235789]\b',designation) and not re.search(r'\br\s*4\b',designation):continue
        for label, (from_code, to_code) in ROUTES.items():
            for i,(seq,code,dep_row) in enumerate(target_list):
                if code != from_code:continue
                latter = next(((s,c,r) for s,c,r in target_list[i+1:] if c==to_code), None)
                if not latter:continue
                departure = hms(dep_row.get('departure_time') or dep_row.get('arrival_time'))
                arrival = hms(latter[2].get('arrival_time') or latter[2].get('departure_time'))
                if departure is None or arrival is None or arrival <= departure:continue
                number = str(trip.get('trip_short_name') or '').strip()
                for service_day in active.get(trip['service_id'],[]):
                    origin_time = datetime.combine(service_day, datetime.min.time(),tzinfo=TZ) + timedelta(seconds=departure)
                    arrival_time = datetime.combine(service_day, datetime.min.time(),tzinfo=TZ) + timedelta(seconds=arrival)
                    rows.append({'route':label,'service_day':service_day.isoformat(), 'trip_id':tid,
                        'train_number':number,'product':'R4', 'planned_ts':int(origin_time.timestamp()),
                        'arrival_ts':int(arrival_time.timestamp()),'from_code':from_code,'to_code':to_code,
                        'destination': trip.get('trip_headsign') or 'R4'})
                break
    rows.sort(key=lambda x:(x['planned_ts'],x['route'],x['trip_id']))
    if not rows:sys.exit('No hay circulaciones R4 identificables para las fechas válidas. No se reemplaza el archivo previo.')
    result={'schema':1,'source':'Renfe Data · GTFS Cercanías/Rodalies','source_url':args.url if not args.zip_path else OFFICIAL,
            'generated_at':datetime.now(TZ).isoformat(),'coverage_start':dates[0].isoformat(),
            'coverage_end':dates[-1].isoformat(),'license':'CC BY 4.0','trains':rows}
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    tmp = output.with_suffix('.tmp')
    tmp.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    os.replace(tmp, output)
    print(f'Exportadas {len(rows)} salidas oficiales R4, cobertura {dates[0]}–{dates[-1]} → {output}')

if __name__=='__main__': main()
