"""Conservative reference inventory overlay. No synthetic departure times.

An inventory station can lack usable GTFS stop_times. In that case it is
selectable, but the PWA must not treat it as an operating timetable.
"""
import hashlib
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

REFERENCE = Path(__file__).resolve().parents[1] / 'data' / 'reference' / 'network_stations.json'


def normalize(value):
    value = unicodedata.normalize('NFKD', str(value or '').lower())
    return ' '.join(re.sub(r'[^a-z0-9]+', ' ', ''.join(
        c for c in value if not unicodedata.combining(c))).split())


def _unique_index(rows):
    indexed = defaultdict(set)
    for code, values in rows.items():
        for value in values:
            if value and normalize(value):
                indexed[normalize(value)].add(str(code))
    return indexed


def apply_reference(stations, candidates, scheduled_lines, canonical, known_lines):
    """Add network stations by unique *exact* normalized match or verified ID.

    stations: mutable dict keyed by ADIF or GTFS stop code.
    candidates: static GTFS stops not necessarily present in stop_times.
    scheduled_lines: dict station-id -> set(lines) with published calls.
    canonical: verified ADIF code crosswalk (never fuzzy merged).
    """
    document = json.loads(REFERENCE.read_text(encoding='utf-8'))
    if document.get('schema') != 1 or len(document.get('stations', [])) != 200:
        raise ValueError('Inventario de referencia inválido o incompleto')
    if len(set(normalize(s['name']) for s in document['stations'])) != 200:
        raise ValueError('Inventario con nombres de estación duplicados')
    if any(not set(s['lines']) <= set(known_lines) for s in document['stations']):
        raise ValueError('Inventario con líneas desconocidas')

    names = {}
    for code, st in stations.items():
        names[str(code)] = [st.get('name', ''), st.get('gtfs_name', ''),
                            *st.get('aliases', [])]
    for code, st in candidates.items():
        names.setdefault(str(code), []).append(st.get('name', ''))
    for code, data in canonical.items():
        names.setdefault(str(code), []).extend([data.get('display_name', ''),
                                                *data.get('aliases', [])])
    by_name = _unique_index(names)
    unresolved, ambiguous = [], []
    matched = set()
    for reference in document['stations']:
        name = reference['name']
        variants = [name]
        # Naming punctuation differs from GTFS and official ADIF. These are
        # explicit human-reviewed alias equivalents, not fuzzy joins.
        verified = {
            'Barcelona-Torre Baró | Vallbona': 'Barcelona Torre Baró-Vallbona',
            'Bellvitge | Gornal': 'Bellvitge',
            'Cerdanyola-Universitat': 'Cerdanyola Universitat',
            'Salou - Port Aventura': 'Salou - Port Aventura',
            'Montcada Ripollet': 'Montcada-Ripollet',
        }
        if name in verified:
            variants.append(verified[name])
        possible = set()
        for value in variants:
            possible.update(by_name.get(normalize(value), set()))
        # Prefer a code already present in published schedules only if unique;
        # otherwise the station remains a separate, clearly reference-only
        # candidate until an explicit crosswalk is established.
        real = sorted(x for x in possible if x in stations)
        if len(real) == 1:
            code = real[0]
        elif not real and len(possible) == 1:
            code = next(iter(possible))
        else:
            code = 'ref:' + hashlib.sha256(normalize(name).encode('utf-8')).hexdigest()[:16]
            if len(possible) > 1:
                ambiguous.append({'name': name, 'candidate_ids': sorted(possible)})
            else:
                unresolved.append(name)
        if code not in stations:
            candidate = candidates.get(code, {})
            stations[code] = {
                'id': code, 'name': name,
                'lat': candidate.get('lat'), 'lon': candidate.get('lon'),
                'lines': set(), 'reference_only': True,
                'name_source': 'inventario_red'
            }
        item = stations[code]
        item['lines'].update(reference['lines'])
        item['reference_lines'] = sorted(set(item.get('reference_lines', [])) | set(reference['lines']),
                                         key=known_lines.index)
        item['reference_source'] = document['source']
        if item.get('name_source') == 'inventario_red':
            item['name'] = name
        matched.add(normalize(name))

    for code, station in stations.items():
        covered = set(scheduled_lines.get(str(code), set()))
        station['schedule_lines'] = sorted(covered, key=known_lines.index)
        station['reference_only'] = not bool(covered)
    counts = {line: sum(line in st.get('reference_lines', [])
                        for st in stations.values()) for line in known_lines}
    if any(count < 1 for count in counts.values()):
        raise ValueError('Una línea carece de estaciones de referencia')
    return {'source': document['source'], 'checked_on': document['checked_on'],
            'reference_station_count': len(document['stations']),
            'line_station_counts': counts,
            'unresolved_names': unresolved,
            'ambiguous_matches': ambiguous,
            'note': 'Inventario indicativo de red, separado de horarios GTFS y de horarios de paso reales.'}
