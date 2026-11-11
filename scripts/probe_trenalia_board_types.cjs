#!/usr/bin/env node
'use strict';
/** Read only schema/field-type probe: never persists a train's number, ID, position or time. */
const fs=require('node:fs');
const stationCodes=['78710','71801','79100','71700'];
async function main(){
 const info=[];
 for(const code of stationCodes){
  const url='https://trenalia.org/api/v1/stations/'+code+'/board?type=departures&limit=100&horizon=120';
  try{
   const resp=await fetch(url,{headers:{Origin:'https://arl338.github.io',Accept:'application/json'}});
   const raw=await resp.json();
   const r=Array.isArray(raw?.departures)?raw.departures:[];
   const stats={station:code,http:resp.status,count:r.length,
    metadata:Object.fromEntries(['generatedAt','now','localTime','sources'].map(k=>[k,typeof raw?.[k]])),
    fields:{}};
   for(const k of ['id','company','product','scheduled','scheduledTime','estimated','estimatedTime','delay','live','kind','status','group','origin','dest','train','trainCode','line','station','minutes','position']){
    const present=r.filter(x=>x[k]!==null&&x[k]!==undefined);
    stats.fields[k]={present:present.length,types:[...new Set(present.map(x=>typeof x[k]))].sort()};
    if(['live','kind','status','group','company','product'].includes(k)){
      const options=[...new Set(present.map(x=>String(x[k])))].slice(0,20);
      stats.fields[k].examples=options;
    }
   }
   const count=(arr,key)=>(arr.filter(x=>x[key]===true).length);
   const shape=v=>v===null||v===undefined?'missing':typeof v!=='string'?typeof v:
      /^\\d{4}-\\d\\d-\\d\\dT/.test(v)?'ISO_datetime':
      /^\\d\\d:\\d\\d(?::\\d\\d)?$/.test(v)?'HH_MM':
      /^\\d+$/.test(v)?'numeric_string':'other_string';
   stats.estimated_true=count(r,'estimated');
   stats.live_true=count(r,'live');
   stats.live_and_estimated=r.filter(x=>x.live===true&&x.estimated===true).length;
   stats.estimated_not_live=r.filter(x=>x.live!==true&&x.estimated===true).length;
   stats.schedule_patterns=[...new Set(r.map(x=>shape(x.scheduledTime)))];
   stats.estimate_patterns=[...new Set(r.map(x=>shape(x.estimatedTime)))];
   stats.id_patterns=[...new Set(r.map(x=>typeof x.id==='string'?
      x.id.replace(/\\d+/g,'#').slice(0,35):typeof x.id))].slice(0,12);
   info.push(stats);
  }catch(e){info.push({station:code,error:e.name});}
 }
 fs.writeFileSync('trenalia-board-types.json',JSON.stringify(info,null,2)+'\n');
 for(const item of info)console.log(JSON.stringify(item));
}
main().catch(e=>{console.error(e);process.exitCode=1});
