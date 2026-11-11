'use strict';
/* Mi Rodalies 1.3 | GTFS programado oficial + observaciones multifuente; sin votos artificiales. */
const PROVIDERS = Object.freeze({
  val: 'https://trenes.valfiguer.com/api/v1',
  radar: 'https://radardetrenes.com/api/v1',
  trenalia: 'https://trenalia.org/api/v1',
  official: './data/schedule-r4.json'
});
const STOPS = Object.freeze({est:'78710',placa:'78805',sants:'71801'});
const ROUTES = Object.freeze({
  ida:{label:'Ida',from:STOPS.est,to:STOPS.placa,fromName:'Terrassa Est',toName:'Barcelona-Plaça de Catalunya'},
  vuelta:{label:'Vuelta',from:STOPS.sants,to:STOPS.est,fromName:'Barcelona-Sants',toName:'Terrassa Est'}
});
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2,'0');
const fmtTime = new Intl.DateTimeFormat('es-ES',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/Madrid'});
const fmtDay = new Intl.DateTimeFormat('en-GB',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Europe/Madrid'});
const dayParts = d => Object.fromEntries(fmtDay.formatToParts(d).map(v=>[v.type,v.value]));
const today = () => {const x=dayParts(new Date());return `${x.year}-${x.month}-${x.day}`;};
const dayOf = d => {if(!(d instanceof Date)||!Number.isFinite(+d))return '';const x=dayParts(d);return `${x.year}-${x.month}-${x.day}`;};
const hm = d => d instanceof Date && Number.isFinite(+d)?fmtTime.format(d):'—';
const clean = s => String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const first = (...values) => values.find(v=>v!==undefined&&v!==null&&v!=='');
const num = v => String(v??'').replace(/^0+(?=\d)/,'').trim();
const parseTime = s => {const m=/^(\d\d):(\d\d)$/.exec(String(s??''));if(!m)return NaN;const h=+m[1],mi=+m[2];return h<24&&mi<60?h*60+mi:NaN;};
const minuteLabel = m => `${pad(Math.floor(m/60))}:${pad(m%60)}`;
const minuteOf = d => parseTime(hm(d));
const nowMinute = () => minuteOf(new Date());
const clamp = (n,min,max) => Math.min(max,Math.max(min,n));
const escapeDate = s => /^\d{4}-\d\d-\d\d$/.test(s);
const el = (tag,cls,txt) => {const o=document.createElement(tag);if(cls)o.className=cls;if(txt!==undefined)o.textContent=String(txt);return o;};
const isoLocalDate = (day,clock) => {
  // Feed sin zona horaria: usar horario peninsular, considerando CET/CEST.
  if(!escapeDate(day)||!/^\d\d:\d\d$/.test(clock))return null;
  const tentative = new Date(`${day}T${clock}:00Z`);
  if(!Number.isFinite(+tentative))return null;
  const offset = new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Madrid',timeZoneName:'shortOffset'}).formatToParts(tentative).find(x=>x.type==='timeZoneName')?.value||'GMT+1';
  const found=/GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(offset);
  const mins = found ? (found[1]==='-'?-1:1)*(Number(found[2])*60+Number(found[3]||0)):60;
  return new Date(+tentative-mins*60000);
};
function date(v){
  if(v==null||v==='')return null;
  if(v instanceof Date)return Number.isFinite(+v)?v:null;
  if(typeof v==='object')return date(first(v.ts,v.timestamp,v.epoch,v.scheduled,v.iso,v.value));
  if(typeof v==='number'||/^\d{10,13}$/.test(String(v))){const n=Number(v),d=new Date(n<1e11?n*1000:n);return Number.isFinite(+d)?d:null;}
  if(/^\d\d:\d\d(?::\d\d)?$/.test(String(v)))return isoLocalDate(today(),String(v).slice(0,5));
  const d=new Date(v);return Number.isFinite(+d)?d:null;
}
const ageText = sec => !Number.isFinite(sec)?'desconocida':sec<60?`${Math.round(sec)} s`:`${Math.round(sec/60)} min`;
let mode = localStorage.getItem('rodalies-route-v13')==='vuelta'?'vuelta':'ida';
let seq=0,controller=null,lastData=null,toastTimer=null,validationCache=new Map(),officialCache=null;
const active = () => ROUTES[mode];
function notify(text){const box=$('toast');box.textContent=text;box.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>box.classList.remove('show'),1850);}
function setConnection(kind,label){const e=$('connection');e.className=`connection ${kind}`;e.lastChild.textContent=label;}
function setBusy(value){$('refresh').classList.toggle('loading',value);$('refresh').disabled=value;$('refresh-label').textContent=value?'Consultando…':'Actualizar';$('apply').classList.toggle('loading',value);$('fetch-progress').classList.toggle('running',value);$('apply').setAttribute('aria-busy',String(value));}
function readRange(){const start=parseTime($('from-time').value),end=parseTime($('to-time').value);if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)throw new Error('La hora «Hasta» debe ser posterior a «Desde» dentro del mismo día.');return {start,end};}
function inRange(d,r){return !!d&&dayOf(d)===today()&&minuteOf(d)>=r.start&&minuteOf(d)<=r.end;}
function saveRange(){const range={day:today(),from:$('from-time').value,to:$('to-time').value};try{localStorage.setItem(`rodalies-time-${mode}`,JSON.stringify(range));}catch{}}
function loadRange(){let r;try{r=JSON.parse(localStorage.getItem(`rodalies-time-${mode}`)||'null');}catch{};const start=clamp(Math.floor(nowMinute()/15)*15,0,1438);$('from-time').value=r?.day===today()&&Number.isFinite(parseTime(r.from))?r.from:minuteLabel(start);$('to-time').value=r?.day===today()&&Number.isFinite(parseTime(r.to))?r.to:minuteLabel(Math.min(start+120,1439));selectQuick(null);}
function selectQuick(hours){document.querySelectorAll('[data-range]').forEach(b=>{const on=hours===Number(b.dataset.range);b.classList.toggle('chosen',on);b.setAttribute('aria-pressed',String(on));});}
function quick(hours){const start=clamp(Math.floor(nowMinute()/15)*15,0,1438);$('from-time').value=minuteLabel(start);$('to-time').value=minuteLabel(Math.min(start+60*hours,1439));selectQuick(hours);saveRange();notify(`Franja de ${hours} h seleccionada`);refresh('Franja actualizada');}
function changeMode(target){if(!ROUTES[target])return;mode=target;localStorage.setItem('rodalies-route-v13',mode);for(const x of Object.keys(ROUTES)){const b=$(`tab-${x}`),on=x===target;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));}const r=active();$('origin').textContent=r.fromName;$('destination').textContent=r.toName;loadRange();notify(`${r.label}: ${r.fromName}`);refresh('Trayecto cambiado');}
async function getJson(url,signal,ms=8500){
  const ac=new AbortController();const timeout=setTimeout(()=>ac.abort(),ms);
  const stop=()=>ac.abort();signal?.addEventListener('abort',stop,{once:true});
  try{const response=await fetch(url,{signal:ac.signal,headers:{Accept:'application/json'},cache:'no-store',credentials:'omit'});if(!response.ok)throw new Error(`HTTP ${response.status}`);return await response.json();}
  finally{clearTimeout(timeout);signal?.removeEventListener('abort',stop);}
}
async function getOfficial(signal){
  // Los commits automáticos de GitHub Actions NO generan una nueva publicación de GitHub Pages.
  // Por eso consultamos el JSON actualizado en la rama pública; si falla CORS, probamos Pages.
  if(officialCache&&Date.now()-officialCache.at<30*60000)return officialCache.data;
  const host=location.hostname,owner=host.endsWith('.github.io')?host.slice(0,-'.github.io'.length):'arl338';
  const repo=location.pathname.split('/').filter(Boolean)[0]||'mi-rodalies-r4';
  const urls=[`https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/main/data/schedule-r4.json`,PROVIDERS.official];
  for(const url of urls){
    try{const d=await getJson(url,signal,4800);if(d&&d.schema===1&&Array.isArray(d.trains)){officialCache={at:Date.now(),data:d};return d;}}
    catch(e){if(signal?.aborted)throw e;}
  }
  return null;
}
function recordRows(data){
  if(Array.isArray(data))return data;
  if(!data||typeof data!=='object')return [];
  // Las APIs pueden devolver {trains}, {departures}, {data:{departures}} o agrupaciones de tableros.
  const keys=['departures','salidas','trains','services','rows','runs','items','results','journeys','data','board','upcoming','schedules','timetable','entries','lista','result'];
  const queue=[data],seen=new WeakSet(),out=[];
  while(queue.length&&out.length<450){const obj=queue.shift();if(!obj||typeof obj!=='object'||seen.has(obj))continue;seen.add(obj);if(Array.isArray(obj)){for(const x of obj){if(x&&typeof x==='object'&&(x.properties||first(x.train_number,x.trainNumber,x.trainCode,x.number,x.numero,x.train,x.trip_id,x.planned_ts,x.departureTime,x.scheduledDeparture,x.departure,x.time)))out.push(x);else if(x&&typeof x==='object')queue.push(x);}continue;}for(const key of keys)if(obj[key]&&typeof obj[key]==='object')queue.push(obj[key]);}
  return out;
}
function normal(raw,source){
  const o=raw?.properties||raw||{};
  const t=o.train&&typeof o.train==='object'?o.train:{};
  const scheduled=date(first(o.planned_ts,o.planned_departure_ts,o.scheduled_departure_ts,o.scheduledDeparture,o.scheduledDepartureTime,o.scheduledTime,o.plannedTime,o.planned,o.scheduled,o.departure?.planned_ts,o.departure?.scheduled,o.departure?.scheduled_ts,o.departure_time,o.departureTime,o.depMs,o.departure,o.time));
  const estimated=date(first(o.estimated_ts,o.estimated_departure_ts,o.estimatedDeparture,o.estimatedDepartureTime,o.estimatedTime,o.estimated,o.expectedTime,o.realtime,o.realTime,o.departure?.estimated_ts,o.departure?.estimated,o.predicted_departure_ts));
  const n=num(first(o.train_number,o.trainNumber,o.trainCode,o.numero,o.number,o.service_number,o.serviceNumber,t.number,t.code,o.train));
  const state=String(first(o.state,o.status,o.trip_status,'')).toLowerCase();
  const canc=o.cancelled===true||o.canceled===true||o.isCancelled===true||/cancel|suprim/.test(state);
  const line=String(first(o.product,o.productName,o.line,o.lineName,o.route,o.linea,o.routeName,'')??'').trim();
  const dest=first(o.destination?.name,o.destinationName,o.destination_name,o.destination,o.headsign,o.to?.name,o.destino,'');
  const delayDirect=first(o.delay_s,o.delay_seconds,o.departure?.delay_s);
  const delayMinutes=first(o.delayMinutes,o.delay_min,o.delay_minutes);
  const delay=delayDirect!==undefined?Number(delayDirect):delayMinutes!==undefined?Number(delayMinutes)*60:null;
  const stamp=date(first(o.reported_at,o.position_timestamp,o.timestamp,o.updatedAt,o.source_timestamp));
  const ageValue=first(o.age_s,o.position_age_s);
  const age=ageValue===undefined?(stamp?Math.max(0,(Date.now()-stamp.valueOf())/1000):null):Number(ageValue);
  const lat=Number(first(raw?.geometry?.coordinates?.[1],o.latitude,o.lat,o.position?.lat));
  const lon=Number(first(raw?.geometry?.coordinates?.[0],o.longitude,o.lon,o.lng,o.position?.lon));
  return {source,number:n,tripId:String(first(o.trip_id,o.tripId,'')??''),liveId:String(first(raw?.id,o.id,'')??''),line,destination:String(dest??''),planned:scheduled,estimated,cancelled:canc,delay:Number.isFinite(delay)?delay:null,stamp,age:Number.isFinite(age)?age:null,stale:o.stale===true,lat:Number.isFinite(lat)?lat:null,lon:Number.isFinite(lon)?lon:null,platform:String(first(o.platform,o.platformName,o.track,o.via,'')??''),raw:o};
}
function lineAllowed(t){const c=clean(t.line);if(!c)return true;if(c==='r4'||c==='r4nord'||c==='r4sud')return true; // Algunas fuentes no publican la línea: validar siempre por paradas.
  return !/^r\d/.test(c)&&!/^c\d/.test(c);
}
function sameTrain(a,b){if(a.tripId&&b.tripId&&a.tripId===b.tripId)return true;if(!a.number||!b.number||a.number!==b.number)return false;if(a.planned&&b.planned)return Math.abs(+a.planned-(+b.planned))<=4*60000;return false;}
function stopsOf(run){const r=run?.itinerary||run?.route||run?.journey||{};return first(r.stops,run?.stops,run?.stations,run?.callingPoints,run?.paradas,[]);}
function stopCode(s){return String(first(s.code,s.station_code,s.stop_id,s.stationCode,s.station?.code,s.station?.id,'')??'');}
function stopName(s){return String(first(s.name,s.station_name,s.stop_name,s.stationName,s.station?.name,typeof s.station==='string'?s.station:'','')??'');}
function matchesStation(s,code){const c=stopCode(s),n=clean(stopName(s));if(c===code)return true;if(code===STOPS.est)return n==='terrassaest'||n==='terrassaestacioest';if(code===STOPS.placa)return n.includes('catalunya')&&(n.includes('barcelona')||n.includes('placa')||n.includes('pl'));if(code===STOPS.sants)return n.includes('sants')&&(n.includes('barcelona')||n==='sants');return false;}
function stopTime(s){return date(first(s.departure_ts,s.depTs,s.depMs,s.planned_departure_ts,s.scheduled_departure_ts,s.departure?.scheduled,s.departure?.planned_ts,s.departureTime,s.departure,s.arrival_ts,s.arrivalTime,s.arrival,s.scheduled_ts,s.time));}
function findItinerary(stops,route){if(!Array.isArray(stops))return null;let from=-1;for(let i=0;i<stops.length;i++){if(from<0&&matchesStation(stops[i],route.from))from=i;else if(from>=0&&matchesStation(stops[i],route.to)){return {from:stops[from],to:stops[i]};}}return null;}
function candidatesFrom(data,source){return recordRows(data).map(r=>normal(r,source)).filter(t=>(t.number||(source==='gtfs'&&t.tripId))&&(t.planned||t.estimated)&&lineAllowed(t));}
function arrange(raws){const result=[];for(const t of raws){let hit=result.find(x=>sameTrain(x.base,t));if(!hit){result.push({base:t,evidence:[t],validated:t.source==='gtfs',validation:t.source==='gtfs'?'gtfs-official':'pending',verifiedDeparture:t.source==='gtfs'?t.planned:null});continue;}if(!hit.evidence.some(e=>e.source===t.source))hit.evidence.push(t);if(t.source==='gtfs'){hit.validated=true;hit.validation='gtfs-official';hit.verifiedDeparture=t.planned;hit.base=t;}else if(!hit.base.planned&&t.planned)hit.base=t;}return result;}
function suitableBase(c,r){return c.evidence.some(e=>inRange(e.planned||e.estimated,r));}
function statusLabel(state){return {live:'Posición reciente',scheduled:'Solo horario',cancelled:'Cancelado',conflict:'Discrepancia',tentative:'Posible tren'}[state]||'Sin verificar';}
function cancellationMatch(v,c){for(const t of recordRows(v)){const x=normal(t,'Cancelaciones Renfe');if(x.tripId&&c.base.tripId&&x.tripId===c.base.tripId)return true;if(x.number&&x.number===c.base.number&&x.planned&&c.base.planned&&Math.abs(+x.planned-(+c.base.planned))<4*60000)return true;}return false;}
function telemetry(c,feeds){const n=c.base.number,ids=new Set(c.evidence.map(e=>e.tripId).filter(Boolean));const found=feeds.filter(x=>x.number===n&&(!x.tripId||!ids.size||ids.has(x.tripId))&&x.stamp&&!x.stale&&x.age!==null&&x.age>=0&&x.age<=135&&Math.abs(Date.now()-(+x.stamp))<=160000&&(!x.line||clean(x.line)==='r4'||clean(x.line)==='r4nord'||clean(x.line)==='r4sud') );found.sort((a,b)=>(a.age??999)-(b.age??999));return found[0]||null;}
function lastMovement(t){if(!t?.liveId||t.lat===null||t.lon===null||!t.stamp)return null;let old;const key=`r4pos-${t.liveId}`;try{old=JSON.parse(localStorage.getItem(key)||'null');}catch{}const fresh={ts:+t.stamp,lat:t.lat,lon:t.lon};try{localStorage.setItem(key,JSON.stringify(fresh));}catch{}
  if(!old||!Number.isFinite(old.ts)||fresh.ts-old.ts<12000||fresh.ts-old.ts>240000)return null;
  const rad=Math.PI/180,a=Math.sin((fresh.lat-old.lat)*rad/2)**2+Math.cos(old.lat*rad)*Math.cos(fresh.lat*rad)*Math.sin((fresh.lon-old.lon)*rad/2)**2;
  const dist=12742*Math.asin(Math.sqrt(Math.min(1,a)));const kmh=dist*3600000/(fresh.ts-old.ts);
  return dist>=.2&&kmh<180?dist:null;
}
function chooseEvidence(c,positions,cancellations){
  const live=c.validated?telemetry(c,positions):null;
  const canc=c.evidence.some(x=>x.cancelled)||c.validationCancelled||cancellationMatch(cancellations,c);
  const estimated=c.evidence.filter(e=>e.estimated).sort((a,b)=>({radar:0,val:1,trenalia:2}[a.source]??3)-({radar:0,val:1,trenalia:2}[b.source]??3));
  const published=estimated[0]||null;
  const disagreement=estimated.length>1&&estimated.some(x=>Math.abs(+x.estimated-(+published.estimated))>5*60000);
  const liveAfterCancel=!!live&&canc;
  const state=!c.validated?'tentative':liveAfterCancel||disagreement?'conflict':canc?'cancelled':live?'live':'scheduled';
  const official=c.evidence.find(e=>e.source==='gtfs'&&e.planned);const schedule=official?.planned||c.verifiedDeparture||c.base.planned||c.evidence.find(e=>e.planned)?.planned||null;
  const shown=published?.estimated||schedule||c.base.estimated;
  return {state,live,shown,schedule,published,disagreement,canc,movement:live?lastMovement(live):null};
}
function rowText(label,value){const e=el('div','');e.append(el('strong','',label),document.createTextNode(value));return e;}
function makeTrain(c,x){const article=el('article',`train ${x.state}`),head=el('div','train-main'),left=el('div','train-times'),right=el('div','train-state');
  left.append(el('div','train-time',hm(x.shown)),el('div','time-kind',x.published?'Salida estimada':x.schedule?'Salida programada':'Hora publicada'));
  if(x.schedule&&x.published&&Math.abs(+x.schedule-(+x.published.estimated))>=60000)left.append(el('div','time-kind',`Programada: ${hm(x.schedule)}`));
  right.append(el('span',`pill ${x.state}`,x.state==='scheduled'&&c.evidence.some(e=>e.source==='gtfs')?'Horario oficial':statusLabel(x.state)));
  const delay=x.published?.delay??c.base.delay;
  if(Number.isFinite(delay)&&delay!==0)right.append(el('div','delay',`${delay>0?'+':''}${Math.round(delay/60)} min`));
  head.append(left,right);article.append(head);
  article.append(el('div','train-name',`R4${c.base.number?' · Tren '+c.base.number:''}${c.base.destination?' · hacia '+c.base.destination:''}`));
  const platform=c.evidence.find(e=>e.platform)?.platform;if(platform)article.append(el('div','platform',`Vía ${platform}`));
  const evidence=el('div','train-evidence');const notes=[];
  notes.push(c.evidence.some(e=>e.source==='gtfs')?'Recorrido programado en GTFS oficial Renfe (NO implica que esté circulando)':c.validated?'Parada en destino comprobada':'Parada en destino no verificada');
  notes.push(`Fuentes: ${[...new Set(c.evidence.map(e=>({val:'Valfiguer',radar:'RadarDeTrenes',trenalia:'Trenalia',gtfs:'Renfe GTFS oficial'}[e.source]||e.source)))].join(', ')}`);
  if(x.live)notes.push(`Posición publicada: ${ageText(x.live.age)} (Renfe distribuido por ${x.live.source==='val'?'Valfiguer':'RadarDeTrenes'})`);
  else if(c.validated)notes.push('Sin posición reciente vinculada');
  if(x.movement)notes.push(`Posición publicada cambió ${x.movement.toFixed(1)} km desde la última consulta (podría ser estimada)`);
  if(x.disagreement)notes.push('Las estimaciones de las fuentes difieren más de 5 minutos');
  if(x.published)notes.push(`Estimación seleccionada: ${x.published.source==='radar'?'tablero ADIF/RadarDeTrenes':x.published.source==='val'?'Valfiguer':'Trenalia'}`);
  evidence.append(el('strong','', 'Evidencias: '),document.createTextNode(notes.join(' · ')));
  article.append(evidence);return article;
}
function updateTrains(ctx){if(!ctx||ctx.run!==seq)return;const confirmed=[],possible=[];let cancel=0,live=0,conflicts=0;const sorted=ctx.candidates.filter(c=>suitableBase(c,ctx.range)).sort((a,b)=>+((a.verifiedDeparture||a.base.planned||a.base.estimated)||0)-+((b.verifiedDeparture||b.base.planned||b.base.estimated)||0));
  for(const c of sorted){const info=chooseEvidence(c,ctx.positions,ctx.cancellations);if(c.validated){confirmed.push(makeTrain(c,info));if(info.state==='live')live++;if(info.state==='cancelled')cancel++;if(info.state==='conflict')conflicts++;}else possible.push(makeTrain(c,info));}
  $('trains').replaceChildren(...confirmed);$('unverified-trains').replaceChildren(...possible);$('unverified-panel').hidden=!possible.length;$('unverified-count').textContent=`${possible.length} posibles trenes`;
  $('result-count').textContent=`${confirmed.length} recorridos comprobados · ${possible.length} sin comprobar`;
  const notice=$('status');
  if(confirmed.length){notice.className='notice '+(conflicts?'bad':live?'good':'warn');notice.textContent=`${confirmed.length} trenes con recorrido comprobado · ${live} con posición reciente · ${cancel} cancelados${conflicts?' · '+conflicts+' discrepancias':''}. Los resultados son orientativos.`;}
  else if(possible.length){notice.className='notice warn';notice.textContent=`Hay ${possible.length} trenes anunciados en la estación, pero falta verificar que paren en el destino. No deben considerarse circulaciones confirmadas para este trayecto.`;}
  else{notice.className='notice warn';notice.textContent='No se han encontrado circulaciones verificables en las fuentes accesibles. No significa que no haya trenes ni que estén cancelados.';}
  if(ctx.pending>0){$('updated').textContent=`Verificando itinerarios (${ctx.checked}/${ctx.pending}) · ${hm(new Date())} · franja ${$('from-time').value}–${$('to-time').value}`;}
  else{$('updated').textContent=`Consulta ${hm(new Date())} · ${today()} · datos en vivo consultados cada 60 s. El horario oficial solo indica servicios programados.`;}
}
function sourceRow(source,good,count,extra=''){const line=el('div','source-row'),label=el('div','');label.append(el('strong','',source),el('small','',extra));line.append(label,el('span',good?'ok':'fail',count));return line;}
function renderSources(entries){$('sources').replaceChildren(...entries.map(s=>sourceRow(s.label,s.ok,s.detail,s.desc)));
  $('sources').append(el('p','help-text','Renfe/Valfiguer, Trenalia y RadarDeTrenes pueden compartir el origen del dato; el sistema no suma sus coincidencias como votos independientes.'));
}
function showAlerts(results){const out=[],seen=new Set();for(const [source,data] of results){const rows=recordRows(data);const alerts=Array.isArray(data?.alerts)?data.alerts:Array.isArray(data?.incidents)?data.incidents:rows;
    for(const item of alerts){const a=item?.properties||item||{};const parts=first(a.lines,a.affected_lines,a.routes,[]);const names=Array.isArray(parts)?parts.map(v=>typeof v==='string'?v:first(v.line,v.name,'')):[];
      const text=String(first(a.text,a.message,a.description,a.title,a.summary,''));const relevant=names.some(x=>clean(x)==='r4')||/\bR4\b/i.test(text);if(!relevant||!text)continue;const key=clean(text).slice(0,180);if(seen.has(key))continue;seen.add(key);out.push({source,text});if(out.length>=7)break;}if(out.length>=7)break;}
  $('alerts').replaceChildren(...(out.map(x=>{const e=el('div','alert-card',x.text);e.append(el('small','',`Fuente: ${x.source}`));return e;})));
  if(!out.length)$('alerts').append(el('p','muted','No hemos recuperado avisos específicos de la R4. Esto no demuestra que no existan incidencias.'));
}
function showHistory(data){$('history').replaceChildren();const days=Array.isArray(data?.days)?data.days:[];let trips=0,onTime=0,matchedDays=0;for(const d of days){const groups=d?.groups||[];const subset=groups.filter(x=>clean(x.label)==='r4'&&(!x.nucleo||/barcelona|rodalies|catalunya/i.test(x.nucleo)));if(subset.length)matchedDays++;for(const item of subset){trips+=Number(item.trips)||0;onTime+=Number(item.on_time)||0;}}
  if(!trips){$('history').append(el('p','muted','No hay una muestra R4 interpretable en la respuesta histórica. No se inferirán porcentajes.'));return;}
  const box=el('div','history-stats');for(const [value,label] of [[trips.toLocaleString('es-ES'),'Viajes publicados'],[`${(onTime/trips*100).toFixed(1).replace('.',',')} %`,'En hora según último retraso publicado']]){const e=el('div','history-stat');e.append(el('strong','',value),el('span','',label));box.append(e);} $('history').append(box,el('p','help-text',`Muestra: ${matchedDays} días con registros R4 (máximo 7). Esta estadística NO mide la llegada real a Terrassa Est ni predice el próximo tren.`));
}
function statEntry(label,description,result,parse){if(result.status==='rejected')return {label,desc:description,ok:false,detail:String(result.reason?.message||'No accesible').slice(0,90)};let n=0;try{n=parse(result.value);}catch{}return {label,desc:description,ok:true,detail:`${n} registros`};}
async function validate(c,route,signal){
  if(c.validated&&c.validation==='gtfs-official')return true;if(!c.base.number)return false;const key=`${today()}:${route.from}:${route.to}:${c.base.number}:${hm(c.base.planned||c.base.estimated)}`;
  const cached=validationCache.get(key);if(cached&&Date.now()-cached.at<120000){Object.assign(c,cached.value);return c.validated;}
  const number=encodeURIComponent(c.base.number),clock=hm(c.base.planned||c.base.estimated);
  const endpoints=[`${PROVIDERS.val}/horario/numero/${number}?nucleo=Barcelona`,`${PROVIDERS.trenalia}/trains/${number}/plan?estacion=${route.from}&hora=${encodeURIComponent(clock)}&destino=${route.to}`];
  let errors=0;
  for(const url of endpoints){
    let body;try{body=await getJson(url,signal,5700);}catch(e){if(signal.aborted)throw e;errors++;continue;}
    // Horario de Valfiguer: {runs:[{itinerary:{stops:[...]}}]}; Trenalia: {stops:[...]} o {train:{stops:[...]}}.
    const runs=recordRows(body);const schedules=[...runs,body,body?.train,body?.plan,body?.itinerary].filter(Boolean);
    for(const run of schedules){const stops=stopsOf(run);const proof=findItinerary(stops,route);if(!proof)continue;const departure=stopTime(proof.from);if(!departure||dayOf(departure)!==today())continue;
      const published=c.base.planned||c.base.estimated;
      if(published&&Math.abs(+departure-(+published))>7*60000)continue;
      const result={validated:true,verifiedDeparture:departure,validation:'itinerary',validationCancelled:run.cancelled===true||run.isCancelled===true};Object.assign(c,result);validationCache.set(key,{at:Date.now(),value:result});return true;
    }
  }
  const result={validated:false,validation:errors===endpoints.length?'source-failure':'no-match'};Object.assign(c,result);validationCache.set(key,{at:Date.now(),value:result});return false;
}
async function validateBatch(ctx,signal){const pending=ctx.candidates.filter(c=>!c.validated&&suitableBase(c,ctx.range)&&c.base.number).slice(0,24);
  ctx.pending=pending.length;ctx.checked=0;const workers=Math.min(5,pending.length);let cursor=0;
  async function work(){while(cursor<pending.length&&!signal.aborted&&ctx.run===seq){const i=cursor++,item=pending[i];try{await validate(item,ctx.route,signal);}catch{}ctx.checked++;if(ctx.run===seq)updateTrains(ctx);}}
  await Promise.all(Array.from({length:workers},work));ctx.pending=0;if(ctx.run===seq)updateTrains(ctx);
}
async function refresh(reason='Actualizando'){
  let range;try{range=readRange();}catch(e){notify('Revisa la franja horaria');$('status').className='notice bad';$('status').textContent=e.message;return;}
  saveRange();const my=++seq;if(controller)controller.abort();controller=new AbortController();const signal=controller.signal,route=active();
  setBusy(true);setConnection('waiting','Consultando');$('status').className='notice neutral';$('status').textContent='Consultando horarios, tableros e incidencias…';
  $('result-count').textContent='Búsqueda en curso';$('updated').textContent=`${reason} · ${hm(new Date())}`;
  const horizon=clamp(range.end-nowMinute()+30,15,720);
  const jobs=[
    ['Valfiguer · estación','Salidas próximas 2 h',`${PROVIDERS.val}/stations/${route.from}`],
    ['RadarDeTrenes · ADIF','Tablero de estación',`${PROVIDERS.radar}/stations/${route.from}/board-renfe`],
    ['Trenalia · estación',`Hasta ${Math.round(horizon/60*10)/10} h`,`${PROVIDERS.trenalia}/stations/${route.from}/board?type=departures&limit=180&horizon=${horizon}&lang=es`],
    ['Renfe · posiciones','Distribuidas por Valfiguer',`${PROVIDERS.val}/trains`],
    ['Renfe/ADIF · posiciones','Distribuidas por RadarDeTrenes',`${PROVIDERS.radar}/fleet?type=commuter`],
    ['Renfe · cancelaciones','Distribuidas por Valfiguer',`${PROVIDERS.val}/cancellations`],
    ['Renfe · avisos','Distribuidos por Valfiguer',`${PROVIDERS.val}/alerts`],
    ['ADIF · incidencias estación','Distribuidas por RadarDeTrenes',`${PROVIDERS.radar}/stations/${route.from}/alerts`],
    ['Valfiguer · puntualidad','Histórico 7 días',`${PROVIDERS.val}/puntualidad?dias=7`],
    ['Valfiguer · estado','Antigüedad de feeds',`${PROVIDERS.val}/status`],
    ['Renfe GTFS · horario oficial','CSV Renfe transformado en JSON desde GitHub',null]
  ];
  const results=await Promise.allSettled(jobs.map((j,i)=>i===10?getOfficial(signal):getJson(j[2],signal)));
  if(signal.aborted||my!==seq)return;
  const value=i=>results[i].status==='fulfilled'?results[i].value:null;
  const official=value(10);const officialOk=official?.schema===1&&official?.source?.includes('Renfe')&&official?.coverage_start<=today()&&official?.coverage_end>=today()&&date(official?.generated_at)&&Date.now()-(+date(official.generated_at))<72*3600000;
  const officialRows=officialOk&&Array.isArray(official.trains)?official.trains.filter(t=>t.route===mode&&t.service_day===today()&&t.from_code===route.from&&t.to_code===route.to):[];
  $('schedule-status').textContent=officialOk?`Horario oficial Renfe: ${officialRows.length} ${officialRows.length===1?"tren previsto":"trenes previstos"} para este trayecto hoy (no confirma circulación).`:'Horario GTFS oficial directo: pendiente de actualización. Como respaldo se consultan horarios GTFS redistribuidos por Valfiguer y Trenalia.';
  const raws=[];if(officialRows.length)raws.push(...candidatesFrom({trains:officialRows},'gtfs'));for(const i of [0,1,2])raws.push(...candidatesFrom(value(i),i===0?'val':i===1?'radar':'trenalia'));
  const candidates=arrange(raws);
  // Posiciones no crean una circulación de trayecto sin verificar el destino.
  const valPos=Array.isArray(value(3)?.features)?value(3).features.map(x=>normal(x,'val')):[];
  const radarPos=Array.isArray(value(4)?.trains)?value(4).trains.map(x=>normal(x,'radar')):[];
  const positions=[...valPos,...radarPos];
  const diagnostics=jobs.map((j,i)=>i===10?{label:j[0],desc:j[1],ok:!!officialOk,detail:officialOk?`${officialRows.length} previstos · actualizado ${hm(date(official.generated_at))}`:'No disponible o desactualizado'}:statEntry(j[0],j[1],results[i],v=>[3].includes(i)?v?.features?.length||0:i===4?v?.trains?.length||0:i===5?v?.trains?.length||0:i===6?v?.alerts?.length||0:i===9?v?.feeds?.length||0:recordRows(v).length));
  if(value(9)?.feeds){for(const f of value(9).feeds.filter(x=>/renfe_cer_(positions|updates)|renfe.*alerts/i.test(x.id||'')).slice(0,5))diagnostics.push({label:`Feed original ${f.id}`,desc:'Antigüedad del dato, no de la consulta',ok:!!f.ok&&!f.stale,detail:`${ageText(Number(f.data_age_s))}${f.stale?' · obsoleto':''}`});}
  renderSources(diagnostics);
  showAlerts([['Renfe vía Valfiguer',value(6)],['RadarDeTrenes',value(7)]]);
  showHistory(value(8));
  const ctx={run:my,route,range,candidates,positions,cancellations:value(5),pending:0,checked:0};lastData=ctx;updateTrains(ctx);
  const reachable=results.slice(0,10).filter(r=>r.status==='fulfilled').length;
  if(reachable===0&&!officialOk){setConnection('offline','Sin datos');$('status').className='notice bad';$('status').textContent='Ninguna API respondió y no hay horario oficial vigente. No es posible determinar si hay trenes.';}else if(reachable===0&&officialOk){setConnection('partial','Solo horarios');}
  else if(!officialOk&&!value(0)&&!value(1)&&!value(2)){setConnection('partial','Datos parciales');$('status').className='notice bad';$('status').textContent='No respondieron los tres paneles de estación. Las posiciones generales no bastan para enumerar salidas del trayecto.';}
  else setConnection(reachable===10?'online':'partial',reachable===10?'Fuentes accesibles':'Datos parciales');
  setBusy(false);
  if(!signal.aborted&&my===seq)void validateBatch(ctx,signal);
}
$('today-label').textContent=(()=>{const a=new Date(),dd=pad(+dayParts(a).day),mm=pad(+dayParts(a).month);return `${dd}/${mm}`;})();
$('tab-ida').addEventListener('click',()=>{if(mode==='ida'){notify('Ya estás en Ida');return;}changeMode('ida');});
$('tab-vuelta').addEventListener('click',()=>{if(mode==='vuelta'){notify('Ya estás en Vuelta');return;}changeMode('vuelta');});
$('refresh').addEventListener('click',()=>{notify('Actualizando fuentes…');refresh('Actualización manual');});
$('apply').addEventListener('click',()=>{selectQuick(null);notify('Consultando la franja seleccionada');refresh('Franja aplicada');});
for(const b of document.querySelectorAll('[data-range]'))b.addEventListener('click',()=>quick(Number(b.dataset.range)));
for(const id of ['from-time','to-time'])$(id).addEventListener('change',()=>{selectQuick(null);saveRange();notify('Hora modificada · pulsa «Ver trenes»');});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh('Aplicación reabierta');});
setInterval(()=>{if(!document.hidden&&!controller?.signal.aborted)refresh('Actualización automática');},60000);
if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
// Inicializar sin disparar peticiones duplicadas.
for(const x of Object.keys(ROUTES)){const on=x===mode;$(`tab-${x}`).classList.toggle('selected',on);$(`tab-${x}`).setAttribute('aria-pressed',String(on));}
$('origin').textContent=active().fromName;$('destination').textContent=active().toName;loadRange();refresh('Primera consulta');
