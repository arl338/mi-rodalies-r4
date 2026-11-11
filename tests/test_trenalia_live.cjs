'use strict';
const assert=require('node:assert/strict');
const E=require('../engine.js');
const day='2026-11-12';
const examples=[
  ['R4 ida','78710','78805','R4'],
  ['R4 vuelta','71801','78710','R4'],
  ['R2 Nord','71801','79100','R2N'],
  ['R2 Sud','71801','71700','R2S'],
];
(async()=>{
 for(const [name,from,to,line] of examples){
  const u=new URL('https://trenalia.org/api/v1/timetable');
  for(const [k,v] of Object.entries({from,to,date:day,limit:'400'}))u.searchParams.set(k,v);
  const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),12000);
  let res;
  try{res=await fetch(u,{signal:ac.signal,headers:{Accept:'application/json',Origin:'https://arl338.github.io'}});}
  finally{clearTimeout(timer);}
  assert.equal(res.status,200,name+' must respond 200');
  assert.equal(res.headers.get('access-control-allow-origin'),'*',
   name+' must be browser-accessible');
  const body=await res.json();
  const normalized=E.normalizeTrenaliaTimetable(body,from,to,day,line);
  assert.ok(normalized.length>=2,name+' must have two or more usable direct schedules');
  assert.ok(normalized.every(t=>t.l===line&&t.src==='trenalia-schedule-only'&&!t.n));
  for(const t of normalized)assert.ok(t.s[1][1]>t.s[0][2]);
  console.log(name+': '+body.trains.length+' third-party rows / '+normalized.length+
    ' valid schedules for '+line);
 }
})().catch(e=>{console.error(e);process.exitCode=1});
