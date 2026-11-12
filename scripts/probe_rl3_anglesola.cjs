'use strict';
/** Diagnostic only: compare RL3 direct pair to full Lleida-Cervera corridor;
 * only aggregate counts and commercial product, never unique train observations.
 */
const E=require('../engine.js'),pairs=[
 ['anglesola-lleida','78407','78400'],['lleida-anglesola','78400','78407'],
 ['cervera-lleida','78500','78400'],['lleida-cervera','78400','78500'],
 ['tarrega-lleida','78408','78400'],['anglesola-cervera','78407','78500']
];
(async()=>{
 const date='2026-11-12';for(const [name,from,to] of pairs){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),14000);
 try{
 const u='https://trenalia.org/api/v1/timetable?'+new URLSearchParams({from,to,date,limit:'400'});
 const r=await fetch(u,{signal:controller.signal,headers:{Origin:'https://arl338.github.io',Accept:'application/json'}});if(!r.ok)throw Error('HTTP '+r.status);
 const data=await r.json(),valid=E.normalizeTrenaliaTimetable(data,from,to,date,'RL3');
 const counts={};
 for(const t of data.trains||[]){const label=String(t.product||'').replace(/\d/g,'#');counts[label]=(counts[label]||0)+1;}
 const rangeStart=Date.parse('2026-11-12T13:15:00+01:00')/1000,rangeEnd=Date.parse('2026-11-12T21:15:00+01:00')/1000;
 const inWindow=valid.filter(x=>x.s[0][2]>=rangeStart&&x.s[0][2]<=rangeEnd).length;
 console.log(JSON.stringify({name,from,to,apiCount:data.total,raw:data.trains?.length,valid:valid.length,inWindow,products:counts}));
 }catch(e){console.log(JSON.stringify({name,error:e.message}))}finally{clearTimeout(timer)}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
