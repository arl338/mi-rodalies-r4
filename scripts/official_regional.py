"""Directly read official R11, R15 and R16 printed station times, no interpolation.

This is deliberately partial coverage of the published tables. Original PDF
row identities and line metadata remain attached to all generated services.
"""
import json
from datetime import datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

REFERENCE=Path(__file__).resolve().parents[1]/'data/reference/official_regional_verified.json'
TZ=ZoneInfo('Europe/Madrid')
COUNTS={'R11':12,'R13':4,'R14':1,'R15':14,'R16':8}

def load_reference(path=REFERENCE):
    doc=json.loads(Path(path).read_text(encoding='utf8'))
    if doc.get('schema')!=1 or set(doc.get('sources',{}))!=set(COUNTS):
        raise ValueError('Regional official source manifest invalid')
    counts={line:0 for line in COUNTS}
    identities=set()
    for item in doc.get('services',[]):
        line,cal,num=item['line'],item['calendar'],item['train_number']
        if line not in COUNTS or cal not in ('weekday','weekend','daily') or not num.isdigit():
            raise ValueError('Unknown regional line or calendar')
        identity=(line,cal,num)
        if identity in identities:raise ValueError('Duplicate published regional train')
        identities.add(identity)
        calls=item['stops']
        if len(calls)<2:raise ValueError('Truncated regional timetable row')
        if len({code for code,_ in calls})!=len(calls):
            raise ValueError('Repeated station in official regional train')
        if any(not isinstance(code,str) or not (code.startswith('ref:') or (len(code)==5 and code.isdigit())) or
               not isinstance(m,int) or m<0 or m>=1440 for code,m in calls):
            raise ValueError('Bad regional station or clock value')
        if any(calls[i][1]>=calls[i+1][1] for i in range(len(calls)-1)):
            raise ValueError('Non-monotone official regional timetable row')
        counts[line]+=1
    if counts!=COUNTS:raise ValueError('Official regional source changed: '+str(counts))
    return doc

def materialize_day(day,document):
    mode='weekend' if day.weekday()>=5 else 'weekday'
    anchor=datetime.combine(day,time.min,tzinfo=TZ)
    out=[]
    for item in document['services']:
        if item['calendar'] not in (mode,'daily'):continue
        calls=[]
        for code,minute in item['stops']:
            ts=int((anchor+timedelta(minutes=minute)).timestamp())
            calls.append([code,ts,ts])
        out.append({'id':'pdf-regional-'+item['line'].lower()+'-'+item['train_number']+'-'+day.isoformat(),
                    'n':item['train_number'],'l':item['line'],'src':'official-regional-pdf',
                    'dest':calls[-1][0], 's':calls,
                    'scope':item.get('segment', 'Published verified station-time cells; service may continue beyond source row')})
    return out

def duplicate(candidate,existing):
    if candidate['l']!=existing.get('l'):return False
    n=existing.get('n')
    if n and n.isdigit() and candidate['n']!=n:return False
    pub={s[0]:s[2] for s in candidate['s']}
    return sum(code in pub and abs(pub[code]-dep)<=60
               for code,_a,dep in existing.get('s',[]))>=2

def supplement_day(day, existing, document):
    out=[]
    for row in materialize_day(day,document):
        if not any(duplicate(row,old) for old in existing+out):
            out.append(row)
    return out
