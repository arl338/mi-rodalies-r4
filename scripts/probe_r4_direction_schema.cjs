#!/usr/bin/env node
'use strict';
/** Read-only R4 field-semantics diagnostic. Stores no train IDs, positions, or train times. */
const E=require('../engine.js');
const stations=['78710','71801','78805'];
const endpoints=s=>[
 ['Valfiguer',`https://trenes.valfiguer.com/api/v1/stations/${s}`],
 ['Radar',`https://radardetrenes.com/api/v1/stations/${s}/board-renfe`]];
async function fetchJson(url){
 const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),12000);
 try{
  const r=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json',Origin:'https://arl338.github.io'}});
  if(!r.ok)throw Error('HTTP '+r.status);
  return r.json();
 }finally{clearTimeout(timer)}
}
function shape(v){
 if(v===null)return 'null';
 if(Array.isArray(v))return 'array:'+(v[0]===null?'null':typeof v[0])+':'+v.length;
 return typeof v;
}
(async()=>{
 const now=Math.floor(Date.now()/1000),summary=[];
 for(const code of stations){
  for(const [provider,url] of endpoints(code)){
   try{
    const p=await fetchJson(url),b=E.normalizeBoard(p,provider,now,code),r=E.rows(p);
    const row={station:code,provider,http_ok:true,all_raw:r.length,normalized:b.length,
       r4_raw:0,r4_parsed:b.filter(x=>x.line==='R4').length,
       eta_r4:b.filter(x=>x.line==='R4'&&!x.stale&&x.estimated!==null&&x.age!==null&&x.age<=180).length,
       r4_fields:{},nested_shapes:{},direction_text:{},status_values:{},times:{},source_generated_fields:{}};
    for(const [key,value] of Object.entries(p||{}))
     if(/generat|time|timestamp|updated|age|status/i.test(key))row.source_generated_fields[key]=shape(value);
    for(const v of r){
     if(!v||typeof v!=='object')continue;
     const ln=String(v.line||v.route_name||v.product||v.route||'').toUpperCase();
     if(!/(^R4$|^C4$|\bR4\b)/.test(ln))continue;
     row.r4_raw++;
     for(const [k,value] of Object.entries(v)){
      row.r4_fields[k]=(row.r4_fields[k]||0)+1;
      if(value!==null&&typeof value==='object'){
       const key=k+':'+shape(value);
       row.nested_shapes[key]=(row.nested_shapes[key]||0)+1;
       if(Array.isArray(value)&&value.length&&typeof value[0]==='object')
        for(const sub of Object.keys(value[0]))row.nested_shapes[k+'.item.'+sub]=(row.nested_shapes[k+'.item.'+sub]||0)+1;
      }
     }
     for(const k of ['destination','destinationName','direction','routeName','headsign','origin','originName']){
      if(typeof v[k]==='string'){
       const dest=v[k].toLowerCase();
       const key=k+':'+(/manresa|terrassa nord|terrassa estaci[oó]/.test(dest)?'toward_manresa':/vilafranca|sant vicen|martorell|hospitalet|barcelona|molins|castellbisbal/.test(dest)?'toward_barcelona':'other');
       row.direction_text[key]=(row.direction_text[key]||0)+1;
      }
     }
     for(const k of ['state','circulationState','timeType','status']){
      if(typeof v[k]==='string'){const key=k+':'+v[k].slice(0,25);row.status_values[key]=(row.status_values[key]||0)+1}
     }
     for(const k of ['planned_ts','estimated_ts','plannedTime','estimatedTime','delay_s','delayMinutes','age_s'])
      if(v[k]!==undefined)row.times[k+':'+shape(v[k])]=(row.times[k+':'+shape(v[k])]||0)+1;
    }
    summary.push(row);console.log(JSON.stringify(row));
   }catch(err){console.log(JSON.stringify({station:code,provider,error:String(err.message).slice(0,120)}))}
  }
 }
})().catch(e=>{console.error(e);process.exitCode=1});
