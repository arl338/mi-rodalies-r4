'use strict';
/* Mi Rodalies v1.5: GTFS como catálogo, evidencias operativas solo tras correlación estricta. */
const CONFIG = Object.freeze({
  val:'https://trenes.valfiguer.com/api/v1',radar:'https://radardetrenes.com/api/v1',
  official:'./data/schedule-r4.json',refreshMs:60000,maxLiveAge:150,maxBoardAge:180
});
const STOP = Object.freeze({est:'78710',placa:'78805',sants:'71801'});
const ROUTES = Object.freeze({
  ida:{from:STOP.est,to:STOP.placa,fromName:'Terrassa Est',toName:'Barcelona-Plaça de Catalunya',label:'Ida'},
  vuelta:{from:STOP.sants,to:STOP.est,fromName:'Barcelona-Sants',toName:'Terrassa Est',label:'Vuelta'}
});
const $=id=>document.getElementById(id);
const fmt=new Intl.DateTimeFormat('es-ES',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/Madrid'});
const dayFmt=new Intl.DateTimeFormat('en-GB',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Europe/Madrid'});
const parts=d=>Object.fromEntries(dayFmt.formatToParts(d).map(x=>[x.type,x.value]));
const dayOf=d=>d instanceof Date&&Number.isFinite(+d)?(()=>{const p=parts(d);return `${p.year}-${p.month}-${p.day}`;})():'';
const today=()=>dayOf(new Date());
const hm=d=>d instanceof Date&&Number.isFinite(+d)?fmt.format(d):'—';
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const first=(...v)=>v.find(x=>x!==undefined&&x!==null&&x!=='');
const number=v=>String(v??'').trim().replace(/^0+(?=\d)/,'');
const num=v=>{if(v===undefined||v===null||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const pad=n=>String(n).padStart(2,'0');
function clock(s){const m=/^(\d{1,2}):(\d{2})$/.exec(String(s??''));if(!m||+m[1]>23||+m[2]>59)return NaN;return +m[1]*60+ +m[2];}
const clockLabel=m=>`${pad(Math.floor(m/60))}:${pad(m%60)}`;
const minute=d=>clock(hm(d));
const esc=s=>/\d{4}-\d{2}-\d{2}/.test(s);
function time(value){
  if(value===null||value===undefined||value==='')return null;
  if(value instanceof Date)return Number.isFinite(+value)?value:null;
  if(typeof value==='object')return time(first(value.ts,value.timestamp,value.iso));
  if(typeof value==='number'||/^\d{10,13}$/.test(String(value))){const n=Number(value);const d=new Date(n<1e11?n*1000:n);return Number.isFinite(+d)?d:null;}
  // Sin una fecha completa se descarta: no se presupone que un horario HH:MM sea de hoy.
  if(/^\d{1,2}:\d{2}(:\d{2})?$/.test(String(value)))return null;
  const d=new Date(value);return Number.isFinite(+d)?d:null;
}
function item(tag,cls='',txt){const x=document.createElement(tag);x.className=cls;if(txt!==undefined)x.textContent=String(txt);return x;}
const textAge=seconds=>seconds===null||!Number.isFinite(seconds)?'no indicada':seconds<60?`${Math.round(seconds)} s`:`${Math.round(seconds/60)} min`;
let routeId='ida',runId=0,activeController=null,officialCache=null,view=null,toastTimer=null;
const route=()=>ROUTES[routeId];
function toast(s){const x=$('toast');x.textContent=s;x.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>x.classList.remove('show'),1800);}
function connection(kind,s){const x=$('connection');x.className=`connection ${kind}`;x.lastChild.textContent=s;}
function busy(v){for(const id of ['refresh','apply']){$(id).disabled=v;$(id).classList.toggle('loading',v);$(id).setAttribute('aria-busy',String(v));} $('refresh-label').textContent=v?'Consultando…':'Actualizar';$('fetch-progress').classList.toggle('running',v);}
function validRange(){const a=clock($('from-time').value),b=clock($('to-time').value);if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a)throw Error('La hora final debe ser posterior a la inicial y del mismo día.');return {start:a,end:b};}
function inside(d,r){return d instanceof Date&&dayOf(d)===today()&&minute(d)>=r.start&&minute(d)<=r.end;}
function saveRange(){try{localStorage.setItem('mirodalies-range-'+routeId,JSON.stringify({day:today(),from:$('from-time').value,to:$('to-time').value}));}catch{}}
function readSaved(){try{return JSON.parse(localStorage.getItem('mirodalies-range-'+routeId)||'null');}catch{return null;}}
function setQuick(n){document.querySelectorAll('[data-range]').forEach(b=>{const ok=n===Number(b.dataset.range);b.classList.toggle('chosen',ok);b.setAttribute('aria-pressed',String(ok));});}
function loadRange(){const saved=readSaved();const now=minute(new Date());const from=Math.min(1438,Math.floor(now/15)*15);const to=Math.min(1439,from+120);
  $('from-time').value=saved?.day===today()&&Number.isFinite(clock(saved.from))?saved.from:clockLabel(from);
  $('to-time').value=saved?.day===today()&&Number.isFinite(clock(saved.to))?saved.to:clockLabel(to);
  setQuick(null);$('range-info').textContent='Se muestran salidas programadas dentro de la franja. El horario no confirma circulación.';}
function quick(hours){const a=Math.min(1438,Math.floor(minute(new Date())/15)*15),b=Math.min(1439,a+hours*60);
  $('from-time').value=clockLabel(a);$('to-time').value=clockLabel(b);saveRange();
  setQuick(b-a===hours*60?hours:null);
  $('range-info').textContent=b-a<hours*60?'La franja termina a las 23:59: no llega a cubrir todas las horas seleccionadas.':'Se muestran salidas programadas dentro de la franja. El horario no confirma circulación.';
  toast('Franja seleccionada');void refresh();}
function changeRoute(next){if(!ROUTES[next]||next===routeId){toast('Trayecto ya seleccionado');return;}routeId=next;try{localStorage.setItem('mirodalies-route',next);}catch{};
  for(const r of Object.keys(ROUTES)){const b=$('tab-'+r);const on=r===next;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));}
  $('origin').textContent=route().fromName;$('destination').textContent=route().toName;loadRange();toast(`Trayecto: ${route().label}`);void refresh();}
