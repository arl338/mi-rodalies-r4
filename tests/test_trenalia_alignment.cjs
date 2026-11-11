'use strict';
/**
 * Compare Trenalia schedule-only times to original GTFS on a line already
 * covered by both sources. Aggregate match diagnostics, no raw train IDs.
 * Same upstream Renfe data may be used by both; not an independent verifier.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const E=require('../engine.js');
const day='2026-11-12',now=Math.floor(Date.now()/1000);
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','v2',day+'.json'),'utf8'));
const c=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','v2','catalog.json'),'utf8'));
assert.equal(data.batch_id,c.batch_id);
const examples=[['ida','78710','78805'],['vuelta','71801','78710']];
const start=Date.parse(day+'T00:00:00+01:00')/1000,end=start+86400;
(async()=>{
 for(const [name,from,to] of examples){
  const p=new URLSearchParams({from,to,date:day,limit:'400'});
  const res=await fetch('https://trenalia.org/api/v1/timetable?'+p);
  assert.equal(res.status,200);const x=await res.json();
  const alternative=E.normalizeTrenaliaTimetable(x,from,to,day,'R4');
  const gtfs=E.direct(data.trains.filter(t=>t.l==='R4'),from,to,start,end);
  let closeDepart=0,closeBoth=0,exactDepart=0,withDifference=[],unmatched=0;
  for(const t of alternative){
   const dep=t.s[0][2],arr=t.s[1][1];
   const matches=gtfs.filter(g=>Math.abs(g.depart-dep)<=180);
   if(!matches.length){unmatched++;continue;}
   closeDepart++;if(matches.some(g=>g.depart===dep))exactDepart++;
   const closest=matches.sort((a,b)=>Math.abs(a.depart-dep)-Math.abs(b.depart-dep))[0];
   const error=Math.abs(closest.arrive-arr);
   withDifference.push(error);
   if(error<=180)closeBoth++;
  }
  const sample={name,gtfs:gtfs.length,alternative:alternative.length,
   matched_departures_3min:closeDepart,exact_departures:exactDepart,
   matched_departure_and_arrival_3min:closeBoth,
   unmatched,arrival_difference_max_seconds:withDifference.length?Math.max(...withDifference):null};
  console.log(JSON.stringify(sample));
  assert.ok(gtfs.length>5&&alternative.length>5);
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
