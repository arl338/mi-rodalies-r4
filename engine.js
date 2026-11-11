/* Pure itinerary and evidence engine. No network, DOM, or personal data. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;root.RodaliesEngine=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
const LINES=new Set(['R1','R2','R2N','R2S','R3','R4','R7','R8','RG1','RT1','RT2','RL3','RL4','R11','R13','R14','R15','R16','R17']);
const DAY=86400000;
function norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function line(s){s=norm(s).toUpperCase().replace(/\s/g,'');if(s==='R2NORD'||s==='R2NORTE')s='R2N';if(s==='R2SUD'||s==='R2SUR')s='R2S';return LINES.has(s)?s:'';}
// Legacy C labels only describe Catalunya when the nucleus is explicitly
// Catalunya/Barcelona OR a specific board was fetched for a Catalan station.
const CATALAN_LEGACY=Object.freeze({C1:'R1',C2:'R2',C3:'R3',C4:'R4',C7:'R7',C8:'R8'});
function catalanNucleus(value){return /^(catalunya|cataluna|catalonia|barcelona|rodalies de catalunya)$/i.test(norm(value));}
function foreignNucleus(value){return !!norm(value)&&!catalanNucleus(value);}
function scopedLine(value,nucleus,verifiedCatalanStation=false){
 const explicit=line(value);
 if(foreignNucleus(nucleus))return '';
 if(explicit)return explicit;
 const legacy=norm(value).toUpperCase().replace(/\s/g,'');
 return (catalanNucleus(nucleus)||verifiedCatalanStation)?(CATALAN_LEGACY[legacy]||''):'';
}
function n(v){if(v===null||v===undefined||v==='')return null;const x=Number(v);return Number.isFinite(x)?x:null;}
function truth(v){return v===true||v==='true'||v===1;}
function rows(r){if(Array.isArray(r))return r;for(const v of [r?.trains,r?.alerts,r?.departures,r?.results,r?.data?.trains,r?.data?.departures,r?.board?.departures,r?.items,r?.features])if(Array.isArray(v))return v;return [];}
function ts(v){if(typeof v==='number')return v>=1e12?Math.floor(v/1000):v;if(typeof v==='string'){if(/^\d+$/.test(v))return ts(Number(v));const d=Date.parse(v);return Number.isFinite(d)?Math.floor(d/1000):null;}return null;}
function number(v){const s=String(v||'').trim();return /^\d{3,6}$/.test(s)?s:'';}
function ageSeconds(stamp,now){
 const seen=ts(stamp);
 if(seen===null)return null;
 const age=now-seen;
 // Clock skew beyond 30 seconds is not proof of a recent observation.
 return age>=-30?Math.max(0,age):null;
}
function sourceAge(o,now){return ageSeconds(o?.generated_ts??o?.generated_at??o?.updatedAt??o?.updated_at??o?.reported_at??o?.last_updated,now);}
function normalizeBoard(obj,source,now,requestedStation=''){const overallAge=sourceAge(obj,now),out=[];
 for(const original of rows(obj)){
  const r=original?.properties||original;
  if(!r||typeof r!=='object')continue;
  const planned=ts(r.planned_ts??r.plannedTime??r.scheduled_ts??r.departure_ts??r.scheduledDeparture??r.scheduled_departure??r.planned_at??r.departure?.scheduled);
  let estimated=ts(r.estimated_ts??r.estimatedTime??r.estimatedDeparture??r.estimated_departure??r.estimated_at??r.departure?.estimated);
  const tt=String(r.timeType??'').toUpperCase();
  const dm=n(r.delayMinutes??r.delay_minutes),ds=n(r.delay_s??r.delaySeconds);
  // Valfiguer publishes delay_s in seconds, RadarDeTrenes delayMinutes in minutes.
  if(estimated===null&&planned!==null&&ds!==null)estimated=planned+ds;
  else if(estimated===null&&planned!==null&&dm!==null&&tt!=='SCHEDULED')estimated=planned+dm*60;
  const trip=String(r.trip_id??r.tripId??r.trip?.tripId??'').trim();
  const num=number(r.train_number??r.trainNumber??r.trainCode??r.number);
  if(!trip&&!num)continue;
  const rowStamp=r.timestamp??r.reported_at??r.updatedAt;
  const rowAge=ageSeconds(rowStamp,now);
  const rawAge=n(r.age_s);
  // A malformed or future row timestamp cannot be rescued by a fresh response header.
  const age=rowStamp!==null&&rowStamp!==undefined?rowAge:(rawAge!==null&&rawAge>=0?rawAge:overallAge);
  const state=String(r.circulationState??r.state??r.status??'');
  const station=String(r.stationCode??r.station_code??r.stop_id??obj?.station?.code??requestedStation??'');
  if(requestedStation&&station&&station!==String(requestedStation))continue;
  const nucleus=r.nucleo??r.nucleus??r.core??obj?.station?.nucleo??'';
  if(foreignNucleus(nucleus))continue;
  const scoped=!!requestedStation&&station===String(requestedStation);
  out.push({source,number:num,trip,line:scopedLine(r.line,nucleus,scoped)||scopedLine(r.product,nucleus,scoped)||scopedLine(r.route,nucleus,scoped),planned,estimated,stale:truth(r.stale),
   platform:String(r.platform??r.track??r.via??''),cancelled:truth(r.cancelled)||/cancel|suprim|anula|supprim|suppress|suspend/i.test(state),
   age,station,raw:r});
 }return out;
}
function normalizePositions(obj,source,now){const out=[];
 for(const original of rows(obj)){
  const p=original?.properties||original;
  if(!p||typeof p!=='object')continue;
  const runs=Array.isArray(p.runs)?p.runs:[p];
  for(const run of runs){
   const category=String(run.category??p.category??run.type??p.type??'').toLowerCase();
   const product=String(run.product??p.product??run.productName??p.productName??'').toUpperCase();
   if(/^(ld|long_distance|high_speed)$/.test(category)||/^(AVE|AVANT|ALVIA|EUROMED|INTERCITY)$/.test(product))continue;
   const trip=String(run.trip_id??run.tripId??run.trip?.tripId??p.trip_id??p.tripId??'').trim();
   const num=number(run.train_number??run.trainNumber??run.trainCode??run.number??p.train_number??p.trainNumber??p.trainCode??p.number);
   if(!trip&&!num)continue;
   const reported=ts(run.reported_at??run.reported_ts??p.reported_at??p.reported_ts??run.timestamp??p.timestamp);
   const rawAge=n(run.age_s??p.age_s);
   // Use the actual position timestamp when available; never silently turn
   // a stale or future observation into fresh telemetric evidence.
   const age=reported!==null?ageSeconds(reported,now):(rawAge!==null&&rawAge>=0?rawAge:null);
   const nucleus=run.nucleo??p.nucleo??run.core??p.core??'';
   if(foreignNucleus(nucleus))continue;
   const ln=scopedLine(run.line,nucleus)||scopedLine(p.line,nucleus)||scopedLine(run.product,nucleus)||scopedLine(p.product,nucleus)||scopedLine(run.route,nucleus);
   out.push({source,trip,number:num,line:ln,day:String(run.day??run.service_day??p.service_day??''),age,
    stale:truth(run.stale)||truth(p.stale),cancelled:truth(run.cancelled),reported,category});
  }
 }return out;
}
function normalizeCancels(obj){return rows(obj).flatMap(x=>{const r=x?.properties||x;if(!r||typeof r!=='object')return [];const nucleus=r.nucleo??r.core??'';if(foreignNucleus(nucleus))return [];const item={trip:String(r.trip_id??r.tripId??r.trip?.tripId??''),number:number(r.train_number??r.trainNumber??r.trainCode??r.number),line:scopedLine(r.line,nucleus)||scopedLine(r.product,nucleus),day:String(r.service_day??r.day??''),cancelled:true};return item.trip||item.number?[item]:[];});}
function direct(trains,from,to,start,end){const found=[];
 for(const t of trains){if(!LINES.has(t.l)||!Array.isArray(t.s))continue;
  for(let i=0;i<t.s.length-1;i++){
    if(t.s[i][0]!==from)continue;const dep=n(t.s[i][2]);if(dep===null||dep<start||dep>=end)continue;
    const j=t.s.findIndex((s,k)=>k>i&&s[0]===to&&n(s[1])>dep);
    if(j<0)continue;
    found.push({kind:'direct',depart:dep,arrive:t.s[j][1],legs:[{t,from,to,depart:dep,arrive:t.s[j][1]}],key:`${t.id}|${from}|${to}|${dep}`});break;
  }
 }
 const unique=new Map();for(const r of found)if(!unique.has(r.key))unique.set(r.key,r);
 return [...unique.values()].sort((a,b)=>a.depart-b.depart||a.arrive-b.arrive);
}
function transfers(trains,from,to,start,end,limit=32){
 const byStation=new Map();
 for(const t of trains){if(!LINES.has(t.l)||!Array.isArray(t.s))continue;
  const idx=t.s.findIndex(s=>s[0]===to);
  if(idx<=0)continue;
  for(let i=0;i<idx;i++){
   const s=t.s[i];if(!byStation.has(s[0]))byStation.set(s[0],[]);
   byStation.get(s[0]).push({t,at:i,dep:s[2],arr:t.s[idx][1]});
  }
 }
 for(const arr of byStation.values())arr.sort((a,b)=>a.dep-b.dep);
 const best=new Map();
 for(const t of trains){if(!LINES.has(t.l)||!Array.isArray(t.s))continue;
  for(let i=0;i<t.s.length-1;i++){
   const first=t.s[i];if(first[0]!==from||first[2]<start||first[2]>=end)continue;
   for(let j=i+1;j<t.s.length;j++){
    const interchange=t.s[j];const at=interchange[0];if(at===from||at===to)continue;
    const possible=byStation.get(at);if(!possible)continue;
    for(const next of possible){
     const wait=next.dep-interchange[1];if(wait<480)continue;if(wait>3600)break;
     if(next.t.id===t.id||next.arr<=next.dep||next.arr>first[2]+6*3600)continue;
     const key=`${t.id}|${first[2]}`;
     const candidate={kind:'transfer',depart:first[2],arrive:next.arr,transferAt:at,wait,legs:[{t,from,to:at,depart:first[2],arrive:interchange[1]},{t:next.t,from:at,to,depart:next.dep,arrive:next.arr}],key:`${t.id}|${next.t.id}|${at}|${first[2]}`};
     const previous=best.get(key);
     if(!previous||candidate.arrive<previous.arrive||(candidate.arrive===previous.arrive&&candidate.wait>previous.wait))best.set(key,candidate);
    }
   }
   break;
  }
 }
 return [...best.values()].sort((a,b)=>a.depart-b.depart||a.arrive-b.arrive).slice(0,limit);
}

/**
 * Emergency fallback for a missing GTFS journey, valid ONLY for today's
 * observed boards. Both endpoint calls must independently refer to the
 * same train and commercial line. No interpolation of intermediate stops.
 */
