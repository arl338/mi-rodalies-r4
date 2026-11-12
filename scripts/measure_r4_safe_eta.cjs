#!/usr/bin/env node
'use strict';
/* Read-only station-specific assessment of safe ETA correlations for R4.
 * Only aggregate counts; don't print or persist train ids, timestamps or positions.
 */
const fs=require('node:fs'),path=require('node:path'),E=require('../engine.js');
const root=path.join(__dirname,'..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/v2/catalog.json'),'utf8'));
const dayParts={};
for(const p of new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()))
 if(p.type!=='literal')dayParts[p.type]=p.value;
const day=dayParts.year+'-'+dayParts.month+'-'+dayParts.day;
const daily=JSON.parse(fs.readFileSync(path.join(root,'data/v2',day+'.json'),'utf8'));
if(daily.batch_id!==catalog.batch_id)throw Error('catalog/trips mismatch');
const now=Math.floor(Date.now()/1000);
const destinations=new Map();
for(const st of catalog.stations){
 if(!/^[0-9]{5}$/.test(st.id))continue;
 for(const name of [st.name,st.gtfs_name,...st.aliases||[]]){
  if(!name)continue;
  const key=E.norm(name);
  if(!destinations.has(key))destinations.set(key,st.id);
  else if(destinations.get(key)!==st.id)destinations.set(key,'');
 }
}
async function json(url){
 const c=new AbortController(),t=setTimeout(()=>c.abort(),9000);
 try{const r=await fetch(url,{signal:c.signal,headers:{Origin:'https://arl338.github.io',Accept:'application/json'}});
 if(!r.ok)throw Error('HTTP_'+r.status);return r.json();}finally{clearTimeout(t)}
}
(async()=>{
 for(const [label,from,to] of [
  ['R4 Terrassa Est → Plaça Catalunya','78710','78805'],
  ['R4 Sants → Terrassa Est','71801','78710']]){
  const trips=daily.trains.filter(t=>t.l==='R4');
  const journeys=E.direct(trips,from,to,now-900,now+7200);
  const board=[];const stats={};
  for(const [provider,url] of [
   ['Valfiguer',`https://trenes.valfiguer.com/api/v1/stations/${from}`],
   ['Radar',`https://radardetrenes.com/api/v1/stations/${from}/board-renfe`]]){
   try{
    const b=E.normalizeBoard(await json(url),provider,now,from);
    board.push(...b);
    stats[provider]={all:b.length,r4:b.filter(x=>x.line==='R4').length,
      r4_fresh_eta:b.filter(x=>x.line==='R4'&&!x.stale&&x.estimated!==null&&x.age!==null&&x.age<=180).length,
      destination_codes_present:b.filter(x=>x.line==='R4'&&x.destinationCode).length,
      destination_names_present:b.filter(x=>x.line==='R4'&&x.destinationName).length};
   }catch(e){stats[provider]={error:String(e.message).slice(0,70)}}
  }
  const correlated=E.correlateTimetableBoards(journeys,board,trips,destinations);
  const enriched=journeys.map(j=>E.enrichJourney(j,correlated,[],[],now));
  const info={label,services_next_two_hours:journeys.length,
    pdf_services:journeys.filter(j=>j.legs[0].t.src==='official-r4-pdf').length,
    gtfs_services:journeys.filter(j=>j.legs[0].t.src!=='official-r4-pdf').length,
    providers:stats,
    anonymous_rows_linked:correlated.filter(x=>x.linkedByScheduleOnly).length,
    pdf_services_with_eta:enriched.filter(j=>j.legs[0].t.src==='official-r4-pdf'&&j.estimated!==null).length,
    gtfs_services_with_eta:enriched.filter(j=>j.legs[0].t.src!=='official-r4-pdf'&&j.estimated!==null).length,
    conflicts:enriched.filter(j=>j.conflict).length};
  console.log(JSON.stringify(info));
 }
})().catch(e=>{console.error(e);process.exitCode=1});
