'use strict';
/**
 * Quantify *actual* application identity matching: live board/position ↔ GTFS,
 * not just presence of a line name. No raw train identifiers or positions saved.
 */
const fs=require('node:fs'),path=require('node:path');
const E=require('../engine.js');
const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data/v2/catalog.json'),'utf8'));
const lines=catalog.lines.map(x=>x.id);
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'});
const parts={};for(const p of today.formatToParts(new Date()))if(p.type!=='literal')parts[p.type]=p.value;
const day=parts.year+'-'+parts.month+'-'+parts.day,now=Math.floor(Date.now()/1000);
const daily=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data/v2',day+'.json'),'utf8'));
const trains=daily.trains.map(t=>({...t,day}));
async function getJson(url){
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),12000);
 try{const r=await fetch(url,{signal:ac.signal,headers:{Accept:'application/json',Origin:'https://arl338.github.io'}});
  if(!r.ok)throw Error('http_'+r.status);return r.json();
 }finally{clearTimeout(timer)}
}
const candidate={
 R1:['Mataró','Arenys de Mar','Barcelona-Plaça de Catalunya'],
 R2:['Granollers Centre','Barcelona-Sants'],
 R3:['Barcelona-Fabra i Puig','Vic'],
 R4:['Terrassa Est','Barcelona-Sants','Barcelona-Plaça de Catalunya'],
 R7:['Barcelona-Fabra i Puig','Cerdanyola Universitat'],
 R8:['Martorell Central','Granollers Centre']
};
function stationId(s){const found=catalog.stations.filter(x=>x.name===s&&/^\d{5}$/.test(x.id));return found.length===1?found[0].id:null;}
const output=[];
for(const line of lines){
 const row={line,gtfs_records:trains.filter(t=>t.l===line).length,
  matched_boards:{Valfiguer:0,RadarDeTrenes:0},
  fresh_estimates_applied:{Valfiguer:0,RadarDeTrenes:0},
  positions_matched:{Valfiguer:0,RadarDeTrenes:0},
  samples:[]};
 if(!candidate[line]){output.push(row);continue;}
 for(const name of candidate[line]){
  const from=stationId(name);if(!from){row.samples.push({name,error:'unresolved_id'});continue;}
  const legs=trains.filter(t=>t.l===line).flatMap(t=>t.s.map((s,i)=>i<t.s.length-1&&s[0]===from?{t,from,depart:s[2],to:t.s[i+1][0],arrive:t.s[i+1][1]}:null).filter(Boolean));
  const sample={name,gtfs_departures:legs.length};
  if(!legs.length){row.samples.push(sample);continue;}
  const boards={};
  for(const [provider,url] of [
    ['Valfiguer','https://trenes.valfiguer.com/api/v1/stations/'+from],
    ['RadarDeTrenes','https://radardetrenes.com/api/v1/stations/'+from+'/board-renfe']]){
   try{
    const normalized=E.normalizeBoard(await getJson(url),provider,now,from);
    boards[provider]=normalized;
    const matched=normalized.filter(x=>legs.some(l=>E.matchExact(l,x)));
    row.matched_boards[provider]+=matched.length;
    row.fresh_estimates_applied[provider]+=matched.filter(x=>
      !x.stale&&x.estimated!==null&&x.age!==null&&x.age>=0&&x.age<=180&&
      x.estimated>=now-300&&legs.some(l=>E.matchExact(l,x)&&
      x.estimated>=l.depart-1200&&x.estimated<l.depart+14400)).length;
    sample[provider]={normalized:normalized.length,matched:matched.length,
      fresh_applied:row.fresh_estimates_applied[provider]};
   }catch(e){sample[provider]={error:String(e.message).slice(0,80)};}
  }
  row.samples.push(sample);
 }
 output.push(row);
}
const report={schema:1,day,observed_at:new Date(now*1000).toISOString(),
 limitations:'Only samples three stations per covered line; count is not network-wide coverage. ETA must match trip ID or train number+line+scheduled departure. Other lines with no GTFS have zero applied ETAs by design.',
 results:output};
fs.writeFileSync('matched-live-by-line.json',JSON.stringify(report,null,2)+'\n');
for(const x of output)console.log(JSON.stringify({line:x.line,gtfs:x.gtfs_records,
 matched_val:x.matched_boards.Valfiguer,eta_val:x.fresh_estimates_applied.Valfiguer,
 matched_radar:x.matched_boards.RadarDeTrenes,eta_radar:x.fresh_estimates_applied.RadarDeTrenes,
 stations_checked:x.samples.map(s=>s.name)}));
