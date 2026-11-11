#!/usr/bin/env python3
"""Cross-check station labels against official Rodalies timetable PDF texts.

This is an *audit* not a timetable parser. A station name in a PDF does not
prove that every train stops there, and no PDF time is imported automatically.
"""
import json
import re
import unicodedata
import urllib.request
from collections import defaultdict
from pathlib import Path

import fitz

ROOT=Path(__file__).resolve().parents[1]
REFERENCE=json.loads((ROOT/'data/reference/generalitat_lines.json').read_text('utf-8'))
STATIONS=json.loads((ROOT/'data/reference/network_stations.json').read_text('utf-8'))


def norm(value):
    s=unicodedata.normalize('NFKD',str(value).lower())
    s=''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9]+',' ',s)).strip()


def download(url):
    request=urllib.request.Request(url,headers={'User-Agent':'MiRodalies/2.1 PDF verification (non-commercial)'})
    with urllib.request.urlopen(request,timeout=45) as resp:
        if resp.status!=200:raise ValueError('HTTP status '+str(resp.status))
        raw=resp.read(15_000_001)
    if not raw.startswith(b'%PDF') or len(raw)>15_000_000:raise ValueError('PDF incorrecto')
    return raw


def audit():
    documents={}
    for entry in REFERENCE['lines']:
        url=entry.get('timetable_pdf')
        if not url:raise ValueError('Sin referencia de PDF para '+entry['id'])
        if url in documents:continue
        doc=fitz.open(stream=download(url),filetype='pdf')
        texts=[page.get_text() for page in doc]
        documents[url]={'pages':len(texts),'normalized_text':norm(' '.join(texts)),
                        'text_characters':sum(len(s) for s in texts)}
        if not documents[url]['text_characters']:raise ValueError('PDF sin texto '+url)
    lines=[]
    for entry in REFERENCE['lines']:
        lid=entry['id'];doc=documents[entry['timetable_pdf']]
        matched,unknown=[],[]
        for station in STATIONS['stations']:
            if lid not in station['lines']:continue
            names=[station['name']]
            # Explicit abbreviations are verification hints, not automatic ID matches.
            if station['name'].startswith('Barcelona-'):
                names.append(station['name'].replace('Barcelona-','Barcelona '))
            candidates=[norm(x) for x in names]
            yes=any(bool(re.search(r'(?<![a-z0-9])'+re.escape(x)+r'(?![a-z0-9])',
                                   doc['normalized_text'])) for x in candidates if x)
            (matched if yes else unknown).append(station['name'])
        lines.append({'line':lid,'pdf':entry['timetable_pdf'],
                      'pages':doc['pages'],'text_characters':doc['text_characters'],
                      'inventory_station_count':len(matched)+len(unknown),
                      'names_found_in_pdf_text':len(matched),
                      'names_not_found_by_exact_text':unknown,
                      'warning':'Solo coincidencia textual; no verifica horarios por estación, servicio ni fecha.'})
    return {'schema':1,'documents':len(documents),'lines':lines,
            'caveat':'Los PDF incluyen calendarios y servicios alternativos. La extracción de texto no valida toda la matriz de horarios ni puede sustituir una auditoría de celdas.'}


def main():
    result=audit()
    Path('official-pdf-station-audit.json').write_text(
        json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    for line in result['lines']:
        print(f"{line['line']:4s} PDF {line['pages']} paginas; "
              f"nombres {line['names_found_in_pdf_text']}/"
              f"{line['inventory_station_count']} "
              f"sin_coincidencia={line['names_not_found_by_exact_text']}")
    print('Informes:',result['documents'],'PDF y',len(result['lines']),'líneas')


if __name__=='__main__':
    main()
