#!/usr/bin/env node
'use strict';
/** Field-shape and semantic ETA audit; never persist identifiers or timestamps. */
const fs=require('node:fs');
const E=require('../engine.js');
const stations=['78710','71801','78805'];
async function get(u){const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),12000);
 try {const r=await fetch(u,{signal:ac.signal,headers:{Origin:'https://arl338.github.io',Accept:'application/json'}});if(!r.ok)throw Error('HTTP '+r.status);return await r.json();}
 finally{clearTimeout(timer)}
}
const valueSummary=(x)=>x===null?'null':typeof x==='string'?x.toLowerCase().slice(0,40):typeof x==='number'?'numeric':String(x);
(async()=>{const now=Math.floor(Date.now()/1000),rows=[];
 for(const station of stations){for(const [source,url] of [
 ['Valfiguer','https://trenes.valfiguer.com/api/v1/stations/'+station],
 ['RadarDeTrenes','https://radardetrenes.com/api/v1/stations/'+station+'/board-renfe']]){
  try{
   const obj=await get(url),raw=E.rows(obj),normalized=E.normalizeBoard(obj,source,now,station);
   const hist={};let estimatedWithExplicit=0,scheduledWithEstimated=0,hasDelay=0,stale=0;
   for(const original of raw){const r=original?.properties||original;if(!r||typeof r!=='object')continue;
    for(const field of ['timeType','circulationState','state','status','stale','isLive','live','isEstimated','estimated','delay_s','delayMinutes','age_s']){
      if(r[field]===undefined)continue;
      const key=field+':'+valueSummary(r[field]);
      hist[key]=(hist[key]||0)+1;
    }
    if(r.estimated_ts!==undefined||r.estimatedTime!==undefined||r.estimatedDeparture!==undefined)estimatedWithExplicit++;
    if(String(r.timeType||'').toUpperCase()==='SCHEDULED'&&(r.estimated_ts!==undefined||r.estimatedTime!==undefined))scheduledWithEstimated++;
    if(r.delay_s!==undefined||r.delayMinutes!==undefined)hasDelay++;
    if(r.stale===true)stale++;
   }
   const row={station,source,raw:raw.length,normalized:normalized.length,
    explicit_estimated_fields:estimatedWithExplicit,scheduled_with_estimated_field:scheduledWithEstimated,
    delay_fields_present:hasDelay,declared_stale:stale,field_distribution:hist};
   console.log(JSON.stringify(row));rows.push(row);
  }catch(e){const row={station,source,error:String(e.message).slice(0,90)};console.log(JSON.stringify(row));rows.push(row);}
 }}
 fs.writeFileSync('precision-source-audit.json',JSON.stringify({schema:1,at:new Date().toISOString(),
  disclaimer:'Snapshot field presence only; no station passage accuracy, no raw train observations',
  rows},null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1});
