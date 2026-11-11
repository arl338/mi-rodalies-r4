'use strict';
/** Aggregate rejection reasons for real Trenalia schedules. No train IDs saved. */
const E=require('../engine.js');
const today='2026-11-12';
const requests=[
 ['R3 Fabra Vic','78802','77100','R3'],
 ['R3 Vic Ripoll','77100','77006','R3'],
 ['RT1 Tarragona Reus','71500','71300','RT1'],
 ['RT1 Reus Plana','71300','71200','RT1'],
 ['RT2 Tarragona Port Aventura','71500','65411','RT2'],
 ['R17 Tarragona Port Aventura','71500','65411','R17'],
 ['R2S Sants Vilanova','71801','71700','R2S']
];
async function get(url){const ac=new AbortController(),id=setTimeout(()=>ac.abort(),12000);
try{const r=await fetch(url,{signal:ac.signal,headers:{Origin:'https://arl338.github.io',Accept:'application/json'}});if(!r.ok)throw Error('HTTP '+r.status);return r.json();}finally{clearTimeout(id)}}
(async()=>{
 for(const [title,from,to,line] of requests){
  const url='https://trenalia.org/api/v1/timetable?'+new URLSearchParams({from,to,date:today,limit:'400'});
  try{
   const p=await get(url),own=p.trains.filter(x=>x.product==='Cercanías '+line);
   const accepted=E.normalizeTrenaliaTimetable(p,from,to,today,line).length;
   const histogram={stops:{},train:{},feed:{},operator:{},durations:[]};
   for(const row of own){const k=String(row.stops);histogram.stops[k]=(histogram.stops[k]||0)+1;
    const t=row.train===null?'null':typeof row.train;histogram.train[t]=(histogram.train[t]||0)+1;
    histogram.feed[row.feed]=(histogram.feed[row.feed]||0)+1;
    histogram.operator[row.operator]=(histogram.operator[row.operator]||0)+1;
    histogram.durations.push((row.arrMs-row.depMs)/60000)}
   const durations=histogram.durations;
   delete histogram.durations;
   console.log(JSON.stringify({title,line,source_row_count:own.length,accepted,stops_hist:histogram.stops,
    train_types:histogram.train,feed:histogram.feed,operator:histogram.operator,
    duration_min:durations.length?Math.min(...durations):null,
    duration_max:durations.length?Math.max(...durations):null}));
  }catch(e){console.log(JSON.stringify({title,error:String(e.message).slice(0,100)}));}
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
