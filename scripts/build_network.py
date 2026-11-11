#!/usr/bin/env python3
"""Build a Catalonia-only Rodalies timetable from the official Renfe GTFS archives.

The route identifier MUST explicitly name a Rodalies line. Never infer service
eligibility from its geography, a stop shared with Rodalies, or product 'MD'.
No unverified schedules are generated for lines absent from the official feeds.
Python 3.12+ standard library only. The output is static and publicly reusable
under Renfe Data CC BY 4.0 with attribution.
"""
from __future__ import annotations
import argparse, csv, hashlib, io, json, re, sys, unicodedata, urllib.request, zipfile, traceback
from collections import defaultdict, Counter
from datetime import date, datetime, timedelta, time
from pathlib import Path
from zoneinfo import ZoneInfo

TZ = ZoneInfo('Europe/Madrid')
REFERENCE_FILE = Path(__file__).resolve().parents[1] / 'data' / 'reference' / 'generalitat_lines.json'
STATION_ALIASES_FILE = Path(__file__).resolve().parents[1] / 'data' / 'reference' / 'station_aliases.json'
CERCANIAS = 'https://ssl.renfe.com/ftransit/Fichero_CER_FOMENTO/fomento_transit.zip'
MEDIA_DISTANCIA = 'https://ssl.renfe.com/gtransit/Fichero_AV_LD/google_transit.zip'
LINES = ['R1','R2','R2N','R2S','R3','R4','R7','R8','RG1','RT1','RT2','RL3','RL4','R11','R13','R14','R15','R16','R17']
LINE_NAMES = {'R2N':'R2 Nord','R2S':'R2 Sud','RG1':'RG1','RT1':'RT1','RT2':'RT2','RL3':'RL3','RL4':'RL4'}
REGIONAL = {'R11','R13','R14','R15','R16','R17'}
# Explicit non-Catalan stations sometimes found on cross-border regional trips.
OUTSIDE = {
    'latour de carol enveitg','latour de carol','la tour de carol',
    'la tor de querol','la tor de querol enveig','enveitg','cerbere','cerbere france',
    'vinaros','vinaros castello','benicarlo','benicarlo peniscola',
    'castello de la plana','castellon de la plana','perpinya','perpignan'
}

def norm(s):
    s = unicodedata.normalize('NFKD', str(s or '').lower())
    return ' '.join(re.sub(r'[^a-z0-9]+',' ', ''.join(c for c in s if not unicodedata.combining(c))).split())

def line_id(s):
    """Accept exact public line IDs, never an unrelated number or 'R' substring."""
    s = norm(s).upper().replace(' ', '')
    if s.startswith('RODALIES'): s=s[8:]
    if s in ('R2NORD','R2NORTE'): return 'R2N'
    if s in ('R2SUD','R2SUR'): return 'R2S'
    return s if s in LINES else None

