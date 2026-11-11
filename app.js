'use strict';
const E=window.RodaliesEngine;
const CONFIG={
  val:'https://trenes.valfiguer.com/api/v1',radar:'https://radardetrenes.com/api/v1',
  refreshMs:60000,timeoutMs:9000,nearDays:14,
  dataRoot:(window.__MIRODALIES_DATA_ROOT__||((location.hostname.endsWith('.github.io')&&location.pathname.split('/').filter(Boolean).length)
    ?`https://raw.githubusercontent.com/${location.hostname.split('.')[0]}/${location.pathname.split('/').filter(Boolean)[0]}/main/data/v2/`
    :'./data/v2/'))
};
const $=id=>document.getElementById(id);
const fmt=new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const partsFmt=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const tzFmt=new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Madrid',timeZoneName:'shortOffset'});
let catalog=null,stationMap=new Map(),selection={from:'78710',to:'78805'},requestId=0,controller=null,results=[],visible=12,quickValue=null,latestSearch=null,loadedDay=new Map(),isBusy=false;
function madridParts(ms){const obj={};for(const v of partsFmt.formatToParts(new Date(ms)))if(v.type!=='literal')obj[v.type]=v.value;return obj;}
function madridDate(ms=Date.now()){const p=madridParts(ms);return `${p.year}-${p.month}-${p.day}`;}
function fmtTime(ts){return fmt.format(new Date(ts*1000));}
function tzOffset(utc){const text=tzFmt.formatToParts(new Date(utc)).find(x=>x.type==='timeZoneName')?.value||'GMT+1';const m=text.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);return m?(m[1]==='-'?-1:1)*(Number(m[2])*60+Number(m[3]||0)):60;}
function madridEpoch(day,hm){
 const [y,m,d]=day.split('-').map(Number),[h,min]=hm.split(':').map(Number);
 const naive=Date.UTC(y,m-1,d,h,min);let u=naive-tzOffset(naive)*60000;u=naive-tzOffset(u)*60000;
 const requested=day+' '+hm;
 const toLocal=v=>{const x=madridParts(v);return `${x.year}-${x.month}-${x.day} ${x.hour}:${x.minute}`;};
 if(toLocal(u)!==requested)throw new Error(`La hora ${hm} no existe ese día por el cambio horario.`);
 if(toLocal(u-3600000)===requested||toLocal(u+3600000)===requested)
  throw new Error(`La hora ${hm} aparece dos veces ese día por el cambio horario; selecciona otra franja.`);
 return Math.round(u/1000);
}
function datePlus(day,offset){const [y,m,d]=day.split('-').map(Number);return new Date(Date.UTC(y,m-1,d+offset)).toISOString().slice(0,10);}
function timeInput(ms){const p=madridParts(ms);return `${p.hour}:${p.minute}`;}
function showToast(s){const n=$('toast');n.textContent=s;n.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>n.classList.remove('show'),2400);}
function el(tag,cl,text){const n=document.createElement(tag);if(cl)n.className=cl;if(text!==undefined)n.textContent=text;return n;}
function setHealth(status,text){const x=$('health');x.className='health '+status;x.querySelector('span').textContent=text;}
function markBusy(on){isBusy=on;$('search').disabled=on;$('refresh').disabled=on;$('search').classList.toggle('loading',on);$('refresh').classList.toggle('loading',on);$('search-label').textContent=on?'Consultando…':'Consultar trenes';$('search-feedback').textContent=on?'Actualizando datos':'';}