function boardOnlyDirect(from,to,fromRows,toRows,start,end,now){
 if(!/^[0-9]{5}$/.test(String(from))||!/^[0-9]{5}$/.test(String(to))||from===to)return [];
 const fresh=x=>!x.stale&&x.age!==null&&x.age>=0&&x.age<=180&&
  x.planned!==null&&Number.isFinite(x.planned);
 const valid=(x,station)=>fresh(x)&&x.station===station&&x.line&&LINES.has(x.line)&&x.number;
 const result=new Map();
 for(const o of fromRows){
  if(!valid(o,from)||o.planned<start||o.planned>end||o.planned<now-300)continue;
  for(const d of toRows){
   if(!valid(d,to)||d.line!==o.line||d.number!==o.number)continue;
   if(o.trip&&d.trip&&o.trip!==d.trip)continue;
   if(d.planned<=o.planned||d.planned-o.planned>6*3600)continue;
   const id=o.trip||d.trip||('board:'+o.line+':'+o.number+':'+o.planned);
   const key=o.line+'|'+o.number+'|'+o.planned+'|'+d.planned;
   const candidate={id,n:o.number,l:o.line,src:'operational-board',
     dest:String(d.raw?.destinationName??d.raw?.destination??to),
     s:[[from,o.planned,o.planned],[to,d.planned,d.planned]],
     alternative_trip_ids:[...new Set([o.trip,d.trip].filter(Boolean))],
     board_sources:[o.source,d.source]};
   const old=result.get(key);
   if(!old||candidate.alternative_trip_ids.length>old.alternative_trip_ids.length)result.set(key,candidate);
  }
 }
 return [...result.values()];
}