def infer_line(trip, route):
    """Map public Rodalies line identifiers conservatively.

    Renfe may publish the legacy C-designation inside the GTFS for Catalunya.
    Those labels are accepted ONLY when route_id belongs to Catalunya's GTFS
    nucleus 51. Otherwise C4 could mean Cercanias Madrid, Bilbao, etc.
    """
    tid = str(trip.get('trip_id') or '').strip()
    rid = str(route.get('route_id') or trip.get('route_id') or '').strip()
    short = str(route.get('route_short_name') or '').strip()
    designation = norm(' '.join((short, str(route.get('route_long_name') or ''))))
    if re.search(r'\b(ave|avant|alvia|euromed|intercity|larga distancia|ld)\b', designation):
        return None
    # Explicit public Rodalies label has priority. A numeric route id by itself
    # is not a commercial line identifier and must never be interpreted as one.
    explicit = line_id(short)
    if explicit:
        return explicit
    # Public GTFS may contain "R4 Manresa - St Vicenc" in a descriptive field.
    # Accept only an isolated initial line token, not R4 embedded in free text.
    for value in (str(route.get('route_long_name') or ''),):
        match = re.match(r'^\s*(R2\s*(?:NORD|SUD)|R(?:G1|T1|T2|L3|L4|1[134567]|[123478]))\b', value, flags=re.I)
        if match and (label := line_id(match.group(1))):
            return label
    # The old Cercanias GTFS sometimes puts the public R4 label in trip_id.
    suffix = re.search(r'(R2N|R2S|RG1|RT1|RT2|RL3|RL4|R1[134567]|R[123478])$', tid, flags=re.I)
    if suffix:
        return line_id(suffix.group(1))
    for value in (rid, str(trip.get('route_id') or '')):
        if (candidate := line_id(value)):
            return candidate
    # Legacy C-series labels can be ambiguous across Spain. GTFS nucleus 51
    # identifies Rodalies Catalunya, confirmed independently via route_id.
    if re.match(r'^51\d', rid):
        legacy = norm(short).upper().replace(' ', '')
        # C2 branches cannot safely be assigned to R2 Nord/Sud without a
        # verified official line mapping, so leave branch-specific ambiguity.
        legacy_map = {'C1':'R1', 'C2':'R2', 'C3':'R3', 'C4':'R4', 'C7':'R7', 'C8':'R8'}
        return legacy_map.get(legacy)
    return None

def txt(z,name):
    files=[f for f in z.namelist() if f.lower().split('/')[-1]==name]
    if not files: raise ValueError(f'GTFS missing {name}')
    return io.TextIOWrapper(z.open(files[0]),encoding='utf-8-sig',errors='replace',newline='')

def normalized_csv_rows(stream):
    """Strip whitespace around CSV header names; Renfe pads end_date heavily."""
    reader = csv.DictReader(stream)
    if reader.fieldnames is None:
        return reader
    names = [name.strip() if name is not None else name for name in reader.fieldnames]
    if len(names) != len(set(names)):
        raise ValueError('GTFS con columnas duplicadas tras normalizar encabezados')
    reader.fieldnames = names
    return reader

def load(z,name):
    with txt(z,name) as f: return list(normalized_csv_rows(f))

def load_optional(z,name):
    try:return load(z,name)
    except ValueError:return []

def hms(s):
    try:
        parts=[int(x) for x in str(s).split(':')]
        if len(parts)==3 and 0<=parts[0]<48 and 0<=parts[1]<60 and 0<=parts[2]<60:return parts[0]*3600+parts[1]*60+parts[2]
    except (TypeError,ValueError):pass
    return None

def as_ts(d,secs):
    return int((datetime.combine(d,time.min,tzinfo=TZ)+timedelta(seconds=secs)).timestamp())


def parse_gtfs_date(value):
    """Accept GTFS YYYYMMDD or ISO date with explicit validity."""
    raw = str(value or '').strip()
    if not raw:
        return None
    try:
        if re.fullmatch(r'\d{8}', raw):
            return datetime.strptime(raw, '%Y%m%d').date()
        if re.fullmatch(r'\d{4}-\d{2}-\d{2}', raw):
            return date.fromisoformat(raw)
    except ValueError:
        return None
    return None


def service_days(calendar, exceptions, dates):
    """Apply dated weekly calendars followed by explicit additions/removals.

    Missing or malformed bounds never imply unrestricted service validity.
    """
    days = defaultdict(set)
    requested = set(dates)
    week = ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')
    for r in calendar:
        sid = str(r.get('service_id') or '').strip()
        start = parse_gtfs_date(r.get('start_date'))
        end = parse_gtfs_date(r.get('end_date'))
        if not sid or start is None or end is None or end < start:
            continue
        enabled = [str(r.get(w) or '').strip() == '1' for w in week]
        for d in dates:
            if start <= d <= end and enabled[d.weekday()]:
                days[sid].add(d)
    for r in exceptions:
        sid = str(r.get('service_id') or '').strip()
        d = parse_gtfs_date(r.get('date'))
        if not sid or d not in requested:
            continue
        kind = str(r.get('exception_type') or '').strip()
        if kind == '1':
            days[sid].add(d)
        elif kind == '2':
            days[sid].discard(d)
    return days


