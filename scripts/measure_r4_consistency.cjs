#!/usr/bin/env node
'use strict';
/**
 * R4 repeated, read-only cross-source consistency assessment.
 * This does NOT measure true punctuality: no arrival/departure observation is
 * confirmed merely because an ETA changes or a train disappears from a board.
 * No raw feed payloads or train identifiers are written to disk or stdout.
 */
const fs=require('node:fs');
const path=require('node:path');
const E=require('../engine.js');
const STOPS=[['78710','78805'],['71801','78710']];
const SAMPLE_COUNT=3, INTERVAL_MS=30000;
const root=path.join(__dirname,'..','data','v2');
const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'});
function serviceDay(t){const a={};for(const p of fmt.formatToParts(new Date(t*1000)))if(p.type!=='literal')a[p.type]=p.value;return a.year+'-'+a.month+'-'+a.day;}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function fetchJson(url){
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),9000);
 try{const res=await fetch(url,{signal:abort.signal,headers:{Accept:'application/json',Origin:'https://arl338.github.io'}});
 if(!res.ok)throw Error('HTTP_'+res.status);return await res.json();}
 finally{clearTimeout(timer);}
}
function directLegs(trains,from,to,now){
 return E.direct(trains,from,to,now-300,now+7200).filter(j=>j.legs.every(l=>l.t.l==='R4')).flatMap(j=>j.legs);
}
function percentile(values,q){
 if(!values.length)return null;
 const ordered=[...values].sort((a,b)=>a-b);
 return ordered[Math.min(ordered.length-1,Math.ceil(q*ordered.length)-1)];
}
async function main(){
 const now=Math.floor(Date.now()/1000),day=serviceDay(now);
 const c=JSON.parse(fs.readFileSync(path.join(root,'catalog.json'),'utf8'));
 const d=JSON.parse(fs.readFileSync(path.join(root,day+'.json'),'utf8'));
 if(c.batch_id!==d.batch_id)throw Error('GTFS batch mismatch');
 const trains=d.trains.map(t=>({...t,day}));
 const sampleStates=[],lastByKey=new Map(),drifts=[],sourceGaps=[];
 for(let round=0;round<SAMPLE_COUNT;round++){
  if(round)await wait(INTERVAL_MS);
  const captured=Math.floor(Date.now()/1000),corridors=[];
  for(const [from,to] of STOPS){
   const legs=directLegs(trains,from,to,captured);
   const urls=[['Valfiguer','https://trenes.valfiguer.com/api/v1/stations/'+from],
    ['RadarDeTrenes','https://radardetrenes.com/api/v1/stations/'+from+'/board-renfe']];
   const feeds=[],selected=new Map();
   for(const [source,url] of urls){
    try{
     const raw=await fetchJson(url),rows=E.normalizeBoard(raw,source,captured,from);
     let linked=0,freshEstimated=0,declaredStale=0;
     for(const row of rows){
      if(row.stale)declaredStale++;
      const matches=legs.filter(l=>E.matchExact(l,row));
      if(!matches.length)continue;
      linked++;
      if(row.stale||row.age===null||row.age<0||row.age>180||row.planned===null||row.estimated===null)continue;
      // Apply precisely the same plausibility filter as production enrichLeg.
      if(row.estimated<captured-300||row.estimated<matches[0].depart-1200||row.estimated>=matches[0].depart+14400)continue;
      freshEstimated++;
      const leg=matches[0],key=from+'|'+to+'|'+source+'|'+leg.t.id+'|'+leg.depart;
      const old=lastByKey.get(key);
      if(old!==undefined)drifts.push(Math.abs(row.estimated-old));
      lastByKey.set(key,row.estimated);
      const trainKey=leg.t.id+'|'+leg.depart,rec=selected.get(trainKey)||{};
      rec[source]=row.estimated;selected.set(trainKey,rec);
     }
     feeds.push({source,received:rows.length,linked,fresh_estimates:freshEstimated,stale:declaredStale});
    }catch(err){feeds.push({source,error:err.name==='AbortError'?'timeout':String(err.message).slice(0,60)});}
   }
   let agreements=0,contradictions=0;
   for(const rec of selected.values()){
    if(rec.Valfiguer===undefined||rec.RadarDeTrenes===undefined)continue;
    const gap=Math.abs(rec.Valfiguer-rec.RadarDeTrenes);sourceGaps.push(gap);
    if(gap>300)contradictions++;else agreements++;
   }
   corridors.push({from,to,gtfs_direct_legs:legs.length,feeds,
    same_train_source_agreements_5min:agreements,conflicts_over_5min:contradictions});
  }
  sampleStates.push({sample:round+1,at:new Date(captured*1000).toISOString(),corridors});
 }
 const report={schema:1,mode:'r4_snapshot_consistency',day,
  sample_count:SAMPLE_COUNT,interval_seconds:INTERVAL_MS/1000,
  disclaimer:'Mide acuerdo entre proveedores y estabilidad de ETA, NO error respecto a paso real. Un tren ausente no implica cancelación.',
  source_comparison:{pairs:sourceGaps.length,median_abs_difference_s:percentile(sourceGaps,0.5),
   p90_abs_difference_s:percentile(sourceGaps,0.9),discrepancies_over_5min:sourceGaps.filter(x=>x>300).length},
  eta_stability:{pairs:drifts.length,median_abs_drift_s:percentile(drifts,0.5),
   p90_abs_drift_s:percentile(drifts,0.9)},
  samples:sampleStates};
 fs.writeFileSync('r4-consistency-report.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}
main().catch(err=>{console.error('Diagnóstico no disponible:',err.message);process.exitCode=1;});