function serviceIds(t){return [t.id,...(t.alternative_trip_ids||[])].filter(Boolean).map(String);}
function matchExact(leg,item){
 const t=leg.t;
 if(item.line&&item.line!==t.l)return false;
 if(item.day&&t.day&&item.day!==t.day)return false;
 if(item.station&&item.station!==leg.from)return false;
 if(item.number&&t.n&&String(Number(item.number))!==String(Number(t.n)))return false;
 if(item.planned!==null&&item.planned!==undefined&&Math.abs(item.planned-leg.depart)>180)return false;
 if(item.trip){return serviceIds(t).includes(String(item.trip));}
 // Without trip id, require all three independent matching dimensions.
 return !!(t.n&&item.number&&String(Number(t.n))===String(Number(item.number))&&item.line===t.l&&item.planned!==null&&item.planned!==undefined);
}
function matchPosition(leg,item){
 const t=leg.t;
 if(item.stale||item.age===null||item.age<0||item.age>90)return false;
 if(item.category==='ld'||item.category==='long_distance')return false;
 if(item.day&&t.day&&item.day!==t.day)return false;
 if(item.line&&item.line!==t.l)return false;
 if(item.number&&t.n&&String(Number(item.number))!==String(Number(t.n)))return false;
 return !!(item.trip&&serviceIds(t).includes(String(item.trip)));
}
function enrichLeg(leg,board,positions,cancels,now){
 const current={...leg,state:'scheduled',estimated:null,delay:null,platform:'',proof:[],position:null,cancelled:false,conflict:false};
 const matched=board.filter(x=>(!x.boardStop||x.boardStop===leg.from)&&matchExact(leg,x));
 const freshBoard=matched.filter(x=>!x.stale&&x.age!==null&&x.age>=0&&x.age<=180&&x.planned!==null);
 const plausible=freshBoard.filter(x=>x.estimated!==null&&x.estimated>=now-300&&x.estimated>=leg.depart-1200&&x.estimated<leg.depart+4*3600);
 plausible.sort((a,b)=>a.age-b.age);
 if(plausible.length){
  // A large contradiction means no single verified ETA can be selected.
  if(plausible.some(x=>Math.abs(x.estimated-plausible[0].estimated)>300)){
   current.conflict=true;
   current.proof.push('Estimaciones contradictorias (>5 min): '+plausible.slice(0,3).map(x=>x.source+' '+new Date(x.estimated*1000).toLocaleTimeString('es-ES',{timeZone:'Europe/Madrid',hour:'2-digit',minute:'2-digit'})).join(' / '));
  }else{
   const candidate=plausible[0];current.estimated=candidate.estimated;
   current.delay=candidate.estimated-leg.depart;current.platform=candidate.platform;
   current.proof.push(`Estimación ${candidate.source} (${Math.round(candidate.age)} s)`);
  }
 }
 const pos=positions.filter(p=>matchPosition(leg,p)).sort((a,b)=>a.age-b.age)[0];
 if(pos){current.position=pos;current.state='live';current.proof.push(`Posición identificada hace ${Math.round(pos.age)} s (${pos.source})`);}
 const officialCancelled=cancels.some(x=>x.trip&&serviceIds(leg.t).includes(String(x.trip))&&(!x.day||x.day===leg.t.day)&&(!x.line||x.line===leg.t.l));
 const boardCancelled=freshBoard.some(x=>x.cancelled);
 if(officialCancelled||boardCancelled){current.cancelled=true;current.conflict=!!current.position||current.conflict;current.proof.push('Cancelación atribuida al servicio');}
 if(current.conflict)current.state='conflict';else if(current.cancelled)current.state='cancelled';
 if(!current.proof.length)current.proof.push('Solo horario oficial; sin observación vinculada');
 return current;
}
function enrichJourney(journey,board,positions,cancels,now){const legs=journey.legs.map(l=>enrichLeg(l,board,positions,cancels,now));
 const canceled=legs.some(l=>l.cancelled),conflict=legs.some(l=>l.conflict),live=legs.some(l=>!!l.position);
 const delayedFirst=journey.kind==='transfer'&&legs[0].estimated!==null&&legs[0].delay!==null;
 // This is a conservative *risk*, NOT a predicted arrival: the train might recover time.
 const connectionRisk=!!(delayedFirst&&journey.wait-Math.max(0,legs[0].delay)<480);
 return {...journey,legs,state:conflict?'conflict':canceled?'cancelled':connectionRisk?'at-risk':journey.kind==='transfer'?'transfer':live?'live':'scheduled',estimated:legs[0].estimated,cancelled:canceled,conflict,live,connectionRisk,connectionUnverified:journey.kind==='transfer'};
}
function alertsForLines(obj,lines,stationScoped=false){
 const incoming=rows(obj),found=[],seen=new Set();
 for(const item of incoming){
  const r=item?.properties||item;
  if(!r||typeof r!=='object')continue;
  const description=String(r.text??r.description??r.message??r.header_text??'').trim();
  if(!description)continue;
  // Some station-scoped providers return one 'line' rather than 'lines'.
  // A declared non-matching line must never become a generic alert.
  const entries=Array.isArray(r.lines)?r.lines:
    (r.line!=null?[r.line]:(r.product!=null?[r.product]:[]));
  const nucleus=r.nucleo??r.nucleus??r.core??'';
  if(foreignNucleus(nucleus))continue;
  const labels=[];
  for(const entry of entries){
   const label=typeof entry==='string'?entry:(entry?.line??entry?.name??entry?.id);
   const core=typeof entry==='object'?(entry?.nucleo??entry?.nucleus??entry?.core??nucleus):nucleus;
   if(foreignNucleus(core))continue;
   const mapped=scopedLine(label,core,stationScoped);
   if(mapped)labels.push(mapped);
  }
  // Never turn a foreign/unknown line into a network-wide notice.
  if(entries.length&&!labels.length)continue;
  if(labels.length&&!labels.some(x=>lines.has(x)))continue;
  // General alerts need explicit geographic scope, not the generic phrase
  // "servicio de Cercanías" which can refer to any Spanish rail nucleus.
  if(!labels.length&&!stationScoped&&!catalanNucleus(nucleus)&&!/(rodalies de catalunya|rodalies catalunya|catalunya)/i.test(description))continue;
  const key=String(r.id||'')+'|'+norm(description)+'|'+labels.join(',');
  if(seen.has(key))continue;seen.add(key);
  found.push({text:description,lines:[...new Set(labels)],source:r.source||''});
 }
 return found.slice(0,12);
}

return {LINES,norm,line,scopedLine,catalanNucleus,n,ts,rows,normalizeBoard,normalizePositions,normalizeCancels,direct,transfers,boardOnlyDirect,matchExact,matchPosition,enrichLeg,enrichJourney,alertsForLines};
});