def calendar_diagnostic(calendar, exceptions, trips, dates, source):
    """Report actual GTFS calendar columns, ranges and service coverage."""
    starts, ends = [], []
    missing, invalid, overlaps = 0, 0, 0
    for r in calendar:
        raw_start = str(r.get('start_date') or '').strip()
        raw_end = str(r.get('end_date') or '').strip()
        if not raw_start or not raw_end:
            missing += 1
            continue
        a, b = parse_gtfs_date(raw_start), parse_gtfs_date(raw_end)
        if a is None or b is None or b < a:
            invalid += 1
            continue
        starts.append(a)
        ends.append(b)
        if a <= dates[-1] and b >= dates[0]:
            overlaps += 1
    exception_dates = [d for r in exceptions if (d := parse_gtfs_date(r.get('date'))) is not None]
    declared_ids = {str(r.get('service_id') or '').strip() for r in calendar + exceptions}
    trip_ids = {str(t.get('service_id') or '').strip() for t in trips}
    samples = [{k: r.get(k) for k in ('service_id','start_date','end_date',
                                      'monday','wednesday','sunday')} for r in calendar[:2]]
    print('DIAGNOSTICO CALENDARIO', source,
          'ventana='+str(dates[0])+'..'+str(dates[-1]),
          'campos='+repr(list(calendar[0].keys()) if calendar else []),
          'filas='+str(len(calendar)),
          'sin_fechas='+str(missing),
          'fechas_invalidas='+str(invalid),
          'periodos_solapados='+str(overlaps),
          'rango_inicio='+str(min(starts) if starts else None)+'..'+str(max(starts) if starts else None),
          'rango_fin='+str(min(ends) if ends else None)+'..'+str(max(ends) if ends else None),
          'excepciones='+str(len(exceptions)),
          'rango_excepciones='+str(min(exception_dates) if exception_dates else None)+'..'+str(max(exception_dates) if exception_dates else None),
          'service_ids_en_trips='+str(len(declared_ids & trip_ids)),
          'muestra='+repr(samples),flush=True)
    if not overlaps and not any(d in set(dates) for d in exception_dates):
        print('ALERTA CALENDARIO',source,
              'No se han encontrado calendarios que cubran las fechas solicitadas; '
              'no se presuponen circulaciones.',flush=True)


def stop_key(s):
    """Prefer 5-digit ADIF codes; retain other numeric GTFS ids when legitimate."""
    sid=str(s or '').strip()
    m=re.search(r'(?<!\d)(\d{5})(?!\d)',sid)
    return m.group(1) if m else sid

def in_catalonia(stop):
    name=norm(stop.get('stop_name'))
    if any(x==name or name.startswith(x+' ') for x in OUTSIDE):return False
    try:
        lat=float(stop.get('stop_lat'));lon=float(stop.get('stop_lon'))
    except (TypeError,ValueError):return True # only allowed when service itself is verified
    return 40.45<=lat<=42.90 and 0.05<=lon<=3.55

def number(trip):
    short=str(trip.get('trip_short_name') or '').strip()
    if re.fullmatch(r'\d{3,6}',short):return short
    tid=str(trip.get('trip_id') or '')
    m=re.search(r'(\d{5})(?:R2N|R2S|RG1|RT1|RT2|RL3|RL4|R1[134567]|R[123478])$',tid,re.I)
    return m.group(1) if m else ''

def official_reference():
    """Curated from Generalitat line information; does not claim a full station list."""
    data=json.loads(REFERENCE_FILE.read_text(encoding='utf-8'))
    if data.get('schema')!=1:raise ValueError('Formato de referencia Generalitat no compatible')
    ids=[x['id'] for x in data['lines']]
    if len(ids)!=len(LINES) or set(ids)!=set(LINES) or len(ids)!=len(set(ids)):
        raise ValueError('Referencia oficial: cobertura de líneas incoherente')
    return data