function invalidateResults(){
  requestId++;controller?.abort();markBusy(false);results=[];visible=12;latestSearch=null;
  $('source-details').replaceChildren(el('p','subtle','Selección modificada: los diagnósticos anteriores ya no son aplicables.'));
  $('alerts').replaceChildren(el('p','subtle','Selecciona «Consultar trenes» para actualizar las incidencias de este trayecto.'));
  setHealth('pending','Consulta pendiente');
  $('results').replaceChildren();$('load-more').hidden=true;
  $('results-title').textContent='Próximos trenes';$('results-subtitle').textContent='Selección modificada; realiza una nueva consulta.';
  $('results-total').textContent='—';$('status').className='notice neutral';
  $('status').textContent='El trayecto o la franja han cambiado. Pulsa «Consultar trenes» para obtener resultados actualizados.';
  $('updated').textContent='';
}
function savePair(){try{localStorage.setItem('mirodalies-v2-pair',JSON.stringify(selection));}catch{}}
function applyPair(from,to,searchNow=false){
  if(!stationMap.has(from)||!stationMap.has(to))return;
  invalidateResults();selection={from,to};$('origin-input').value=stationMap.get(from).name;$('dest-input').value=stationMap.get(to).name;
  syncFavorites();savePair();closeSuggest();if(searchNow)void search();
}
function syncFavorites(){for(const [id,fr,to] of [['fav-ida','78710','78805'],['fav-vuelta','71801','78710']]){
 const btn=$(id),is=selection.from===fr&&selection.to===to;btn.classList.toggle('selected',is);btn.setAttribute('aria-pressed',String(is));}}
