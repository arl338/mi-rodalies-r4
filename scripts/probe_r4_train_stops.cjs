#!/usr/bin/env node
'use strict';
/** Live, read-only assessment: does per-train /stops add actionable R4 station ETA?
 * Logs aggregate metadata only; not train numbers, locations or timestamps.
 */
async function get(u){const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),9000);
 try{const r=await fetch(u,{signal:ac.signal,headers:{Origin:'https://arl338.github.io',Accept:'application/json'}});if(!r.ok)throw Error('HTTP_'+r.status);return r.json();}finally{clearTimeout(timer)}}
(async()=>{
 const base='https://radardetrenes.com/api/v1';
 const fleet=await get(base+'/fleet?type=commuter');
 const trains=Array.isArray(fleet?.trains)?fleet.trains:[];
 const r4=trains.filter(x=>['R4','C4'].includes(String(x.line??x.productName??x.product??'').toUpperCase()));
 const selected=r4.slice(0,5);
 const out={r4_fleet_count:r4.length,sampled:selected.length,with_id:0,
  stops_responses_ok:0,nonempty_stop_arrays:0,root_keys:{},root_array_sizes:{},stop_keys:{},field_types:{},
  station_match_count:0,station_estimated_count:0,error_counts:{}};
 for(const train of selected){
  const id=train.id;
  if(typeof id!=='string'||!id)continue;
  out.with_id++;
  try{const result=await get(base+'/trains/'+encodeURIComponent(id)+'/stops');
   out.stops_responses_ok++;
   for(const [k,v] of Object.entries(result||{})){
    out.root_keys[k]=(out.root_keys[k]||0)+1;
    if(Array.isArray(v))out.root_array_sizes[k]=(out.root_array_sizes[k]||[]).concat([v.length]);
   }
   const arr=Array.isArray(result)?result:Array.isArray(result.stops)?result.stops:
      Array.isArray(result.data?.stops)?result.data.stops:[];
   if(arr.length)out.nonempty_stop_arrays++;
   for(const st of arr){
    if(!st||typeof st!=='object')continue;
    for(const [k,v] of Object.entries(st)){
     out.stop_keys[k]=(out.stop_keys[k]||0)+1;
     if(!out.field_types[k])out.field_types[k]={};
     const kind=v===null?'null':typeof v;
     out.field_types[k][kind]=(out.field_types[k][kind]||0)+1;
    }
    const code=String(st.code??st.stationCode??st.stop_id??'');
    if(['78710','71801','78805'].includes(code)){out.station_match_count++;
     if(st.estimatedDeparture||st.estimated_departure||st.estimated_departure_ts||st.estimatedDepartureTime)out.station_estimated_count++;}
   }
  }catch(e){const key=String(e.message).slice(0,20);out.error_counts[key]=(out.error_counts[key]||0)+1}
 }
 console.log(JSON.stringify(out));
})().catch(e=>{console.error(e);process.exitCode=1});