def canonical_station_names():
    """Only exact ADIF identifiers may change display labels. Never merge by name alone."""
    data=json.loads(STATION_ALIASES_FILE.read_text(encoding='utf-8'))
    if data.get('schema')!=1:raise ValueError('Esquema de equivalencias de estaciones desconocido')
    verified={}
    for item in data['stations']:
        code=item['adif_code']
        if not re.fullmatch(r'\d{5}',code) or code in verified:
            raise ValueError('Código ADIF duplicado o inválido: '+code)
        verified[code]=item
    return verified

def validate_official_reference(reference, stations, lines):
    """Cross-check checkpoints using verified ADIF IDs, then explicit names/aliases.

    Fuzzy names produce only suggestions, never automatic matches or new services.
    Records must belong to the SAME requested line. Missing stops are not closures.
    """
    from difflib import SequenceMatcher
    by_line=defaultdict(list)
    for stop in stations:
        for line in stop['lines']:by_line[line].append(stop)
    live={x['id']:x for x in lines}
    checks=[];warnings=[]
    for entry in reference['lines']:
        line=entry['id'];running=live[line]['present'];stops=by_line[line]
        matched=[];unmatched=[];suggestions={}
        for check in entry.get('checkpoints',[]):
            code=check.get('adif_code')
            valid={norm(v) for v in [check['name'],*check.get('aliases',[])]}
            found=next((s for s in stops if str(s['id'])==str(code)),None) if code else None
            method='codigo_adif' if found else None
            # If a code is known, do NOT replace it with a plausible but different
            # station ID: even near-identical names may refer to distinct stations.
            if found is None and not code:
                found=next((s for s in stops if norm(s['name']) in valid or
                            any(norm(a) in valid for a in s.get('aliases',[]))),None)
                method='nombre_exacto' if found else None
            if found:
                matched.append({'reference':check['name'],'station_id':found['id'],
                                'gtfs_name':found.get('gtfs_name') or found['name'],
                                'display_name':found['name'],'match_method':method})
            else:
                unmatched.append(check['name'])
                # Research candidates only; never show as a validated equivalence.
                scored=[]
                for st in stops:
                    names=[st['name'],st.get('gtfs_name',''),*st.get('aliases',[])]
                    sim=max(SequenceMatcher(None,norm(check['name']),norm(n)).ratio() for n in names if n)
                    if sim>=0.78:scored.append((sim,st))
                if scored:
                    suggestions[check['name']]=[{'id':p['id'],'name':p['name'],
                         'similarity':round(score,2),'verified':False}
                         for score,p in sorted(scored,key=lambda z:z[0],reverse=True)[:3]]
        if not running:status='sin_horarios_publicados'
        elif unmatched:status='pendiente_contraste'
        else:status='controles_localizados'
        checks.append({'id':line,'area':entry['area'],'corridor':entry['corridor'],
                       'url':entry['url'],'status':status,
                       'scheduled_trips':live[line]['scheduled_trips_in_period'],
                       'gtfs_station_count':len(stops),
                       'reference_checkpoints':len(entry.get('checkpoints',[])),
                       'matched':matched,'not_found_in_gtfs':unmatched,
                       'unverified_name_suggestions':suggestions})
        if running and unmatched:
            warnings.append(f'{line}: {len(unmatched)} puntos sin concordancia de código/nombre ('+
                            ', '.join(unmatched)+') — revisar cambio de nombre o cobertura del servicio')
    return {'source':reference['source_index'],
            'method':'ADIF ID verificado > nombres y alias exactos > sugerencias de revisión; NO exhaustivo',
            'lines':checks,'warnings':warnings}