function closeSuggest(){for(const id of ['origin','dest']){$(id+'-options').hidden=true;$(id+'-input').setAttribute('aria-expanded','false');}}
function wirePicker(prefix,which){
 const input=$(prefix+'-input'),list=$(prefix+'-options');let active=-1,shown=[];
 function render(){const term=E.norm(input.value);shown=catalog.stations.filter(st=>{
   const names=[st.name,st.gtfs_name,...(st.aliases||[])];return !term||names.some(v=>E.norm(v).includes(term))||st.id.includes(term);
 }).sort((a,b)=>{const a0=[a.name,...(a.aliases||[])].some(v=>E.norm(v).startsWith(term))?0:1,b0=[b.name,...(b.aliases||[])].some(v=>E.norm(v).startsWith(term))?0:1;return a0-b0||a.name.localeCompare(b.name,'es');}).slice(0,10);
  list.replaceChildren();active=-1;
  if(!shown.length){list.append(el('div','suggest-empty','No se encuentra esa estación en el GTFS disponible.'));}
  for(let k=0;k<shown.length;k++){
   const st=shown[k],btn=el('button','suggest-option');btn.type='button';btn.setAttribute('role','option');btn.setAttribute('aria-selected','false');btn.append(el('strong','',st.name),el('small','',`ADIF ${st.id} · ${(st.lines||[]).join(' · ')}${st.gtfs_name&&st.gtfs_name!==st.name?' · GTFS: '+st.gtfs_name:''}`));
   btn.addEventListener('pointerdown',e=>e.preventDefault());btn.addEventListener('click',()=>choose(st));list.append(btn);
  }
  list.hidden=false;input.setAttribute('aria-expanded','true');
 }
 function choose(st){invalidateResults();selection[which]=st.id;input.value=st.name;savePair();syncFavorites();closeSuggest();showToast('Estación seleccionada: '+st.name);}
 input.addEventListener('focus',()=>{if(catalog)render();});
 input.addEventListener('input',()=>{invalidateResults();selection[which]='';syncFavorites();savePair();if(catalog)render();});
 input.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeSuggest();return;}
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){if(list.hidden)render();e.preventDefault();active=Math.max(0,Math.min(shown.length-1,active+(e.key==='ArrowDown'?1:-1)));[...list.children].forEach((x,i)=>{x.classList.toggle('active',i===active);x.setAttribute('aria-selected',String(i===active));});}
  if(e.key==='Enter'&&!list.hidden&&shown.length){e.preventDefault();choose(shown[Math.max(0,active)]);}
 });
 input.addEventListener('blur',()=>setTimeout(()=>{if(input.value&&!selection[which]&&catalog){const exact=catalog.stations.find(x=>E.norm(x.name)===E.norm(input.value));if(exact)choose(exact);}closeSuggest();},140));
 $(prefix+'-clear').addEventListener('click',()=>{invalidateResults();input.value='';selection[which]='';savePair();syncFavorites();input.focus();});
}
function selectQuick(hours){if(catalog)invalidateResults();const next=Math.ceil((Date.now()+180000)/300000)*300000;const end=next+hours*3600000;const beginning=madridParts(next);
 $('trip-date').value=madridDate(next);$('from-time').value=`${beginning.hour}:${beginning.minute}`;$('to-time').value=timeInput(end);quickValue=hours;
 document.querySelectorAll('[data-hours]').forEach(b=>{b.classList.toggle('selected',Number(b.dataset.hours)===hours);b.setAttribute('aria-pressed',String(Number(b.dataset.hours)===hours));});
 $('search-feedback').textContent=madridDate(next)!==madridDate(end)?'La franja termina mañana':'';
}
function manualChanged(){if(catalog)invalidateResults();quickValue=null;for(const b of document.querySelectorAll('[data-hours]')){b.classList.remove('selected');b.setAttribute('aria-pressed','false');}}
function validateRange(){const day=$('trip-date').value,from=$('from-time').value,to=$('to-time').value;
 if(!catalog)throw new Error('Todavía no se ha cargado el catálogo oficial de estaciones.');
 if(!stationMap.has(selection.from)||!stationMap.has(selection.to))throw new Error('Selecciona dos estaciones del listado.');
 if(selection.from===selection.to)throw new Error('Origen y destino deben ser diferentes.');
 if(!/^\d{4}-\d\d-\d\d$/.test(day)||!/^\d\d:\d\d$/.test(from)||!/^\d\d:\d\d$/.test(to))throw new Error('Revisa la fecha y las horas seleccionadas.');
 if(day<catalog.coverage_start||day>catalog.coverage_end)throw new Error(`El GTFS está disponible del ${catalog.coverage_start} al ${catalog.coverage_end}.`);
 let start=madridEpoch(day,from),end=madridEpoch(day,to),extra=false;
 if(end<=start){
   if(datePlus(day,1)>catalog.coverage_end)throw new Error('La franja cruza a un día que aún no está cubierto por el GTFS oficial.');
   end=madridEpoch(datePlus(day,1),to);extra=true;
 }
 if(end<=start||end-start>8*3600)throw new Error('Selecciona una franja superior a 0 y de 8 horas como máximo.');
 return {day,from,to,start,end,extra};
}
async function loadJson(url,signal,timeout=CONFIG.timeoutMs){const c=new AbortController(),timer=setTimeout(()=>c.abort(),timeout),abort=()=>c.abort();signal?.addEventListener('abort',abort,{once:true});try{
 const r=await fetch(url,{signal:c.signal,cache:'no-store',headers:{'Accept':'application/json'}});
 if(!r.ok)throw new Error('HTTP '+r.status);
 return await r.json();
}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}}
async function loadCatalog(signal){const root=CONFIG.dataRoot;const data=await loadJson(root+'catalog.json?ts='+Date.now(),signal,16000);
 if(data?.schema!==2||!Array.isArray(data.stations)||!Array.isArray(data.lines))throw new Error('El catálogo oficial no tiene el formato V2 requerido.');
 return data;
}
async function dayData(day,signal){
 const cached=loadedDay.get(day);if(cached&&Date.now()-cached.loadedAt<5*60000)return cached.data;
 const data=await loadJson(CONFIG.dataRoot+day+'.json?ts='+Date.now(),signal,16000);
 if(data.schema!==2||data.day!==day||!Array.isArray(data.trains))throw new Error('Horario diario incorrecto para '+day);
 loadedDay.set(day,{loadedAt:Date.now(),data});if(loadedDay.size>4)loadedDay.delete(loadedDay.keys().next().value);return data;
}
function sourceJobs(station){return [
  {name:'Valfiguer · panel',detail:'Salidas del origen; 2 horas',url:`${CONFIG.val}/stations/${station}`},
  {name:'RadarDeTrenes · ADIF',detail:'Panel de la estación de origen',url:`${CONFIG.radar}/stations/${station}/board-renfe`},
  {name:'Renfe · posiciones',detail:'Red redistribuida por Valfiguer',url:`${CONFIG.val}/trains`},
  {name:'Renfe/ADIF · flota',detail:'Red redistribuida por RadarDeTrenes',url:`${CONFIG.radar}/fleet?type=commuter`},
  {name:'Renfe · cancelaciones',detail:'Redistribuidas por Valfiguer',url:`${CONFIG.val}/cancellations`},
  {name:'Renfe · avisos',detail:'Redistribuidos por Valfiguer',url:`${CONFIG.val}/alerts`},
  {name:'Estado de feeds',detail:'Antigüedad publicada por origen',url:`${CONFIG.val}/status`}
 ];}
