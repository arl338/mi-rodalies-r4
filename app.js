'use strict';
// V1.1: sources are correlated by shared upstream data, not treated as independent votes.
const BASE='https://trenes.valfiguer.com/api/v1';
const PEN='https://mobilitatpenedes.cat';
const ROUTES={ida:{from:'Terrassa Est',to:'Barcelona Plaça de Catalunya',titleFrom:'Terrassa Est',titleTo:'Barcelona-Plaça de Catalunya'},vuelta:{from:'Barcelona-Sants',to:'Terrassa Est',titleFrom:'Barcelona-Sants',titleTo:'Terrassa Est'}};
const $=id=>document.getElementById(id);
const clockFmt=new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',hour:'2-digit',minute:'2-digit'});
let mode=localStorage.getItem('r4-route')==='vuelta'?'vuelta':'ida', codes=null, pending=false, serial=0, lastOk=null, penStations=null;
const clock=d=>d instanceof Date&&Number.isFinite(d.getTime())?clockFmt.format(d):'—';
function dateOf(v){if(v==null||v==='')return null;const n=Number(v);const d=Number.isFinite(n)?new Date(n<1e11?n*1000:n):new Date(v);return Number.isFinite(d.getTime())?d:null;}
function first(...vs){return vs.find(v=>v!==undefined&&v!==null&&v!=='');}
function clean(s){return String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function node(tag,cls,value){const e=document.createElement(tag);if(cls)e.className=cls;if(value!=null)e.textContent=String(value);return e;}
function prettyAge(s){if(!Number.isFinite(Number(s)))return 'sin hora';s=Number(s);return s<60?`${Math.round(s)} s`:`${Math.ceil(s/60)} min`;}
async function getJson(url,timeout=12000){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);try{const r=await fetch(url,{headers:{Accept:'application/json'},cache:'no-store',signal:controller.signal});if(!r.ok)throw Error(`HTTP ${r.status}`);return await r.json();}finally{clearTimeout(timer);}}
async function val(path){return getJson(BASE+path);}
function codeFor(features,name){const matches=features.map(f=>f.properties||f).filter(p=>clean(first(p.name,p.nombre))===clean(name));if(matches.length!==1)throw Error(`Estación no identificada de forma única: ${name}`);return String(first(matches[0].code,matches[0].id));}
async function getCodes(){if(codes)return codes;const data=await val('/stations');if(!Array.isArray(data.features))throw Error('El catálogo ferroviario no tiene el formato esperado');codes={terrassa:codeFor(data.features,'Terrassa Est'),plaza:codeFor(data.features,'Barcelona Plaça de Catalunya'),sants:codeFor(data.features,'Barcelona-Sants')};return codes;}
function rowsOf(data){if(Array.isArray(data))return data;for(const key of ['trains','trips','services','results','journeys','trayectos','connections','departures','sortides','items','data'])if(Array.isArray(data?.[key]))return data[key];return null;}
function normalized(item,origin='trayecto'){
 const o=item?.properties||item||{};const state=String(first(o.state,o.status,o.trip_status,'')).toLowerCase();
 const cancelled=o.cancelled===true||o.canceled===true||state.includes('cancel')||state.includes('suprim');
 const planned=first(o.planned_departure_ts,o.departure_ts,o.planned_ts,o.scheduled_departure_ts,o.departure?.planned_ts,o.departure?.scheduled_ts,o.departure?.scheduled,o.scheduled_ts,o.departure_time);
 const estimated=first(o.estimated_departure_ts,o.estimated_ts,o.departure?.estimated_ts,o.departure?.estimated,o.predicted_departure_ts);
 const delayRaw=first(o.delay_s,o.delay_seconds,o.departure?.delay_s);
 const number=String(first(o.train_number,o.number,o.numero,o.train?.number,o.service_number,'')).trim();
 const ageRaw=first(o.age_s,o.position_age_s);const age=ageRaw==null?null:Number(ageRaw);
 const recentPosition=!cancelled&&(state.includes('position')||state.includes('moving')||state.includes('circul')||Boolean(o.id&&o.id!==null&&state!=='scheduled')) && !o.stale && (age==null||age<180);
 return {number,destination:String(first(o.destination,o.headsign,o.destination_name,o.to?.name,'Destino no publicado')),planned:dateOf(planned),estimated:dateOf(estimated),delay:delayRaw==null?null:Number(delayRaw),state,cancelled,recentPosition,age,stale:!!o.stale,stop:String(first(o.stop_name,o.next_stop,o.current_station,'')),line:String(first(o.product,o.line,o.route,o.linea,'R4')),origin,raw:o};
}
function localDay(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const obj=Object.fromEntries(parts.map(p=>[p.type,p.value]));return `${obj.year}-${obj.month}-${obj.day}`;}
function localClock(v){return clock(v).replace(':','');}
function minutes(t){if(!/^\d\d:\d\d$/.test(t))return NaN;const [h,m]=t.split(':').map(Number);return h*60+m;}
function timeOf(t){const n=minutes(t);return Number.isFinite(n)?n:0;}
function minuteOfDate(d){return minutes(clock(d));}
function initTimes(){const now=new Date();const n=Math.floor(minuteOfDate(now)/15)*15;const from=`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;const end=Math.min(1439,n+180);const to=`${String(Math.floor(end/60)).padStart(2,'0')}:${String(end%60).padStart(2,'0')}`;$('from-time').value=from;$('to-time').value=to;}
function range(){const start=minutes($('from-time').value),end=minutes($('to-time').value);if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)throw Error('Selecciona una franja válida de hoy: la hora final debe ser posterior a la inicial.');return {start,end};}
function within(t,range){const d=t.planned||t.estimated;if(!d)return false;const m=minuteOfDate(d);return m>=range.start&&m<=range.end;}
function match(a,b){if(a.number&&b.number)return a.number.replace(/^0+/,'')===b.number.replace(/^0+/,'');if(a.planned&&b.planned)return Math.abs(a.planned-b.planned)<180000&&clean(a.destination)===clean(b.destination);return false;}
function key(t){return `${t.number||''}_${t.planned?.getTime()||t.estimated?.getTime()||''}`;}
function sourceRow(name,ok,detail){const row=node('div','source-row');row.append(node('span','',name),node('span','source-state',`${ok?'● ':'○ '}${detail}`));return row;}
function chooseTimes(a,b){return a.estimated||b?.estimated||a.planned||b?.planned;}
function paintTrains(primary,station,community,rg){const main=rowsOf(primary);if(!main)throw Error('El servicio de trayectos ha cambiado su formato. No se mostrarán trenes supuestos.');
 const board=rowsOf(station)||[],communityRows=rowsOf(community)||[];
 const trains=main.map(o=>normalized(o,'trayecto')).filter(t=>within(t,rg));const unique=[];for(const t of trains)if(!unique.some(x=>match(x,t)))unique.push(t);
 unique.sort((a,b)=>(chooseTimes(a)?.getTime()||Infinity)-(chooseTimes(b)?.getTime()||Infinity));$('trains').replaceChildren();
 if(!unique.length){$('status').className='notice';$('status').textContent='No hay trenes publicados para esta franja en la fuente de trayectos. Puede ser una limitación de cobertura o una incidencia: NO equivale a suspensión del servicio.';return;}
 let confirmed=0,conflicted=0;for(const t of unique){const b=board.map(x=>normalized(x,'panel estación')).find(x=>match(t,x));const p=communityRows.map(x=>normalized(x,'Mobilitat Penedès')).find(x=>match(t,x));const statuses=[t,b,p].filter(Boolean);const disagreement=statuses.some(s=>s.cancelled!==t.cancelled)||statuses.some(s=>s.planned&&t.planned&&Math.abs(s.planned-t.planned)>300000);const cancelled=statuses.some(s=>s.cancelled);const telemetry=statuses.some(s=>s.recentPosition);if(disagreement)conflicted++;if(telemetry&&!cancelled&&!disagreement)confirmed++;
 const kind=disagreement?'conflict':cancelled?'cancelled':telemetry?'fresh':'scheduled';const card=node('article','train'+(disagreement?' conflicted':''));const line=node('div','trainmain');const left=node('div'),right=node('div');left.append(node('div','time',clock(chooseTimes(t,b))),node('div','smalltime',t.planned&&t.estimated?`Horario ${clock(t.planned)}`:'Hora programada (si se publica)'),node('div','trainname',`${t.line}${t.number?' · tren '+t.number:''} · ${t.destination}`));const label={conflict:'Discrepancia',cancelled:'Cancelado',fresh:'Posición reciente',scheduled:'Sin confirmar'}[kind];right.append(node('span','chip '+kind,label));if(t.delay!=null&&Number.isFinite(t.delay))right.append(node('div','delay',t.delay===0?'Sin retraso publicado':`${t.delay>0?'+':''}${Math.round(t.delay/60)} min`));line.append(left,right);card.append(line);
 const evidence=[];evidence.push('Trayecto: disponible');evidence.push(b?'Panel estación: coincide':'Panel estación: sin coincidencia');evidence.push(p?'Mobilitat: posible coincidencia':'Mobilitat: sin coincidencia');if(t.age!=null)evidence.push(`Edad: ${prettyAge(t.age)}`);if(t.stop)evidence.push(`Referencia: ${t.stop}`);card.append(node('div','evidence',evidence.join(' · ')));if(disagreement)card.append(node('div','warning-banner','Las fuentes no coinciden. Verificar antes de desplazarse.'));$('trains').append(card);
 }
 $('status').className='notice'+(conflicted?' error':' ok');$('status').textContent=`${unique.length} tren(es) encontrados en el intervalo · ${confirmed} con posición reciente identificada · ${conflicted} discrepancia(s). No se ha verificado contra los monitores del andén.`;
}
function relevant(a){const lines=first(a.lines,a.affected_lines,[]);if(Array.isArray(lines)&&lines.length)return lines.some(l=>clean(typeof l==='string'?l:first(l.line,l.name,l.route,''))==='r4');return /\bR4\b/i.test(String(first(a.text,a.description,a.message,'')));}
function alertText(a){return String(first(a.text,a.description,a.message,a.title,'Aviso sin detalle'));}
function paintAlerts(responses){$('alerts').replaceChildren();const present=new Set();let count=0;for(const [name,data] of responses){const list=rowsOf(data)||data?.alerts||[];if(!Array.isArray(list))continue;for(const a of list){if(!relevant(a))continue;const content=alertText(a),fingerprint=clean(content).slice(0,110);if(present.has(fingerprint))continue;present.add(fingerprint);const box=node('div','alert',content);box.append(node('span','alert-origin',`Fuente: ${name}`));$('alerts').append(box);count++;if(count>=8)break;}if(count>=8)break;}if(!count)$('alerts').append(node('p','muted','No se han recuperado avisos R4 en las fuentes accesibles. No garantiza la ausencia de incidencias.'));}
async function penStationCode(name){if(!penStations){const result=await getJson(PEN+'/api/stations?mode=tren&limit=3000');penStations=rowsOf(result)||result.stations||result.parades;if(!Array.isArray(penStations))throw Error('Formato de estaciones no reconocido');}const matches=penStations.filter(x=>clean(first(x.name,x.nom,x.nombre,x.station_name,x.stop_name))===clean(name));if(matches.length!==1)throw Error('Estación no identificada en Mobilitat Penedès');return String(first(matches[0].stop_id,matches[0].parada,matches[0].id,matches[0].code));}
async function penDepartures(name){const id=await penStationCode(name);return getJson(`${PEN}/api/departures?parada=${encodeURIComponent(id)}`);}
async function refresh(){if(pending)return;pending=true;const token=++serial;$('refresh').disabled=true;$('connection').textContent='Consultando…';const rows=[];let station=null,trip=null,pen=null,alerts=[];try{const rg=range();const c=await getCodes();const from=mode==='ida'?c.terrassa:c.sants,to=mode==='ida'?c.plaza:c.terrassa;
 const hours=Math.min(12,Math.max(3,Math.ceil((rg.end-minuteOfDate(new Date()))/60)+1));const checks=await Promise.allSettled([
  val(`/trayecto?desde=${encodeURIComponent(from)}&hasta=${encodeURIComponent(to)}&horas=${hours}&limite=120`),
  val(`/stations/${encodeURIComponent(from)}`),
  penDepartures(ROUTES[mode].from),
  val('/alerts'),
  getJson(PEN+'/api/alerts?linia=R4&limit=10')
 ]);
 const labels=['Trayectos Valfiguer','Panel estación Valfiguer','Mobilitat Penedès · salidas','Alertas Valfiguer','Alertas Mobilitat Penedès'];checks.forEach((r,i)=>{const ok=r.status==='fulfilled';const value=ok?r.value:null;rows.push({name:labels[i],ok,details:ok?`${(rowsOf(value)||value?.alerts||[]).length||'respuesta'} registros`:(r.reason?.message||'no accesible')});if(i===0)trip=value;if(i===1)station=value;if(i===2)pen=value;if(i===3&&ok)alerts.push(['Valfiguer',value]);if(i===4&&ok)alerts.push(['Mobilitat Penedès',value]);});
 $('sources').replaceChildren();rows.forEach(x=>$('sources').append(sourceRow(x.name,x.ok,x.details)));$('sources').append(node('div','evidence','Los dos productos de Valfiguer proceden de Renfe: no son observaciones independientes. Mobilitat también reutiliza datos de Renfe. El contraste detecta diferencias, no certifica una circulación.'));
 if(!trip)throw Error('No responde la fuente de trayectos; no se puede generar una lista fiable de origen a destino.');paintTrains(trip,station,pen,rg);paintAlerts(alerts);lastOk=new Date();$('updated').textContent=`Última consulta: ${clock(lastOk)} · franja ${$('from-time').value}–${$('to-time').value} (hoy) · datos no certificados`;$('connection').textContent='● Fuentes consultadas';
 }catch(e){$('status').className='notice error';$('status').textContent='No se pueden verificar los trenes: '+e.message;$('trains').replaceChildren();$('connection').textContent='● Sin datos confirmados';$('updated').textContent=lastOk?`Última consulta completada a las ${clock(lastOk)}`:'Sin consulta correcta';}
 finally{pending=false;$('refresh').disabled=false;}}
function setMode(next){mode=next;localStorage.setItem('r4-route',mode);for(const key of ['ida','vuelta']){$('tab-'+key).classList.toggle('selected',key===mode);$('tab-'+key).setAttribute('aria-pressed',String(key===mode));}const r=ROUTES[mode];$('origin').textContent=r.titleFrom;$('destination').textContent=r.titleTo;$('trains').replaceChildren();refresh();}
function quickRange(hours){const n=Math.floor(minuteOfDate(new Date())/15)*15;const end=Math.min(1439,n+hours*60);$('from-time').value=`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;$('to-time').value=`${String(Math.floor(end/60)).padStart(2,'0')}:${String(end%60).padStart(2,'0')}`;refresh();}
$('tab-ida').addEventListener('click',()=>setMode('ida'));$('tab-vuelta').addEventListener('click',()=>setMode('vuelta'));$('refresh').addEventListener('click',refresh);$('from-time').addEventListener('change',refresh);$('to-time').addEventListener('change',refresh);document.querySelectorAll('[data-range]').forEach(b=>b.addEventListener('click',()=>quickRange(Number(b.dataset.range))));document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});initTimes();setMode(mode);setInterval(()=>{if(!document.hidden)refresh();},30000);if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