def download(url,max_mb=75):
    request=urllib.request.Request(url,headers={'User-Agent':'MiRodalies/2.0 (+GTFS public data CC BY 4.0)'})
    with urllib.request.urlopen(request,timeout=75) as response: raw=response.read(max_mb*1024*1024+1)
    if len(raw)>max_mb*1024*1024:raise ValueError('GTFS too large')
    if not raw.startswith(b'PK'):raise ValueError('GTFS source did not return ZIP')
    return raw

def parse_archive(raw,source,dates):
    records=[]
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        routes={r.get('route_id'):r for r in load(z,'routes.txt')}
        trips=load(z,'trips.txt')
        calendar=load_optional(z,'calendar.txt')
        exceptions=load_optional(z,'calendar_dates.txt')
        calendar_diagnostic(calendar,exceptions,trips,dates,source)
        services=service_days(calendar,exceptions,dates)
        selected={}; all_recognized={}
        route_preview=[]
        for rid,r in list(routes.items())[:7]:
            route_preview.append(f"{rid!r}:{r.get('route_short_name','')!r}")
        print(f"DIAGNOSTICO {source}: {len(routes)} rutas, {len(trips)} viajes, "
              f"{len(calendar)} filas calendar, {len(exceptions)} excepciones, "
              f"{sum(bool(v) for v in services.values())} service_id activos. "
              f"Ejemplos de rutas: {route_preview}", flush=True)
        for t in trips:
            label=infer_line(t,routes.get(t.get('route_id'),{}))
            if label:
                all_recognized[t['trip_id']]=label
                if services.get(t.get('service_id')):
                    selected[t['trip_id']]=(t,label,services[t['service_id']])
        print(f"DIAGNOSTICO {source}: {len(all_recognized)} viajes con línea identificada, "
              f"{len(selected)} viajes activos en las fechas solicitadas, "
              f"ejemplos de trip_id: {[t['trip_id'] for t in trips[:3]]}", flush=True)
        stops_raw=load(z,'stops.txt')
        stop_index={str(r.get('stop_id')):r for r in stops_raw if r.get('stop_id')}
        # Resolve platform -> parent station when the parent is present; avoid
        # having different platforms masquerading as different interchange stations.
        def canonical(sid):
            s=stop_index.get(sid,{})
            parent=s.get('parent_station')
            if parent in stop_index:
                return stop_key(parent),stop_index[parent]
            return stop_key(sid),s
        by_trip=defaultdict(list);catalog_candidates={}
        with txt(z,'stop_times.txt') as f:
            for r in normalized_csv_rows(f):
                tid=r.get('trip_id')
                if tid not in all_recognized:continue
                sid=r.get('stop_id')
                if sid not in stop_index:continue
                code,stop=canonical(sid)
                if not in_catalonia(stop):continue
                if code not in catalog_candidates:
                    catalog_candidates[code]={'name':stop.get('stop_name','').strip(),'lat':stop.get('stop_lat',''),'lon':stop.get('stop_lon',''),'lines':set()}
                catalog_candidates[code]['lines'].add(all_recognized[tid])
                if tid not in selected:continue
                a=hms(r.get('arrival_time'));d=hms(r.get('departure_time'))
                if a is None and d is None:continue
                a=a if a is not None else d;d=d if d is not None else a
                try:seq=int(r.get('stop_sequence',0))
                except ValueError:continue
                by_trip[tid].append((seq,code,stop,a,d))
        print(f"DIAGNOSTICO {source}: {len(by_trip)} viajes activos con paradas procesables, "
              f"{len(catalog_candidates)} paradas candidatas", flush=True)
        for tid,stops in by_trip.items():
            if len(stops)<2:continue
            trip,label,days=selected[tid]
            stops.sort(key=lambda x:x[0])
            # Skip invalid order, duplicate station calls or truncated itineraries.
            if any(stops[i][3]<stops[i-1][4] for i in range(1,len(stops))):continue
            clean=[]
            for _,code,stop,a,d in stops:
                if clean and clean[-1][0]==code and clean[-1][2]==a:continue
                clean.append((code,stop,a,d))
            if len(clean)<2:continue
            head=(trip.get('trip_headsign') or '').strip()
            for day in days:
                ss=[[code,as_ts(day,a),as_ts(day,d)] for code,_,a,d in clean]
                if ss[-1][1]<=ss[0][2]:continue
                records.append({'id':tid,'n':number(trip),'l':label,'dest':head or clean[-1][1].get('stop_name') or '',
                                'src':source,'day':day.isoformat(),'s':ss,
                                'stations':{code:{'name':stop.get('stop_name','').strip(),
                                    'lat':stop.get('stop_lat',''),'lon':stop.get('stop_lon','')} for code,stop,_,_ in clean}})
    print(f"DIAGNOSTICO {source}: {len(records)} instancias de tren generadas", flush=True)
    return records,catalog_candidates

