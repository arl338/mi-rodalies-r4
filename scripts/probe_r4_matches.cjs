#!/usr/bin/env node
'use strict';
/** Aggregate-only live correlation check: no raw train feed persistence. */
const fs=require('node:fs');
const path=require('node:path');
const E=require('../engine.js');
const STATIONS=[['78710','78805'],['71801','78710']];
const ROOT=path.join(__dirname,'..','data','v2');
const dateFmt=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'});
function day(when){const p={};for(const t of dateFmt.formatToParts(when))if(t.type!=='literal')p[t.type]=t.value;return [p.year,p.month,p.day].join('-');}
async function json(url){
 const c=new AbortController(), timer=setTimeout(()=>c.abort(),9000);
 try{const r=await fetch(url,{signal:c.signal,headers:{Origin:'https://arl338.github.io',Accept:'application/json'}});if(!r.ok)throw Error('HTTP '+r.status);return r.json();}
 finally{clearTimeout(timer);}
}
async function run(){
 const now=Math.floor(Date.now()/1000),today=day(new Date(now*1000));
 const catalog=JSON.parse(fs.readFileSync(path.join(ROOT,'catalog.json'),'utf8'));
 const daily=JSON.parse(fs.readFileSync(path.join(ROOT,today+'.json'),'utf8'));
 if(daily.batch_id!==catalog.batch_id)throw Error('Lote GTFS inconsistente');
 const trains=daily.trains.map(t=>({...t,day:today}));
 const result={schema:1,day:today,batch:catalog.batch_id,generated_at:new Date().toISOString(),
  note:'Sondeo puntual para las próximas 2 h; solo correlaciones agregadas. No certifica precisión, CORS de navegador ni circulación.',
  corridors:[]};
 for(const [from,to] of STATIONS){
  const segment=E.direct(trains,from,to,now-300,now+7200).filter(x=>x.t?.l==='R4'||x.legs.every(l=>l.t.l==='R4'));
  const roots=[
   ['Valfiguer',`https://trenes.valfiguer.com/api/v1/stations/${from}`],
   ['RadarDeTrenes',`https://radardetrenes.com/api/v1/stations/${from}/board-renfe`]
  ];
  const samples=[];
  for(const [name,url] of roots){
   try{
    const raw=await json(url),board=E.normalizeBoard(raw,name,now,from);
    let matched=0,verifiedEstimated=0,stale=0,hasId=0,onlyNumber=0;
    for(const item of board){
      if(item.stale)stale++;
      if(item.trip)hasId++;else if(item.number)onlyNumber++;
      const legs=segment.flatMap(x=>x.legs).filter(l=>E.matchExact(l,item));
      if(legs.length){matched++;if(!item.stale&&item.estimated!==null&&item.age!==null&&item.age<=180)verifiedEstimated++;}
    }
    samples.push({name,http:200,raw:E.rows(raw).length,normalized:board.length,with_trip_id:hasId,
      number_only:onlyNumber,stale,matched_r4_legs:matched,recent_matched_estimations:verifiedEstimated});
   }catch(e){samples.push({name,error:e.name==='AbortError'?'timeout':String(e.message).slice(0,90)});}
  }
  result.corridors.push({from,to,r4_direct_trains_next_2h:segment.length,feeds:samples});
 }
 const output=process.env.MATCH_REPORT||'r4-live-correlations.json';
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result,null,2));
}
run().catch(e=>{console.error('ERROR:',e.message);process.exitCode=1;});
