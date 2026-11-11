'use strict';
/** Non-persistent, live end-to-end check of anonymous timetable -> board ETA.
 * Log aggregate counts only; zero currently usable observations is not a CI failure.
 */
const E=require('../engine.js');
const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'});
function day(){const d={};for(const p of fmt.formatToParts(new Date()))if(p.type!=='literal')d[p.type]=p.value;return d.year+'-'+d.month+'-'+d.day;}
async function get(url){const ac=new AbortController(),kill=setTimeout(()=>ac.abort(),9000);
 try{const r=await fetch(url,{signal:ac.signal,headers:{Accept:'application/json',Origin:'https://arl338.github.io'}});
 if(!r.ok)throw Error('HTTP_'+r.status);return r.json();}finally{clearTimeout(kill)}}
(async()=>{
 const d=day(),now=Math.floor(Date.now()/1000);
 for(const [lid,from,to] of [['R2N','71801','79100'],['R2S','71801','71700'],['R4','78710','78805']]){
  const params=new URLSearchParams({from,to,date:d,limit:'400'});
  const raw=await get('https://trenalia.org/api/v1/timetable?'+params);
  const alternatives=E.normalizeTrenaliaTimetable(raw,from,to,d,lid);
  const journeys=E.direct(alternatives,from,to,now-1800,now+7200);
  const board=[];
  const status=[];
  for(const [provider,url] of [['Valfiguer','https://trenes.valfiguer.com/api/v1/stations/'+from],
                                ['Radar','https://radardetrenes.com/api/v1/stations/'+from+'/board-renfe']]){
   try{const b=E.normalizeBoard(await get(url),provider,now,from);board.push(...b);
    status.push({source:provider,normalized:b.length,line_rows:b.filter(x=>x.line===lid).length,
     line_fresh_estimates:b.filter(x=>x.line===lid&&!x.stale&&x.age!==null&&x.age<=180&&x.estimated!==null).length});}
   catch(e){status.push({source:provider,error:String(e.message).slice(0,80)})}
  }
  const corrected=E.correlateTimetableBoards(journeys,board);
  const enriched=journeys.map(j=>E.enrichJourney(j,corrected,[],[],now));
  const linkedRows=corrected.filter(x=>x.linkedByScheduleOnly);
  const etaJourneys=enriched.filter(x=>x.estimated!==null);
  const conflictJourneys=enriched.filter(x=>x.conflict);
  console.log(JSON.stringify({line:lid,day:d,source_timetables:alternatives.length,
   journeys_in_two_hours:journeys.length,boards:status,unique_linked_rows:linkedRows.length,
   journeys_with_eta:etaJourneys.length,conflicts:conflictJourneys.length,
   no_position_falsely_claimed:enriched.every(x=>!x.live)}));
  if(enriched.some(x=>x.live))throw Error('Anonymous schedule must not imply confirmed position');
 }
})().catch(e=>{console.error(e);process.exitCode=1});
