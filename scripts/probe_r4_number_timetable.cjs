#!/usr/bin/env node
'use strict';
/* Check whether Valfiguer's train-number timetable can confirm identity
   of a scheduled R4 service omitted from our GTFS.
   Print field names and counts only; never train numbers or train times. */
async function get(u){
 const c=new AbortController(),kill=setTimeout(()=>c.abort(),11000);
 try{const r=await fetch(u,{signal:c.signal,headers:{Origin:'https://arl338.github.io',Accept:'application/json'}});if(!r.ok)throw Error('HTTP '+r.status);return r.json();}finally{clearTimeout(kill)}
}
(async()=>{
 const p=await get('https://radardetrenes.com/api/v1/stations/78710/board-renfe');
 const r=(p.departures||[]).filter(x=>x.line==='R4'&&x.trainCode&&x.destinationCode);
 const chosen=r.slice(0,4),summary={board_r4:r.length,sampled:chosen.length,results:[]};
 for(const x of chosen){
  try{
   const url='https://trenes.valfiguer.com/api/v1/horario/numero/'+encodeURIComponent(x.trainCode)+'?nucleo=Catalunya';
   const data=await get(url);
   const groups={},types={};
   for(const [k,v] of Object.entries(data||{})){
    types[k]=Array.isArray(v)?'array:'+v.length:v===null?'null':typeof v;
    if(Array.isArray(v)&&v.length&&typeof v[0]==='object')groups[k]=Object.keys(v[0]).sort();
   }
   summary.results.push({ok:true,types,child_keys:groups});
  }catch(e){summary.results.push({ok:false,error:String(e.message).slice(0,45)})}
 }
 console.log(JSON.stringify(summary));
})().catch(e=>{console.error(e);process.exitCode=1});
