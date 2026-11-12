'use strict';
/** Read-only representative all-line timetable probe: aggregate metadata only.
 * A zero for a selected corridor does NOT prove absence on the whole line.
 */
const E=require('../engine.js');
const probes=[
 ['R1','78805','79600'],['R2','71801','79100'],['R2N','71801','79100'],
 ['R2S','71801','71700'],['R3','78805','77109'],['R4','78710','78805'],
 ['R7','78802','72503'],['R8','72209','79100'],['RG1','79500','79300'],
 ['RT1','71500','71400'],['RT2','71500','65411'],['RL3','78400','78500'],
 ['RL4','78400','78700'],['R11','71801','79300'],['R13','71801','78400'],
 ['R14','71801','78400'],['R15','71801','71209'],['R16','71801','65400'],
 ['R17','71801','65411']
];
const date='2026-11-12';
async function probe([line,from,to]){
 const ac=new AbortController(),stop=setTimeout(()=>ac.abort(),10000);
 try{
  const params=new URLSearchParams({from,to,date,limit:'400'});
  const resp=await fetch('https://trenalia.org/api/v1/timetable?'+params,
   {signal:ac.signal,headers:{Origin:'https://arl338.github.io',Accept:'application/json'}});
  if(!resp.ok)return {line,status:'http_'+resp.status};
  const data=await resp.json(),trains=Array.isArray(data.trains)?data.trains:[];
  const valid=E.normalizeTrenaliaTimetable(data,from,to,date,line);
  const fields={};
  const pattern={};
  for(const r of trains){
   const key=[String(r.feed||'').slice(0,25),String(r.operator||'').slice(0,30),
    String(r.product||'').replace(/\d/g,'#').slice(0,50),r.train===null?'anonymous':'identified'].join('|');
   pattern[key]=(pattern[key]||0)+1;
   for(const k of ['feed','operator','product','depMs','arrMs','stops','train']){
    const v=r[k],shape=v===null?'null':typeof v;
    fields[k+':'+shape]=(fields[k+':'+shape]||0)+1;
   }
  }
  return {line,status:'ok',corridor:[from,to],raw_count:trains.length,
   valid_for_requested_line:valid.length,raw_types:pattern,field_types:fields,
   note:'One illustrative corridor/day; not proof of full line coverage'};
 }catch(e){return {line,status:e.name==='AbortError'?'timeout':'error',reason:e.name}}
 finally{clearTimeout(stop)}
}
(async()=>{
 const out=[];
 for(let i=0;i<probes.length;i+=4){
  const batch=await Promise.all(probes.slice(i,i+4).map(probe));
  out.push(...batch);
  for(const x of batch)console.log(JSON.stringify(x));
 }
 console.log('TOTALS',JSON.stringify({lines_checked:out.length,valid_corridors:out.filter(x=>x.valid_for_requested_line>0).length,
  zero_or_error:out.filter(x=>!(x.valid_for_requested_line>0)).map(x=>x.line)}));
})().catch(e=>{console.error(e);process.exitCode=1});