def dedupe(records):
    """One train per route, service date, origin, departure, destination and number.
    Select the fullest stop pattern among overlapping official service instances.
    """
    unique={}
    for r in records:
        stops=r['s']
        key=(r['day'],r['l'],r['n'],stops[0][0],stops[0][2],stops[-1][0],stops[-1][1])
        old=unique.get(key)
        if not old or len(stops)>len(old['s']) or (len(stops)==len(old['s']) and r['id']>old['id']):unique[key]=r
    return list(unique.values())

def build(cer,md,output,days,base=None):
    base=base or datetime.now(TZ).date()
    # Include the previous service day for GTFS trips with 24:xx–29:xx times.
    dates=[base-timedelta(days=1)]+[base+timedelta(days=i) for i in range(days)]
    results=[]; errors=[]; static_catalog={}
    for source,raw in [('cer',cer),('md',md)]:
        if raw is None:errors.append(f'{source}: fuente no disponible');continue
        try:
            found,candidates=parse_archive(raw,source,dates)
            results.extend(found)
            for code,stop in candidates.items():
                if code not in static_catalog:static_catalog[code]=stop
                else:static_catalog[code]['lines'].update(stop['lines'])
        except Exception as ex:
            errors.append(f'{source}: {type(ex).__name__}: {ex}')
            print(f"ERROR DE PARSEO {source}: {type(ex).__name__}: {ex}",file=sys.stderr,flush=True)
            traceback.print_exc(file=sys.stderr)
    if not results:
        raise ValueError('No se han generado recorridos Rodalies. ' +
                         ' ; '.join(errors) +
                         '. Revisar las líneas DIAGNOSTICO del job: rutas, '
                         'viajes reconocidos, calendario, paradas y errores de parseo. ' +
                         'No se publican datos ficticios.')
    rows=dedupe(results)
    stations={};by_day=defaultdict(list);by_line=Counter()
    for code,stop in static_catalog.items():
        stations[code]={'id':code,'name':stop['name'] or code,'lat':float(stop['lat']) if stop['lat'] else None,'lon':float(stop['lon']) if stop['lon'] else None,'lines':set(stop['lines'])}
    # Canonical public names and historical aliases: exact ADIF code only.
    canonical_names=canonical_station_names()
    for code,st in stations.items():
        if code in canonical_names:
            official=canonical_names[code]
            st['gtfs_name']=st['name'];st['name']=official['display_name']
            st['aliases']=sorted(set([*official.get('aliases',[]),st['gtfs_name']]))
            st['name_source']='ADIF/BOE';st['name_sources']=official.get('sources',[])
    for row in rows:
        by_line[row['l']]+=1
        for code,stop in row.pop('stations').items():
            if code not in stations or (not stations[code]['name'] and stop['name']):
                lat=stop['lat'];lon=stop['lon']
                stations[code]={'id':code,'name':stop['name'] or code,'lat':float(lat) if lat else None,'lon':float(lon) if lon else None,'lines':set()}
            stations[code]['lines'].add(row['l'])
        by_day[row.pop('day')].append(row)
    for code,st in stations.items():
        if code in canonical_names and st.get('name_source')!='ADIF/BOE':
            official=canonical_names[code];st['gtfs_name']=st['name'];st['name']=official['display_name']
            st['aliases']=sorted(set([*official.get('aliases',[]),st['gtfs_name']]))
            st['name_source']='ADIF/BOE';st['name_sources']=official.get('sources',[])
    out=Path(output);out.mkdir(parents=True,exist_ok=True)
    for existing in out.glob('20??-??-??.json'):existing.unlink()
    for d in dates:
        daily=sorted(by_day[d.isoformat()],key=lambda r:r['s'][0][2])
        (out/f'{d.isoformat()}.json').write_text(json.dumps({'schema':2,'day':d.isoformat(),'trains':daily},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    reference=official_reference()
    audit=validate_official_reference(reference,[dict(st,lines=list(st['lines'])) for st in stations.values()],
                                     [{'id':line,'present':by_line[line]>0,'scheduled_trips_in_period':by_line[line]} for line in LINES])
    catalog={
       'schema':2,'generated_at':datetime.now(TZ).isoformat(),
       'coverage_start':base.isoformat(),'coverage_end':dates[-1].isoformat(),
       'source':'Renfe Data GTFS oficial (Cercanías; MD solo con línea Rodalies explícita)',
       'station_names':'ADIF/BOE verified code crosswalk; GTFS as fallback; exact match only',
       'source_urls':{'cer':CERCANIAS,'md':MEDIA_DISTANCIA},'license':'CC BY 4.0',
       'official_reference':audit,
       'lines':[{'id':line,'name':LINE_NAMES.get(line,line),'present':by_line[line]>0,
                 'scheduled_trips_in_period':by_line[line]} for line in LINES],
       'stations':sorted([dict(r,lines=sorted(r['lines'],key=lambda x:LINES.index(x))) for r in stations.values()],key=lambda x:norm(x['name'])),
       'warnings':errors+([f'GTFS sin servicios identificables de las líneas: {", ".join(l for l in LINES if by_line[l]==0)}'] if any(by_line[l]==0 for l in LINES) else [])+audit['warnings']
    }
    (out/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    print('GTFS V2:',len(rows),'recorridos únicos,',len(stations),'estaciones,',len([x for x in LINES if by_line[x]]),'de',len(LINES),'líneas. Periodo:',base,dates[-1], '(incluye día previo para horarios 24:xx)');print('Líneas:',dict(by_line))
    for msg in errors:print('ADVERTENCIA',msg)
    print('Referencia Generalitat:',sum(x['status']=='controles_localizados' for x in audit['lines']),'líneas con puntos de control localizados;',sum(x['status']=='pendiente_contraste' for x in audit['lines']),'pendientes de contraste;',sum(x['status']=='sin_horarios_publicados' for x in audit['lines']),'sin horarios.')
    if catalog['warnings']:print('Cobertura incompleta:',catalog['warnings'])
    return catalog

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--cer-zip');ap.add_argument('--md-zip');ap.add_argument('--skip-md',action='store_true');ap.add_argument('--out',default='data/v2');ap.add_argument('--days',type=int,default=14);ap.add_argument('--date',help='YYYY-MM-DD for repeatable tests')
    args=ap.parse_args();days=max(1,min(args.days,28))
    cer=Path(args.cer_zip).read_bytes() if args.cer_zip else download(CERCANIAS)
    if args.skip_md:md=None
    else:
        try:md=Path(args.md_zip).read_bytes() if args.md_zip else download(MEDIA_DISTANCIA)
        except Exception as e:print('AVISO GTFS MD inaccesible:',e);md=None
    base=date.fromisoformat(args.date) if args.date else None
    build(cer,md,args.out,days,base)
if __name__=='__main__':main()