async function getJson(url,signal,timeout=7000){const c=new AbortController();const onAbort=()=>c.abort();const timer=setTimeout(()=>c.abort(),timeout);signal?.addEventListener('abort',onAbort,{once:true});
 try{const r=await fetch(url,{signal:c.signal,cache:'no-store',credentials:'omit',headers:{Accept:'application/json'}});if(!r.ok)throw Error('HTTP '+r.status);const obj=await r.json();if(!obj||typeof obj!=='object')throw Error('JSON inesperado');return obj;}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',onAbort);}}
async function official(signal){if(officialCache&&Date.now()-officialCache.time<5*60000)return officialCache.value;
 const host=location.hostname,owner=host.endsWith('.github.io')?host.slice(0,-'.github.io'.length):'arl338';const repo=location.pathname.split('/').filter(Boolean)[0]||'mi-rodalies-r4';
 for(const url of [`https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/main/data/schedule-r4.json`,CONFIG.official]){
   try{const x=await getJson(url,signal,7000);if(x.schema===1&&Array.isArray(x.trains)){officialCache={time:Date.now(),value:x};return x;}}catch(e){if(signal?.aborted)throw e;}
 }return null;
}
function officialState(o){const generated=time(o?.generated_at),ok=o?.schema===1&&/Renfe/.test(o?.source||'')&&Array.isArray(o?.trains)&&o.coverage_start<=today()&&o.coverage_end>=today()&&generated&&+generated<=Date.now()+300000;
 const days=generated?(Date.now()- +generated)/86400000:Infinity;
 return {usable:!!ok&&days<=7,stale:!!ok&&days>2,ageDays:days};}
function getArray(data,keys=['trains','departures','salidas','entries','services','rows','items']){
 if(Array.isArray(data))return data;
 if(!data||typeof data!=='object')return [];
 for(const k of keys)if(Array.isArray(data[k]))return data[k];
 for(const k of ['board','data','result']){if(data[k]&&typeof data[k]==='object'){const a=getArray(data[k],keys);if(a.length)return a;}}
 return [];
}
function parseTrain(raw,source){const x=raw?.properties||raw||{};
 const planned=time(first(x.planned_ts,x.scheduled_departure_ts,x.planned_departure_ts,x.scheduledDeparture,x.scheduledDepartureTime,x.departureTime,x.departure?.planned_ts,x.departure?.scheduled,x.scheduledTime,x.planned));
 const estimated=time(first(x.estimated_ts,x.estimated_departure_ts,x.estimatedDeparture,x.estimatedDepartureTime,x.departure?.estimated_ts,x.predicted_departure_ts));
 const n=number(first(x.train_number,x.trainCode,x.trainNumber,x.numero,x.number,x.serviceNumber,''));
 const line=[x.product,x.productName,x.line,x.lineName,x.linea,x.routeName,x.route].filter(y=>typeof y==='string'&&y.trim()).join(' | ').trim();
 const category=String(first(x.category,x.service_category,x.type,'')).trim();
 const stamp=time(first(x.reported_at,x.timestamp,x.updatedAt,x.position_timestamp,x.source_timestamp));
 const advertisedAge=num(first(x.age_s,x.position_age_s));const age=stamp?Math.max(0,(Date.now()-+stamp)/1000):advertisedAge;
 const delaySeconds=num(first(x.delay_s,x.delay_seconds,x.departure?.delay_s));const delayMinutes=num(first(x.delayMinutes,x.delay_minutes));
 const delay=delaySeconds!==null?delaySeconds:delayMinutes!==null?delayMinutes*60:null;
 const status=String(first(x.status,x.state,x.trip_status,'')).toLowerCase();
 const destination=String(first(x.destinationName,x.destination_name,x.destination?.name,typeof x.destination==='string'?x.destination:'',x.headsign,'')).trim();
 const coords=raw?.geometry?.coordinates;const lat=num(first(coords?.[1],x.latitude,x.lat));const lon=num(first(coords?.[0],x.longitude,x.lon));
 return {source,number:n,tripId:String(first(x.trip_id,x.tripId,'')||''),line,category,planned,estimated,delay,stamp,age,
   stale:x.stale===true,cancelled:x.cancelled===true||x.canceled===true||/cancel|suprim/.test(status),
   destination,platform:String(first(x.platform,x.platformName,x.track,x.via,'')||''),lat,lon,raw:x};
}
function isR4(x){const cat=norm(x.category);if(['ld','md','longdistance','regional','largadistancia','mediadistancia','ave','avant','alvia','euromed'].includes(cat))return false;
 const lines=x.line.match(/(?:^|[^a-z0-9])r(?:[1-9]|1[0-7])(?:$|[^a-z0-9])/gi)||[];
 const codes=lines.map(y=>(y.match(/r(?:[1-9]|1[0-7])/i)||[])[0]?.toUpperCase()).filter(Boolean);
 if(codes.some(y=>y!=='R4'))return false;
 return codes.includes('R4')||/^r4(?:nord|sud)$/.test(norm(x.line));}
function isRecent(x,limit){return x.stamp&&x.age!==null&&!x.stale&&x.age>=0&&x.age<=limit&&Math.abs(Date.now()-+x.stamp)<=limit*1000;}
function scheduleRows(o,selected,interval){if(!officialState(o).usable)return [];
 const used=new Set(),out=[];
 for(const t of o.trains){if(t.route!==selected.id||t.service_day!==today()||t.from_code!==selected.from||t.to_code!==selected.to)continue;
  const planned=time(t.planned_ts),arrival=time(t.arrival_ts);if(!planned||!arrival||arrival<=planned||!inside(planned,interval))continue;
  const n=number(t.train_number),trip=String(t.trip_id||'');const key=`${+planned}|${n}|${+arrival}`;if(used.has(key))continue;used.add(key);
  out.push({key,number:n,tripId:trip,aliasIds:[trip,...(Array.isArray(t.alternative_trip_ids)?t.alternative_trip_ids:[])],planned,arrival,
    route:selected.id,destination:String(t.destination||'').trim(),sources:['GTFS oficial Renfe'],board:[],position:null,cancelled:false,conflict:false,validated:true});
 }
 return out.sort((a,b)=>+a.planned-+b.planned);
}
function matchRow(train,rows){if(!train.number)return null;
 const matches=rows.filter(x=>isR4(x)&&x.number===train.number&&x.planned&&dayOf(x.planned)===today()&&Math.abs(+x.planned- +train.planned)<=120000);
 if(matches.length!==1)return null;
 const found=matches[0];if(found.tripId&&train.aliasIds.includes(found.tripId)===false&&train.tripId&&/R4$/i.test(found.tripId)&&/R4$/i.test(train.tripId))return null;
 return found;
}
function matchPosition(train,position){if(!train.number||position.number!==train.number||!isR4(position)||!isRecent(position,CONFIG.maxLiveAge))return false;
 const cat=norm(position.category);if(cat&&cat!=='cercanias'&&cat!=='commuter')return false;
 if(position.tripId&&train.aliasIds.length&&train.aliasIds.includes(position.tripId)===false&&/R4$/i.test(position.tripId)&&/R4$/i.test(train.tripId))return false;
 // No interpretar un tren del mismo número en otra jornada como posición vigente para esta salida.
 return Date.now()>=+train.planned-75*60000&&Date.now()<=+train.arrival+35*60000;
}
function isCancelled(t,records){return records.some(x=>{
 if(!x.number||x.number!==t.number||!isR4(x))return false;
 if(x.tripId&&t.aliasIds.length){if(t.aliasIds.includes(x.tripId))return true;return false;}
 return x.planned&&dayOf(x.planned)===today()&&Math.abs(+x.planned-+t.planned)<=120000;
});}
function enrich(train,boardVal,boardRadar,positions,cancel){
 const found=[matchRow(train,boardVal),matchRow(train,boardRadar)].filter(Boolean);
 train.board=found;
 let explicitCancel=found.some(x=>x.cancelled)||isCancelled(train,cancel);
 const live=positions.filter(x=>matchPosition(train,x)).sort((a,b)=>(a.age??999)-(b.age??999))[0]||null;
 train.position=live;train.cancelled=explicitCancel;
 const current=found.filter(x=>x.estimated&&isRecent(x,CONFIG.maxBoardAge));
 // Un tablero sin sello temporal no se considera estimación vigente.
 current.sort((a,b)=>a.age-b.age);
 const diff=current.length>1&&Math.abs(+current[0].estimated- +current[1].estimated)>300000;
 train.conflict=diff||(explicitCancel&&!!live);
 train.estimate=current.length&&!train.conflict&&!explicitCancel?current[0].estimated:null;
 train.delay=live?.delay??current[0]?.delay??null;
 train.platform=found.find(x=>x.platform)?.platform||'';
 train.state=train.conflict?'conflict':explicitCancel?'cancelled':live?'live':'scheduled';
 return train;
}
function alertRows(data){return getArray(data,['alerts','incidents','items','rows']);}
function alertsForR4(data){const arr=alertRows(data),out=[],seen=new Set();for(const v of arr){const a=v.properties||v;const names=Array.isArray(a.lines)?a.lines.map(x=>typeof x==='string'?x:String(first(x.line,x.name,'')||'')):[];
 const txt=String(first(a.text,a.message,a.description,a.title,a.summary,'')||'').trim();if(!txt||!names.some(x=>norm(x)==='r4')&&!/\bR4\b/i.test(txt))continue;
 const key=norm(txt);if(!seen.has(key)){seen.add(key);out.push(txt);}if(out.length>=6)break;}return out;}
function renderAlerts(a){$('alerts').replaceChildren(...a.map(s=>{const e=item('div','alert-card',s);e.append(item('small','','Fuente: Renfe vía Valfiguer'));return e;}));if(!a.length)$('alerts').append(item('p','muted','No se han recibido avisos específicos de la R4; no significa que no existan incidencias.'));}
function renderHistory(data){const days=Array.isArray(data?.days)?data.days:[];let total=0,ontime=0;
 for(const d of days)for(const g of (Array.isArray(d.groups)?d.groups:[])){if(norm(g.label)==='r4'&&(!g.nucleo||/barcelona|catalunya/i.test(g.nucleo))){total+=Number(g.trips)||0;ontime+=Number(g.on_time)||0;}}
 $('history').replaceChildren();if(!total){$('history').append(item('p','muted','No hay datos históricos R4 suficientes. No se calcula puntualidad.'));return;}
 const box=item('div','history-stats');for(const [v,label] of [[total.toLocaleString('es-ES'),'Viajes registrados'],[(100*ontime/total).toFixed(1).replace('.',',')+' %','Puntualidad publicada']]){const el=item('div','history-stat');el.append(item('strong','',v),item('span','',label));box.append(el);}
 $('history').append(box,item('p','help-text','Dato agregado de R4; no mide el paso real por Terrassa Est ni predice un tren concreto.'));}
function rowInfo(label,subtitle,ok,value){const r=item('div','source-row'),l=item('div');l.append(item('strong','',label),item('small','',subtitle));r.append(l,item('span',ok?'ok':'fail',value));return r;}
function renderSources(jobs,results,official,officialStats,entries){const list=[];
 list.push(rowInfo('GTFS oficial Renfe','Horario de los dos trayectos',officialStats.usable,!officialStats.usable?'No disponible/vigente':`${official.trains.length.toLocaleString('es-ES')} registros · ${officialStats.stale?'antigüedad > 2 días':'actualizado'}`));
 for(let i=0;i<jobs.length;i++){const result=results[i];if(result.status==='rejected'){list.push(rowInfo(jobs[i].label,jobs[i].info,false,'No accesible: '+String(result.reason?.message||'error').slice(0,40)));continue;}
 let count=0;const obj=result.value;if(i===2)count=Array.isArray(obj?.features)?obj.features.length:0;else if(i===3)count=Array.isArray(obj?.trains)?obj.trains.length:0;else if(i===7)count=Array.isArray(obj?.feeds)?obj.feeds.length:0;else count=getArray(obj).length;
 list.push(rowInfo(jobs[i].label,jobs[i].info,true,`${count} registros${i===0||i===1?' (todas las líneas)':''}`));}
 for(const f of (entries?.feeds||[]).filter(x=>/renfe_cer_(positions|updates)|renfe.*alerts/i.test(x.id||'')))list.push(rowInfo('Origen '+f.id,'Antigüedad del feed de origen',!!f.ok&&!f.stale,textAge(num(f.data_age_s))));
 $('sources').replaceChildren(...list,item('p','help-text','Las fuentes que redistribuyen Renfe/ADIF no constituyen observaciones independientes. Un registro no demuestra que el tren llegue a la estación.'));
}
function badge(s){return {scheduled:'Solo horario',live:'Posición reciente',cancelled:'Cancelado',conflict:'Datos contradictorios'}[s]||'Sin confirmar';}
function renderTrains(trains,officialStats,errors,selection){const trainBox=$('trains');trainBox.replaceChildren();let live=0,cancel=0,conflicts=0;
 for(const t of trains){const e=item('article','train '+t.state),h=item('div','train-main'),a=item('div','train-times'),b=item('div','train-state');
 const shown=t.estimate||t.planned;
 a.append(item('div','train-time',hm(shown)),item('div','time-kind',t.estimate?'Salida estimada':'Salida programada'));
 if(t.estimate)a.append(item('div','time-kind','Programada: '+hm(t.planned)));
 b.append(item('span','pill '+t.state,t.state==='scheduled'?'Horario oficial':badge(t.state)));
 if(Number.isFinite(t.delay)&&t.delay!==0&&t.position)b.append(item('div','delay',`${t.delay>0?'+':''}${Math.round(t.delay/60)} min · informado`));
 h.append(a,b);e.append(h,item('div','train-name',`R4${t.number?' · Tren '+t.number:''} · ${route().fromName} → ${route().toName}`));
 if(t.platform)e.append(item('div','platform','Vía publicada: '+t.platform));
 const notes=['Recorrido acreditado en GTFS oficial Renfe','Horario ≠ circulación confirmada'];
 if(t.position){notes.push('Posición publicada hace '+textAge(t.position.age));live++;}
 else notes.push('Sin posición asociada');
 if(t.board.length)notes.push('Tablero: '+[...new Set(t.board.map(x=>x.source==='val'?'Valfiguer':'RadarDeTrenes'))].join(' / '));
 if(t.estimate)notes.push('Estimación del tablero, con fecha reciente');
 if(t.state==='cancelled'){cancel++;notes.push('Cancelación publicada para este servicio');}
 if(t.conflict){conflicts++;notes.push('Evidencias contradictorias; consultar estación');}
 e.append(item('div','train-evidence',notes.join(' · ')));trainBox.append(e);
 }
 const msg=$('status');if(!trains.length){msg.className='notice warn';msg.textContent=officialStats.usable?'No hay servicios programados en el horario oficial para esta franja; podrían existir servicios especiales no publicados.':'No disponemos de un horario oficial vigente para enumerar los trenes. Las posiciones generales no permiten reconstruir el recorrido.';}
 else{msg.className='notice '+(conflicts?'bad':live?'good':'warn');msg.textContent=`${trains.length} servicios programados · ${live} con posición reciente · ${cancel} cancelados${conflicts?' · '+conflicts+' discrepancias':''}. Datos orientativos.`;}
 $('result-count').textContent=`${trains.length} servicios para este recorrido · ${live} observaciones recientes`;
 $('updated').textContent=`Consulta ${hm(new Date())} · ${today()} · franja ${$('from-time').value}–${$('to-time').value} · ${errors} fuentes inaccesibles`;
}
async function refresh(){let range;try{range=validRange();}catch(e){toast('Corrige la franja horaria');$('status').className='notice bad';$('status').textContent=e.message;return;}
 saveRange();const id=++runId;if(activeController)activeController.abort();activeController=new AbortController();const signal=activeController.signal;const r={...route(),id:routeId};busy(true);connection('waiting','Consultando');
 $('status').className='notice neutral';$('status').textContent='Consultando horarios y fuentes…';$('result-count').textContent='Consulta en curso';
 const jobs=[
  {label:'Valfiguer · estación',info:'Panel de origen (2 horas)',url:`${CONFIG.val}/stations/${r.from}`},
  {label:'RadarDeTrenes · ADIF',info:'Panel de origen (todas las líneas)',url:`${CONFIG.radar}/stations/${r.from}/board-renfe`},
  {label:'Renfe · posiciones',info:'Red completa · vía Valfiguer',url:`${CONFIG.val}/trains`},
  {label:'Renfe/ADIF · posiciones',info:'Red completa · vía RadarDeTrenes',url:`${CONFIG.radar}/fleet?type=commuter`},
  {label:'Renfe · cancelaciones',info:'Red completa · vía Valfiguer',url:`${CONFIG.val}/cancellations`},
  {label:'Renfe · avisos',info:'Por Valfiguer',url:`${CONFIG.val}/alerts`},
  {label:'R4 · puntualidad',info:'Histórico publicado',url:`${CONFIG.val}/puntualidad?dias=7`},
  {label:'Estado feeds',info:'Antigüedad de origen',url:`${CONFIG.val}/status`}
 ];
 try{
   const [offResult,...res]=await Promise.allSettled([official(signal),...jobs.map(x=>getJson(x.url,signal))]);
   if(signal.aborted||id!==runId)return;
   const off=offResult.status==='fulfilled'?offResult.value:null,st=officialState(off),rawOff=st.usable?off:null;
   const count=st.usable?off.trains.filter(x=>x.route===r.id&&x.service_day===today()).length:0;
   $('schedule-status').textContent=st.usable?`GTFS oficial: ${count} circulaciones programadas para ${r.label.toLowerCase()} hoy${st.stale?' (horario antiguo, comprobar cambios)':''}. No confirma circulación.`:'Horario oficial no disponible o desactualizado. Sin listado verificado no se muestran trenes de otros servicios.';
   const val=i=>res[i]?.status==='fulfilled'?res[i].value:null;
   const boardVal=getArray(val(0)).map(x=>parseTrain(x,'val')).filter(isR4);
   const boardRadar=getArray(val(1)).map(x=>parseTrain(x,'radar')).filter(isR4);
   const posVal=Array.isArray(val(2)?.features)?val(2).features.map(x=>parseTrain(x,'val')).filter(isR4):[];
   const posRadar=getArray(val(3)).map(x=>parseTrain(x,'radar')).filter(isR4);
   const cancel=getArray(val(4)).map(x=>parseTrain(x,'val')).filter(isR4);
   const list=scheduleRows(rawOff,r,range).map(t=>enrich(t,boardVal,boardRadar,[...posVal,...posRadar],cancel));
   if(signal.aborted||id!==runId)return;
   view={list,route:r,range};renderTrains(list,st,res.filter(x=>x.status==='rejected').length+(offResult.status==='rejected'?1:0),r);
   renderSources(jobs,res,off,st,val(7));renderAlerts(alertsForR4(val(5)));renderHistory(val(6));
   const accessible=res.filter(x=>x.status==='fulfilled').length;
   connection(!accessible&&!st.usable?'offline':accessible===jobs.length&&st.usable?'online':'partial',!accessible&&!st.usable?'Sin información':accessible===jobs.length&&st.usable?'Fuentes accesibles':'Datos parciales');
 }catch(e){if(!signal.aborted&&id===runId){connection('offline','Error');$('status').className='notice bad';$('status').textContent='Error de procesamiento: '+String(e.message).slice(0,90);}}
 finally{if(id===runId)busy(false);}
}
function init(){try{const saved=localStorage.getItem('mirodalies-route');if(ROUTES[saved])routeId=saved;}catch{}
 const p=parts(new Date());$('today-label').textContent=`${p.day}/${p.month}`;
 for(const k of Object.keys(ROUTES)){$('tab-'+k).classList.toggle('selected',k===routeId);$('tab-'+k).setAttribute('aria-pressed',String(k===routeId));$('tab-'+k).addEventListener('click',()=>changeRoute(k));}
 $('origin').textContent=route().fromName;$('destination').textContent=route().toName;loadRange();
 for(const b of document.querySelectorAll('[data-range]'))b.addEventListener('click',()=>quick(Number(b.dataset.range)));
 for(const id of ['from-time','to-time'])$(id).addEventListener('change',()=>{setQuick(null);saveRange();toast('Hora cambiada: pulsa «Ver trenes»');});
 $('apply').addEventListener('click',()=>void refresh());$('refresh').addEventListener('click',()=>void refresh());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
 setInterval(()=>{if(!document.hidden)void refresh();},CONFIG.refreshMs);
 if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
 void refresh();
}
init();