function renderSourceSummary(res,jobs,mode,cat){const content=$('source-details');content.replaceChildren();
 const catalogRow=sourceRow('Horario oficial GTFS','Cercanías / MD con línea Rodalies explícita',true,`${cat.stations.length} estaciones · ${cat.lines.filter(x=>x.present).length}/${cat.lines.length} líneas`);content.append(catalogRow);
 if(mode!=='live'){content.append(el('p','subtle','Para fechas futuras se utiliza el horario oficial; las observaciones de ahora no predicen la circulación futura.'));return;}
 res.forEach((r,i)=>{
 const ok=r.status==='fulfilled';const data=ok?r.value:null;const count=ok?E.rows(data).length:0;
 content.append(sourceRow(jobs[i].name,jobs[i].detail,ok,ok?`${count} registros`:`No accesible: ${String(r.reason?.message||'Error').slice(0,42)}`));
 });
 const stats=res[6]?.status==='fulfilled'?res[6].value:null;
 for(const f of (Array.isArray(stats?.feeds)?stats.feeds:[]).filter(x=>/renfe_cer_(positions|updates)|renfe.*alerts|renfe_ld_positions/i.test(x.id||''))){
 content.append(sourceRow(f.id,'Antigüedad del feed original',!!f.ok&&!f.stale,Number.isFinite(Number(f.data_age_s))?`${f.data_age_s} s`: 'Sin dato'));
 }
 content.append(el('p','subtle','Los recuentos de las APIs son generales; no equivalen a trenes de este trayecto. Distintos proveedores pueden redistribuir las mismas observaciones de Renfe.'));
}
function renderOfficialAudit(cat){
 const intro=$('catalog-audit-intro'),root=$('catalog-audit-lines');root.replaceChildren();
 const audit=cat.official_reference;
 if(!audit||!Array.isArray(audit.lines)){
  intro.textContent='Este catálogo todavía no incorpora el contraste con la Generalitat. Ejecuta la tarea V2.0.1 de GitHub Actions.';
  return;
 }
 const total=audit.lines.length,scheduled=audit.lines.filter(l=>l.status!=='sin_horarios_publicados').length;
 const full=audit.lines.filter(l=>l.status==='controles_localizados').length;
 const partial=audit.lines.filter(l=>l.status==='pendiente_contraste').length;
 intro.textContent=`${total} líneas en la referencia de la Generalitat · ${scheduled} con horarios GTFS · ${full} con puntos de control localizados · ${partial} pendientes de contraste. La comparación no certifica todas las estaciones.`;
 for(const l of audit.lines){
  const row=el('div','catalog-line-row'),left=el('div','catalog-line-name'),right=el('div','catalog-line-status');
  const a=el('a','',l.id);a.href=l.url;a.target='_blank';a.rel='noopener noreferrer';left.append(a);
  left.append(el('small','',l.corridor));
  let state='Sin horarios GTFS',type='warn';
  if(l.status==='controles_localizados'){state=`${l.gtfs_station_count} estaciones GTFS · comprobaciones principales localizadas`;type='good';}
  else if(l.status==='pendiente_contraste'){state=`${l.gtfs_station_count} estaciones GTFS · ${l.not_found_in_gtfs.length} puntos sin cotejar`;type='warn';}
  right.append(el('span',type,state));
  if(l.not_found_in_gtfs?.length && l.status==='pendiente_contraste'){
   right.append(el('small','','Sin cotejar: '+l.not_found_in_gtfs.join(', ')));
  }
  const suggested=l.unverified_name_suggestions||{};for(const [name,sug] of Object.entries(suggested)) { if(sug.length)right.append(el('small','',`Posible alias de «${name}» (NO validado): ${sug.map(v=>v.name+' ['+v.id+']').join(' / ')}`)); }
  row.append(left,right);root.append(row);
 }
}
function sourceRow(title,description,ok,value){const r=el('div','source-row'),l=el('div');l.append(el('strong','',title),el('small','',description));r.append(l,el('span',ok?'good':'bad',value));return r;}
function renderAlerts(list,live){const elmt=$('alerts');elmt.replaceChildren();if(!live){elmt.append(el('p','subtle','Para esa fecha todavía no hay avisos futuros contrastados. Consulta el estado del servicio el mismo día.'));return;}
 if(!list.length){elmt.append(el('p','subtle','No se han recuperado avisos específicos. Esto no garantiza que el servicio funcione normalmente.'));return;}
 for(const obj of list){const x=el('div','alert',obj.text);if(obj.lines.length)x.append(el('div','subtle','Líneas: '+obj.lines.join(', ')));elmt.append(x);}}
