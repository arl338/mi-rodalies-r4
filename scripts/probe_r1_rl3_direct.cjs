'use strict';
/** R1/RL3 end-to-end backend diagnostics, no train identifiers or times logged. */
const E=require('../engine.js'),fs=require('node:fs'),path=require('node:path');
const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/v2/catalog.json'),'utf8'));
const date='2026-11-12';const day=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/v2/'+date+'.json'),'utf8'));
const routes=[
 ['R1-Molins-Mataro','R1','72300','79500'],
 ['R1-Hospitalet-Mataro','R1','72305','79500'],
 ['R1-PlCatalunya-Mataro','R1','78805','79500'],
 ['R1-Mataro-Hospitalet','R1','79500','72305'],
 ['R1-Mataro-Molins','R1','79500','72300'],
 ['R1-Hospitalet-Macanet','R1','72305','79200'],
 ['RL3-Lleida-Cervera','RL3','78400','78500'],
 ['RL3-Cervera-Lleida','RL3','78500','78400']
];
const time=Date.parse(date+'T00:00:00+01:00')/1000;
async function probe([name,line,from,to]){
 const local=E.direct(day.trains.filter(t=>t.l===line),from,to,time,time+86400);
 const ac=new AbortController(),kill=setTimeout(()=>ac.abort(),16000);
 try{
  const url='https://trenalia.org/api/v1/timetable?'+new URLSearchParams({from,to,date,limit:'400'});
  const res=await fetch(url,{signal:ac.signal,headers:{Origin:'https://arl338.github.io',Accept:'application/json'}});
  if(!res.ok)throw Error('HTTP '+res.status);
  const raw=await res.json(),alt=E.normalizeTrenaliaTimetable(raw,from,to,date,line);
  const merged=E.mergeSupplementalJourneys(local,E.direct(alt,from,to,time,time+86400));
  return {name,line,from,to,gtfs:local.length,api_total:raw.total,api_rows:raw.trains?.length,
   alt:alt.length,combined:merged.length,lines:Object.fromEntries(
     [...new Set((raw.trains||[]).map(t=>String(t.product||'').replace(/\d/g,'#')))].map(k=>[k,(raw.trains||[]).filter(t=>String(t.product||'').replace(/\d/g,'#')===k).length]))};
 }catch(e){return {name,gtfs:local.length,error:String(e.message).slice(0,80)}}
 finally{clearTimeout(kill)}
}
(async()=>{for(let i=0;i<routes.length;i+=4){
 for(const r of await Promise.all(routes.slice(i,i+4).map(probe)))console.log(JSON.stringify(r));
}
const r1=catalog.stations.filter(x=>x.lines?.includes('R1'));
console.log('R1_STATIONS',JSON.stringify({listed:r1.length,gtfs:r1.filter(x=>x.schedule_lines?.includes('R1')).length,
 without_gtfs:r1.filter(x=>!x.schedule_lines?.includes('R1')).map(x=>({code:x.id,name:x.name}))}));
})().catch(e=>{console.error(e);process.exitCode=1});