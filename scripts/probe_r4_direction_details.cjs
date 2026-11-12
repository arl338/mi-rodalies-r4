#!/usr/bin/env node
'use strict';
/** Capture aggregate R4 direction and freshness semantics. No train identifier or ETA printed. */
const E=require('../engine.js');
(async()=>{
 const now=Math.floor(Date.now()/1000),out=[];
 for(const station of ['78710','71801']){
  for(const [source,url] of [
   ['Valfiguer',`https://trenes.valfiguer.com/api/v1/stations/${station}`],
   ['Radar',`https://radardetrenes.com/api/v1/stations/${station}/board-renfe`]]){
   try{
    const r=await fetch(url,{headers:{Accept:'application/json',Origin:'https://arl338.github.io'}});if(!r.ok)throw Error('HTTP '+r.status);
    const p=await r.json();
    const raw=E.rows(p).filter(x=>E.scopedLine(x.line||x.route_name||x.product,x.nucleo||x.nucleus||'',true)==='R4'||E.scopedLine(x.product,x.nucleo||'',true)==='R4');
    const parsed=E.normalizeBoard(p,source,now,station).filter(x=>x.line==='R4');
    const counts={},statuses={},destKinds={},sampleKeys={};
    for(const x of raw){
      for(const [k,v] of Object.entries(x)){
       if(/origin|destination|route|stop|state|circulation|delay|estimated/i.test(k)){
        const ty=Array.isArray(v)?'array':v===null?'null':typeof v;sampleKeys[k+':'+ty]=(sampleKeys[k+':'+ty]||0)+1;
       }
      }
      const state=String(x.state||x.circulationState||'missing');
      const key=state+'|'+(x.delay_s===null?'delay_null':x.delay_s===0?'delay_zero':x.delay_s===undefined?'delay_missing':'delay_nonzero')+'|'+(x.estimated_ts===null?'estimated_null':x.estimated_ts===undefined?'estimated_missing':'estimated_present');
      statuses[key]=(statuses[key]||0)+1;
      const dest=String(x.destinationCode||'')+'|'+String(x.destination||x.destinationName||'').toLowerCase();
      const target=/manresa|terrassa estaci[oó] del nord/.test(dest)?'north':
        /vilafranca|martorell|sant vicen|hospitalet|molins|barcelona/.test(dest)?'south':'other';
      destKinds[target]=(destKinds[target]||0)+1;
    }
    for(const x of parsed){
      const key=(x.estimated!==null?'has_eta':'no_eta')+'|'+(x.age!==null&&x.age<=180?'fresh':'not_fresh')+'|'+(x.number?'number':'no_number');
      counts[key]=(counts[key]||0)+1;
    }
    out.push({station,source,raw:raw.length,parsed:parsed.length,statuses,destKinds,sampleKeys,counts});
   }catch(e){out.push({station,source,error:String(e.message)})}
  }
 }
 for(const v of out)console.log(JSON.stringify(v));
})().catch(e=>{console.error(e);process.exitCode=1});
