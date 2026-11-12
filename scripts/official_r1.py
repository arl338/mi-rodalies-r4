"""Verified schedule-only R1 service enrichment from current Rodalies PDF.

The R1 PDF contains 27 station columns L'Hospitalet <-> Maçanet.
All 123 R1 GTFS instances on 2026-11-12 independently matched >=2 PDF
station/time cells. Only directly observed official cells are imported.
No scheduled trains are invented between Molins de Rei and L'Hospitalet.
"""
from __future__ import annotations
import json
from datetime import datetime,time,timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

REFERENCE=Path(__file__).resolve().parents[1]/'data/reference/r1_official_timetable.json'
SOURCE='https://rodalies.gencat.cat/web/.content/02_Horaris/horaris/R1.pdf'
TZ=ZoneInfo('Europe/Madrid')
WESTERN_EXTENSION={'72300','72301','72302','72303'}

def load_reference(path=REFERENCE):
    doc=json.loads(Path(path).read_text(encoding='utf8'))
    if doc.get('schema')!=1 or doc.get('line')!='R1' or doc.get('source')!=SOURCE:
        raise ValueError('Invalid official R1 timetable document')
    expected={('weekday','east'):95,('weekday','west'):95,
              ('weekend','east'):69,('weekend','west'):69}
    counts={key:0 for key in expected}
    ids=set()
    for service in doc.get('services',[]):
        key=(service['calendar'],service['direction'])
        if key not in expected:raise ValueError('Unverified R1 direction/calendar')
        stops=service['stops']
        if len(stops)<2 or any(not isinstance(m,int) or not 0<=m<1800 for _,m in stops):
            raise ValueError('Invalid R1 PDF time cell')
        if any(stops[i][1]<stops[i-1][1] for i in range(1,len(stops))):
            raise ValueError('Invalid R1 PDF chronology')
        if len(set(x[0] for x in stops))!=len(stops):
            raise ValueError('Repeated station in one R1 service')
        if any(code in WESTERN_EXTENSION for code,_ in stops):
            raise ValueError('PDF does not document Molins/Cornella segment')
        if service['id'] in ids:raise ValueError('Duplicate service ID')
        ids.add(service['id']);counts[key]+=1
    if counts!=expected:raise ValueError('R1 PDF changed, re-extraction and independent validation required')
    return doc

def materialize_day(day,ref):
    cal='weekend' if day.weekday()>=5 else 'weekday'
    anchor=datetime.combine(day,time.min,tzinfo=TZ)
    result=[]
    for service in ref['services']:
        if service['calendar']!=cal:continue
        stops=[[code,int((anchor+timedelta(minutes=minute)).timestamp()),
                int((anchor+timedelta(minutes=minute)).timestamp())] for code,minute in service['stops']]
        result.append({'id':service['id']+'-'+day.isoformat(),'n':'','l':'R1',
                       'src':'official-r1-pdf','dest':stops[-1][0],'s':stops})
    return result

def same_service(pdf,gtfs):
    """Two exact independent station/time cells, same line and stop order.
    Never suppress a train one minute before or after another one.
    """
    if gtfs.get('l')!='R1':return False
    stamps={s[0]:s[2] for s in pdf['s']}
    consecutive=[s for s in gtfs.get('s',[]) if s[0] in stamps and s[2]==stamps[s[0]]]
    if len(consecutive)<2:return False
    pdfindices=[list(stamps).index(s[0]) for s in consecutive]
    return all(pdfindices[i]>pdfindices[i-1] for i in range(1,len(pdfindices)))

def supplement_day(day,gtfs,reference):
    additions=[]
    for pdf in materialize_day(day,reference):
        if any(same_service(pdf,t) for t in gtfs) or any(same_service(pdf,t) for t in additions):
            continue
        additions.append(pdf)
    return additions

def reference_metadata(reference,counts):
    return {'source':reference['source'],'document_sha256':reference['pdf_sha256'],
            'verified_date':reference['verified_date'],
            'scope':'L Hospitalet de Llobregat <-> Maçanet-Massanes, 27 directly observed stops',
            'weekday_trajectories':190,'weekend_trajectories':138,
            'count_by_day':counts,
            'exclusions':['Molins de Rei','Sant Feliu de Llobregat','Sant Joan Despi','Cornella'],
            'warning':'Planned timetable only; bank holidays and exceptional changes need separate verification.'}