function buildWindow(dayTrains,range){const good=dayTrains.filter(t=>E.LINES.has(t.l)&&Array.isArray(t.s)&&t.s.length>=2).map(t=>({...t,day:t.day||''}));
 const direct=E.direct(good,selection.from,selection.to,range.start,range.end);
 const trans=E.transfers(good,selection.from,selection.to,range.start,range.end);
 const keys=new Set(direct.map(x=>x.key));return [...direct,...trans.filter(x=>!keys.has(x.key))].sort((a,b)=>a.depart-b.depart||a.arrive-b.arrive);
}
function timeFor(t){return fmtTime(t);}
function duration(start,end){const min=Math.round((end-start)/60);return min>=60?`${Math.floor(min/60)} h ${String(min%60).padStart(2,'0')} min`:`${min} min`;}
function stateName(st){return {scheduled:'Solo horario',live:'Posición reciente',cancelled:'Cancelado',conflict:'Datos contradictorios',transfer:'1 transbordo'}[st]||'Sin verificar';}
function stationName(id){return stationMap.get(id)?.name||id;}
function renderResultList(){const root=$('results');root.replaceChildren();for(const j of results.slice(0,visible)){
 const panel=el('article','train-card '+j.state),top=el('div','train-top'),time=el('div'),right=el('span','train-status '+j.state,stateName(j.state));
 const selected=(j.cancelled||j.conflict)?j.depart:(j.estimated??j.depart);
 time.append(el('div','train-time',timeFor(selected)),el('div','train-time-label',(j.estimated&&!j.cancelled&&!j.conflict)?'Salida estimada · programada '+timeFor(j.depart):'Salida programada'));
 time.append(el('div','train-end','Llegada '+timeFor(j.arrive)+' · '+duration(j.depart,j.arrive)));top.append(time,right);panel.append(top);
 if(j.kind==='direct'){
  const leg=j.legs[0],lineRow=el('div','train-line'),tag=el('span','line-pill '+(/^(R1[34567]|R11)/.test(leg.t.l)?'regional':''),leg.t.l);lineRow.append(tag,document.createTextNode('Tren '+(leg.t.n||'sin número')+' · '+stationName(leg.to)));panel.append(lineRow);
  panel.append(el('div','train-subline','Origen: '+stationName(leg.from)+' · destino: '+stationName(leg.to)));
 }else{
  panel.append(el('div','train-line','Conexión programada en '+stationName(j.transferAt)));
  const legs=el('div','trip-legs');for(const l of j.legs){const d=el('div','leg');d.append(el('span','small-line',l.t.l),el('span','',timeFor(l.depart)+' '+stationName(l.from)+' → '+timeFor(l.arrive)+' '+stationName(l.to)));legs.append(d);}panel.append(legs);
 }
 const proof=el('div','train-evidence');let notes=['Origen: Renfe GTFS oficial'];
 for(const l of j.legs){if(l.proof.length)notes.push(l.proof.join('; '));if(l.platform)notes.push('Vía publicada: '+l.platform);}
 if(j.kind==='transfer')notes.push('Conexión teórica; enlace no confirmado');
 // Dynamic nodes instead of innerHTML from external providers (XSS-safe).
 proof.append(el('b','', 'Evidencias: '),document.createTextNode(notes.join(' · ')));panel.append(proof);root.append(panel);
 }
 $('load-more').hidden=results.length<=visible;
 $('load-more').textContent=`Mostrar más (${Math.max(0,results.length-visible)} restantes)`;
}
function updateSummary(range,scheduleCount,live){const direct=results.filter(x=>x.kind==='direct').length,transfer=results.filter(x=>x.kind==='transfer').length,cancel=results.filter(x=>x.cancelled).length,pos=results.filter(x=>x.live).length;
 $('results-title').textContent=stationName(selection.from)+' → '+stationName(selection.to);
 $('results-subtitle').textContent=range.day+' · '+range.from+'–'+range.to+(range.extra?' (hasta mañana)':'');
 $('results-total').textContent=results.length+' '+(results.length===1?'opción':'opciones');
 const st=$('status');if(!results.length){st.className='notice warn';st.textContent=scheduleCount?'No se han encontrado servicios directos ni conexiones de un transbordo en esta franja. No implica que el servicio esté suspendido.':'El horario oficial disponible no contiene servicios del recorrido. Comprueba la cobertura de líneas y la fecha.';}
 else{st.className='notice '+(cancel?'warn':pos?'good':'neutral');st.textContent=`${direct} directos · ${transfer} con un transbordo · ${pos} con posición reciente · ${cancel} cancelados. Las horas programadas no confirman circulación.`;}
 $('updated').textContent=`Consulta ${fmtTime(Date.now()/1000)} · Datos operativos: ${live?'consultados en este momento':'solo horarios oficiales para fecha futura'}. Esta aplicación es orientativa.`;
}
async function search(){if(!catalog){showToast('El catálogo todavía no está disponible');return;}
 let range;try{range=validateRange();}catch(err){const st=$('status');st.className='notice bad';st.textContent=err.message;showToast(err.message);return;}
 const id=++requestId;controller?.abort();controller=new AbortController();const signal=controller.signal;markBusy(true);setHealth('pending','Consultando');$('status').className='notice neutral';$('status').textContent='Buscando recorridos en el horario oficial…';$('results-total').textContent='…';
 try{
  const days=[range.day];
  // GTFS 24:xx departures can belong to the preceding service day.
  if(range.from<'06:00')days.unshift(datePlus(range.day,-1));
  if(range.extra)days.push(datePlus(range.day,1));
  const daily=await Promise.all(days.map(d=>dayData(d,signal)));
  if(signal.aborted||id!==requestId)return;
  const trips=daily.flatMap(x=>x.trains.map(t=>({...t,day:x.day})));
  const scheduled=buildWindow(trips,range);
  if(!scheduled.length&&daily.every(x=>x.trains.length===0))showToast('Sin horarios oficiales para esa fecha');
  $('status').textContent=`${scheduled.length} opciones programadas. Contrastando datos…`;
  const today=madridDate(),live=range.day===today, jobs=live?sourceJobs(selection.from):[];
  const res=live?await Promise.allSettled(jobs.map(j=>loadJson(j.url,signal))):[];
  if(signal.aborted||id!==requestId)return;
  const now=Math.floor(Date.now()/1000);
  const data=i=>res[i]?.status==='fulfilled'?res[i].value:null;
  const board=live?[...E.normalizeBoard(data(0),'Valfiguer',now).map(x=>({...x,boardStop:selection.from})),...E.normalizeBoard(data(1),'ADIF/RadarDeTrenes',now).map(x=>({...x,boardStop:selection.from}))]:[];
  const positions=live?[...E.normalizePositions(data(2),'Renfe/Valfiguer',now),...E.normalizePositions(data(3),'Renfe/ADIF',now)]:[];
  const cancellations=live?E.normalizeCancels(data(4)):[];
  results=scheduled.map(j=>E.enrichJourney(j,board,positions,cancellations,now));visible=12;latestSearch={range};
  renderResultList();updateSummary(range,trips.length,live);
  const lines=new Set(results.flatMap(j=>j.legs.map(l=>l.t.l)));
  renderAlerts(live?E.alertsForLines(data(5),lines):[],live);
  renderSourceSummary(res,jobs,live?'live':'future',catalog);
  const failures=res.filter(x=>x.status==='rejected').length;
  setHealth(!live?'good':failures?'partial':'good',!live?'Horario oficial':failures?'Datos parciales':'Datos consultados');
  $('search-feedback').textContent='';
 }catch(err){if(!signal.aborted&&id===requestId){const st=$('status');st.className='notice bad';st.textContent='No se ha podido consultar el horario: '+err.message;setHealth('bad','Sin horario');}}
 finally{if(id===requestId)markBusy(false);}
}
async function init(){const d=madridDate();$('trip-date').value=d;$('trip-date').min=d;$('trip-date').max=datePlus(d,CONFIG.nearDays-1);
 for(const b of document.querySelectorAll('[data-hours]'))b.addEventListener('click',()=>selectQuick(Number(b.dataset.hours)));
 for(const id of ['trip-date','from-time','to-time'])$(id).addEventListener('change',manualChanged);
 $('search').addEventListener('click',()=>void search());$('refresh').addEventListener('click',()=>void search());
 $('load-more').addEventListener('click',()=>{visible+=12;renderResultList();});
 $('swap').addEventListener('click',()=>{if(stationMap.has(selection.from)&&stationMap.has(selection.to))applyPair(selection.to,selection.from,true);else showToast('Elige dos estaciones primero');});
 $('fav-ida').addEventListener('click',()=>applyPair('78710','78805',true));
 $('fav-vuelta').addEventListener('click',()=>applyPair('71801','78710',true));
 selectQuick(2);
 try{const response=await loadCatalog(null);catalog=response;stationMap=new Map(response.stations.map(s=>[s.id,s]));wirePicker('origin','from');wirePicker('dest','to');
  const available=response.lines.filter(x=>x.present);$('network-tag').textContent=`${available.length} líneas · ${response.stations.length} estaciones`;
  renderOfficialAudit(response);
  const absent=response.lines.filter(x=>!x.present).map(x=>x.id);
  const unchecked=response.official_reference?.lines?.filter(x=>x.status==='pendiente_contraste').length||0;
  const generated=Date.parse(response.generated_at||'');
  const staleGTFS=!Number.isFinite(generated)||Date.now()-generated>48*3600*1000;
  const coverageText=absent.length?`Cobertura GTFS parcial: sin horarios identificados de ${absent.join(', ')}.`:`${unchecked} líneas con puntos de referencia pendientes de cotejar.`;
  $('catalog-message').textContent=(staleGTFS?'ATENCIÓN: el horario GTFS lleva más de 48 h sin actualizarse. ':'GTFS actualizado '+String(response.generated_at||'desconocido').slice(0,10)+'. ')+coverageText+' Consulta «Catálogo oficial».';
  let pair=null;try{pair=JSON.parse(localStorage.getItem('mirodalies-v2-pair')||'null');}catch{}
  if(pair&&stationMap.has(pair.from)&&stationMap.has(pair.to))applyPair(pair.from,pair.to);
  else if(stationMap.has('78710')&&stationMap.has('78805'))applyPair('78710','78805');
  else {selection={from:'',to:''};$('origin-input').value='';$('dest-input').value='';}
  setHealth(staleGTFS||absent.length?'partial':'good',staleGTFS?'Horario desactualizado':absent.length?'Cobertura parcial':'Red disponible');
  if(selection.from&&selection.to)await search();
 }catch(e){$('catalog-message').textContent='No se ha podido cargar la red oficial V2. Ejecuta la tarea GTFS en GitHub Actions.';setHealth('bad','Sin catálogo');
  $('status').className='notice bad';$('status').textContent='Falta data/v2/catalog.json o no es accesible. La V2 no mostrará trenes de otras líneas como sustitutos.';
  $('network-tag').textContent='Red no disponible';}
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&catalog&&selection.from&&selection.to)void search();});
 setInterval(()=>{if(!document.hidden&&catalog&&selection.from&&selection.to&&!isBusy&&madridDate()===$('trip-date').value)void search();},CONFIG.refreshMs);
 if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
init();
