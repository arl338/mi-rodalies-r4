'use strict';
const E=window.RodaliesEngine;
const EMBEDDED_REFERENCE_CATALOG={"schema":2,"reference_only":true,"generated_at":null,"coverage_start":null,"coverage_end":null,"stations":[{"id":"79400","name":"Barcelona-Estació de França","aliases":["Barcelona Estació de França","Estació de França"],"lines":["R2S","R13","R14","R15","R16","R17"],"reference_only":true},{"id":"78802","name":"Barcelona-Fabra i Puig","aliases":["Sant Andreu Arenal","Fabra i Puig"],"lines":["R7"],"reference_only":true},{"id":"78805","name":"Barcelona-Plaça de Catalunya","aliases":["Plaça de Catalunya","Barcelona Plaça Catalunya"],"lines":["R4"],"reference_only":true},{"id":"71801","name":"Barcelona-Sants","aliases":["Barcelona Sants","Sants"],"lines":["R4","R11"],"reference_only":true},{"id":"72503","name":"Cerdanyola Universitat","aliases":["Cerdanyola-Universitat"],"lines":["R7","R8"],"reference_only":true},{"id":"78400","name":"Lleida-Pirineus","aliases":["Lleida Pirineus"],"lines":["RL3","RL4","R13","R14"],"reference_only":true},{"id":"72209","name":"Martorell Central","aliases":["Martorell"],"lines":["R8"],"reference_only":true},{"id":"65411","name":"Salou - Port Aventura","aliases":["Salou-Port Aventura","Salou-PortAventura"],"lines":["R17"],"reference_only":true},{"id":"78710","name":"Terrassa Est","aliases":[],"lines":["R4"],"reference_only":true},{"id":"78700","name":"Terrassa Estació del Nord","aliases":["Terrassa"],"lines":["RL4"],"reference_only":true}],"lines":[{"id":"R1","name":"R1","present":false,"reference_only":true},{"id":"R2","name":"R2","present":false,"reference_only":true},{"id":"R2N","name":"R2 Nord","present":false,"reference_only":true},{"id":"R2S","name":"R2 Sud","present":false,"reference_only":true},{"id":"R3","name":"R3","present":false,"reference_only":true},{"id":"R4","name":"R4","present":false,"reference_only":true},{"id":"R7","name":"R7","present":false,"reference_only":true},{"id":"R8","name":"R8","present":false,"reference_only":true},{"id":"RG1","name":"RG1","present":false,"reference_only":true},{"id":"RT1","name":"RT1","present":false,"reference_only":true},{"id":"RT2","name":"RT2","present":false,"reference_only":true},{"id":"RL3","name":"RL3","present":false,"reference_only":true},{"id":"RL4","name":"RL4","present":false,"reference_only":true},{"id":"R11","name":"R11","present":false,"reference_only":true},{"id":"R13","name":"R13","present":false,"reference_only":true},{"id":"R14","name":"R14","present":false,"reference_only":true},{"id":"R15","name":"R15","present":false,"reference_only":true},{"id":"R16","name":"R16","present":false,"reference_only":true},{"id":"R17","name":"R17","present":false,"reference_only":true}],"official_reference":{"lines":[{"id":"R1","status":"sin_horarios_publicados","url":"https://rodalies.gencat.cat/es/sobre-rodalies/linies-i-estacions/servei_rodalia_barcelona/r1/","corridor":"Molins de Rei – Maçanet-Massanes","gtfs_station_count":0,"not_found_in_gtfs":[]},{"id":"R2","status":"sin_horarios_publicados","url":"https://rodalies.gencat.cat/es/sobre-rodalies/linies-i-estacions/servei_rodalia_barcelona/r2/","corridor":"Castelldefels – Granollers Centre","gtfs_station_count":0,"not_found_in_gtfs":[]},{"id":"R2N","status":"sin_horarios_publicados","url":"https://rodalies.gencat.cat/es/sobre-rodalies/linies-i-estacions/servei_rodalia_barcelona/r2n/","corridor":"Aeroport – Maçanet-Massanes","gtfs_station_count":0,"not_found_in_gtfs":[]},{"id":"R2S","status":"sin_horarios_publicados","url":"https://rodalies.gencat.cat/es/sobre-rodalies/linies-i-estacions/servei_rodalia_barcelona/r2s/","corridor":"Barcelona-Estació de França – Sant Vicenç de Calders","gtfs_station_count":0,"not_found_in_gtfs":[]},{"id":"R3","status":"sin_horarios_publicados","url":"https://rodalies.gencat.cat/es/sobre-rodalies/linies-i-estacions/servei_rodalia_barcelona/r3/","corridor":"L’Hospitalet de Llobregat – Puigcerdà","gtfs_station_count":0,"not_found_in_gtfs":[]},{"id":"R4","status":"sin_horarios_publicados","url":"https://rodalies.gencat.cat/es/sobre-rodalies/linies-i-estacions/servei_rodalia_barcelona/r4/","corridor":"Sant Vicenç de Calders – Manresa","gtfs_station_count":0,"not_found_in_gtfs":[]},{"id":"R7","status":"sin_horarios_publicados","url":"https://rodalies.gencat.cat/es/sobre-rodalies/linies-i-estacions/servei_rodalia_barcelona/r7/","corridor":"Barcelona-Fabra i Puig – Cerdanyola Universitat","gtfs_station_count":0,"not_found_in_gtfs":[]},{"id":"R8","status":"sin_horarios_publicados","url":"https://rodalies.gencat.cat/es/sobre-rodalies/linies-i-estacions/servei_rodalia_barcelona/r8/","corridor":"Martorell – Granollers Centre","gtfs_station_count":0,"not_found_in_gtfs":[]},{"id":"RG1","status":"sin_horarios_publicados","url":"https://rodalies.gencat.cat/es/sobre-rodalies/linies-i-estacions/servei_regionals/rg1/","corridor":"L’Hospitalet de Llobregat – Figueres/Portbou","gtfs_station_count":0,"not_found_in_gtfs":[]},{"id":"RT1","status":"sin_horarios_publicados","url":"https://rodalies.gencat.cat/es/sobre-rodalies/linies-i-estacions/servei_regionals/rt1/","corridor":"Tarragona – Reus","gtfs_station_count":0,"not_found_in_gtfs":[]},{"id":"RT2","status":"sin_horarios_publicados","url":"https://rodalies.gencat.cat/es/sobre-rodalies/linies-i-estacions/servei_regionals/rt2/","corridor":"L’Arboç – L’Hospitalet de l’Infant","gtfs_station_count":0,"not_found_in_gtfs":[]},{"id":"RL3","status":"sin_horarios_publicados","url":"https://rodalies.gencat.cat/es/sobre-rodalies/linies-i-estacions/servei_regionals/linia-rl3/","corridor":"Lleida-Pirineus – Cervera","gtfs_station_count":0,"not_found_in_gtfs":[]},{"id":"RL4","status":"sin_horarios_publicados","url":"https://rodalies.gencat.cat/es/sobre-rodalies/linies-i-estacions/servei_regionals/linea-rl4/","corridor":"Lleida-Pirineus – Terrassa Estació del Nord","gtfs_station_count":0,"not_found_in_gtfs":[]},{"id":"R11","status":"sin_horarios_publicados","url":"https://rodalies.gencat.cat/es/sobre-rodalies/linies-i-estacions/servei_regionals/r11/","corridor":"Barcelona-Sants – Portbou","gtfs_station_count":0,"not_found_in_gtfs":[]},{"id":"R13","status":"sin_horarios_publicados","url":"https://rodalies.gencat.cat/es/sobre-rodalies/linies-i-estacions/servei_regionals/r13/","corridor":"Barcelona-Estació de França – Lleida por Valls","gtfs_station_count":0,"not_found_in_gtfs":[]},{"id":"R14","status":"sin_horarios_publicados","url":"https://rodalies.gencat.cat/es/sobre-rodalies/linies-i-estacions/servei_regionals/r14/","corridor":"Barcelona-Estació de França – Lleida por Tarragona y Reus","gtfs_station_count":0,"not_found_in_gtfs":[]},{"id":"R15","status":"sin_horarios_publicados","url":"https://rodalies.gencat.cat/es/sobre-rodalies/linies-i-estacions/servei_regionals/r15/","corridor":"Barcelona-Estació de França – Riba-roja d’Ebre","gtfs_station_count":0,"not_found_in_gtfs":[]},{"id":"R16","status":"sin_horarios_publicados","url":"https://rodalies.gencat.cat/es/sobre-rodalies/linies-i-estacions/servei_regionals/r16/","corridor":"Barcelona-Estació de França – Tortosa/Ulldecona","gtfs_station_count":0,"not_found_in_gtfs":[]},{"id":"R17","status":"sin_horarios_publicados","url":"https://rodalies.gencat.cat/es/sobre-rodalies/linies-i-estacions/servei_regionals/linia-r17/","corridor":"Barcelona-Estació de França – Salou-Port Aventura","gtfs_station_count":0,"not_found_in_gtfs":[]}]},"warnings":["Catálogo de referencia parcial: solo estaciones con código ADIF verificado. No contiene horarios. Es obligatorio ejecutar el generador GTFS para la cobertura completa."]};

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
let catalog=null,stationMap=new Map(),catalogSource='not-loaded',selection={line:'R4',from:'78710',to:'78805'},requestId=0,controller=null,results=[],visible=12,quickValue=null,latestSearch=null,loadedDay=new Map(),isBusy=false,lastCatalogCheck=0,lastLocalDay=null;
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
function lineStations(line){
 if(!catalog)return [];
 // For a named commercial line, use the independently reviewed network
 // membership, not broad GTFS route labels that can mix R2/R2N/R2S.
 // All-lines mode still exposes every catalogued station.
 return catalog.stations.filter(st=>line==='ALL'||(Array.isArray(st.reference_lines)?st.reference_lines.includes(line):Array.isArray(st.lines)&&st.lines.includes(line)))
  .slice().sort((a,b)=>a.name.localeCompare(b.name,'es',{sensitivity:'base'}));
}
function renderLineOptions(){
 const sel=$('line-select');sel.replaceChildren();sel.append(new Option('Selecciona una línea',''));
 const lines=[...catalog.lines].sort((a,b)=>[...E.LINES].indexOf(a.id)-[...E.LINES].indexOf(b.id));
 for(const l of lines){
  const amount=lineStations(l.id).length;
  const label=(l.name||l.id)+(catalog.reference_only?' · referencia parcial':l.id==='RL3'&&catalog.official_rl3_pdf?' · horario oficial PDF':!l.present?' · sin GTFS (consulta alternativa)':'')+` (${amount} estaciones)`;
  sel.append(new Option(label,l.id));
 }
 sel.append(new Option('Todas las líneas · transbordos','ALL'));
}
function renderStationSelects(){
 const options=lineStations(selection.line);
 for(const [id,field,other] of [['origin-input','from','to'],['dest-input','to','from']]){
  const sel=$(id);sel.replaceChildren();
  sel.append(new Option(options.length?'Selecciona una estación':'No hay estaciones registradas',''));
  for(const st of options){const hasSchedule=selection.line==='RL3'&&!!catalog?.official_rl3_pdf&&st.lines?.includes('RL3')|| (selection.line==='ALL'?!!st.schedule_lines?.length:st.schedule_lines?.includes(selection.line));
  // R1's published 27-stop PDF starts/ends at L'Hospitalet. Keep four
  // unconfirmed western stations visible without implying train times exist.
  const r1NotInPublished=selection.line==='R1'&&catalog?.official_r1_pdf?.exclusions?.includes(st.name);
  const label=st.name+(catalog.reference_only?' · referencia':
   r1NotInPublished?' · no figura en el cuadro R1 actual':hasSchedule?'':' · sin horario GTFS');
  const op=new Option(label,st.id);op.disabled=st.id===selection[other];sel.append(op);}
  sel.disabled=!selection.line||options.length===0;
  sel.value=options.some(s=>s.id===selection[field])?selection[field]:'';
  if(!sel.value)selection[field]='';
 }
 $('line-help').textContent=catalog.reference_only
  ?'Referencia provisional: solo puntos principales con código ADIF validado. Ejecuta la actualización GTFS para obtener todas las paradas y horarios.'
  :selection.line==='ALL'?'Permite buscar entre todas las estaciones y calcular hasta un transbordo.'
  :`${options.length} estaciones en ${selection.line}. Se consulta GTFS y, cuando faltan servicios, Trenalia. La pertenencia a la línea no confirma parada comercial.`+
     (catalog.source_quality?.by_line?.[selection.line]?.raw_two_stop_trips>0?' Aviso: el GTFS original contiene algunos viajes con únicamente dos paradas; no se conocen las horas de paso intermedias.':'');
}
function applyLine(line){
 if(!catalog||!catalog.lines.some(l=>l.id===line)&&line!=='ALL')return;
 invalidateResults();selection.line=line;selection.from='';selection.to='';$('line-select').value=line;
 renderStationSelects();savePair();syncFavorites();
}
function applyPair(from,to,searchNow=false){
 if(!stationMap.has(from)||!stationMap.has(to)){
  showToast('Estas estaciones requieren el catálogo GTFS completo.');return;
 }
 const common=stationMap.get(from).lines.filter(l=>stationMap.get(to).lines.includes(l));
 // Both saved commutes are R4; otherwise use an eligible shared line or all-lines mode.
 const routeLine=common.includes('R4')&&(from==='78710'||to==='78710')?'R4':(common.includes(selection.line)?selection.line:(common[0]||'ALL'));
 invalidateResults();selection={line:routeLine,from,to};$('line-select').value=routeLine;
 renderStationSelects();syncFavorites();savePair();if(searchNow&& !catalog.reference_only)void search();
 else if(searchNow)showToast('Falta generar el horario GTFS completo.');
}
function syncFavorites(){for(const [id,fr,to] of [['fav-ida','78710','78805'],['fav-vuelta','71801','78710']]){
 const btn=$(id),is=selection.from===fr&&selection.to===to;btn.classList.toggle('selected',is);btn.setAttribute('aria-pressed',String(is));}}
function wirePickers(){
 $('line-select').addEventListener('change',()=>applyLine($('line-select').value));
 for(const [id,which] of [['origin-input','from'],['dest-input','to']]){
  $(id).addEventListener('change',()=>{
   invalidateResults();selection[which]=$(id).value;
   if(selection.from===selection.to){selection[which]='';$(id).value='';showToast('Selecciona dos estaciones diferentes');}
   renderStationSelects();savePair();syncFavorites();
  });
 }
}
function selectQuick(hours){if(catalog)invalidateResults();const next=Math.ceil((Date.now()+180000)/300000)*300000;const end=next+hours*3600000;const beginning=madridParts(next);
 $('trip-date').value=madridDate(next);$('from-time').value=`${beginning.hour}:${beginning.minute}`;$('to-time').value=timeInput(end);quickValue=hours;
 document.querySelectorAll('[data-hours]').forEach(b=>{b.classList.toggle('selected',Number(b.dataset.hours)===hours);b.setAttribute('aria-pressed',String(Number(b.dataset.hours)===hours));});
 $('search-feedback').textContent=madridDate(next)!==madridDate(end)?'La franja termina mañana':'';
}
function manualChanged(){if(catalog)invalidateResults();quickValue=null;for(const b of document.querySelectorAll('[data-hours]')){b.classList.remove('selected');b.setAttribute('aria-pressed','false');}}
function validateRange(){const day=$('trip-date').value,from=$('from-time').value,to=$('to-time').value;
 if(!catalog)throw new Error('Todavía no se ha cargado el catálogo de estaciones.');
 if(catalog.reference_only)throw new Error('El catálogo es provisional y no incluye horarios. Ejecuta la actualización GTFS en GitHub Actions.');
 if(!selection.line)throw new Error('Selecciona primero una línea de Rodalies.');
 if(selection.line!=='ALL'&&(!lineStations(selection.line).some(st=>st.id===selection.from)||!lineStations(selection.line).some(st=>st.id===selection.to)))throw new Error('Elige origen y destino de la línea seleccionada.');
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
async function loadDataFile(file,signal,timeout=16000){
 const roots=[CONFIG.dataRoot,'./data/v2/'];let last=null;
 for(const root of [...new Set(roots)]){
  try{return await loadJson(root+file+'?ts='+Date.now(),signal,timeout);}catch(err){if(signal?.aborted)throw err;last=err;}
 }
 throw last||new Error('No se ha podido descargar '+file);
}
async function loadCatalog(signal){
 try{
  const data=await loadDataFile('catalog.json',signal);
  if(data?.schema!==2||!Array.isArray(data.stations)||!Array.isArray(data.lines))throw new Error('Formato de catálogo V2 incompatible');
  catalogSource='gtfs';return data;
 }catch(err){
  if(signal?.aborted)throw err;
  // This reference never masquerades as a complete GTFS catalogue.
  let fallback;
  try{fallback=await loadJson('./data/reference/fallback_catalog.json?ts='+Date.now(),signal,5000);}catch{fallback=EMBEDDED_REFERENCE_CATALOG;}
  if(fallback?.schema!==2||fallback?.reference_only!==true||!Array.isArray(fallback.stations))fallback=EMBEDDED_REFERENCE_CATALOG;
  catalogSource='reference';return fallback;
 }
}
async function dayData(day,signal){
 if(catalog?.reference_only)throw new Error('El catálogo provisional no contiene horarios. Ejecuta «Actualizar red Rodalies» desde GitHub Actions.');
 const cached=loadedDay.get(day);if(cached&&Date.now()-cached.loadedAt<5*60000)return cached.data;
 const data=await loadDataFile(day+'.json',signal);
 if(data.schema!==2||data.day!==day||!Array.isArray(data.trains))throw new Error('Horario diario incorrecto para '+day);
 if(catalog?.batch_id&&data.batch_id!==catalog.batch_id)throw new Error('El catálogo y los horarios diarios pertenecen a versiones distintas de Renfe. Vuelve a consultar en unos minutos.');
 loadedDay.set(day,{loadedAt:Date.now(),data});if(loadedDay.size>4)loadedDay.delete(loadedDay.keys().next().value);return data;
}
function sourceJobs(station){return [
  {name:'Valfiguer · panel',detail:'Salidas del origen; 2 horas',url:`${CONFIG.val}/stations/${station}`},
  {name:'RadarDeTrenes · ADIF',detail:'Panel de la estación de origen',url:`${CONFIG.radar}/stations/${station}/board-renfe`},
  {name:'Renfe · posiciones',detail:'Red redistribuida por Valfiguer',url:`${CONFIG.val}/trains`},
  {name:'Renfe/ADIF · flota',detail:'Red redistribuida por RadarDeTrenes',url:`${CONFIG.radar}/fleet?type=commuter`},
  {name:'Renfe · cancelaciones',detail:'Redistribuidas por Valfiguer',url:`${CONFIG.val}/cancellations`},
  {name:'Renfe · avisos',detail:'Redistribuidos por Valfiguer',url:`${CONFIG.val}/alerts`},
  {name:'Estado de feeds',detail:'Antigüedad publicada por origen',url:`${CONFIG.val}/status`},
  {name:'RadarDeTrenes · avisos de estación',detail:'Incidencias vinculadas al origen',url:`${CONFIG.radar}/stations/${station}/alerts`}
 ];}
function renderSourceSummary(res,jobs,mode,cat,timetable){const content=$('source-details');content.replaceChildren();
 const catalogRow=sourceRow('Horario Renfe GTFS','Cercanías / MD con línea Rodalies explícita',true,`${cat.stations.length} estaciones · ${cat.lines.filter(x=>x.present).length}/${cat.lines.length} líneas`);content.append(catalogRow);
 if(cat.regional_official_pdf){for(const [line,count] of Object.entries(cat.regional_official_pdf.counts||{})){content.append(sourceRow('Cuadro oficial '+line+' (PDF)','Servicios impresos verificables; cobertura parcial sin datos operativos',true,String(count)+' servicios añadidos en el período'));}}
 if(cat.additional_official_pdf){for(const [line,count] of Object.entries(cat.additional_official_pdf.counts||{})){content.append(sourceRow('Horario oficial '+line+' (PDF)','Horas directamente observadas por estación; calendario teórico',true,String(count)+' servicios añadidos durante el período'));}}
 if(cat.official_rl3_pdf){content.append(sourceRow('Horarios oficiales RL3 (PDF)',
  'Nueve paradas por tren entre Cervera y Lleida; no confirma circulación',true,
  String(cat.official_rl3_pdf.count_by_day?.[madridDate()]??'')+' servicios teóricos para hoy'));}
 if(cat.official_r1_pdf){content.append(sourceRow('Cuadro oficial Rodalies R1 (PDF)',
 'Servicios por parada entre L’Hospitalet y Maçanet; no confirma circulación',true,
 String(cat.official_r1_pdf.count_by_day?.[madridDate()]??'')+' servicios adicionales para hoy'));}
 if(cat.official_r4_pdf){content.append(sourceRow('Cuadro oficial Rodalies R4 (PDF)',
 'Horarios por parada, laborables y fines de semana; no confirma circulación',true,
 String(cat.official_r4_pdf.supplement_count_by_day?.[madridDate()]??'')+' servicios adicionales en catálogo para hoy'));}
 if(timetable?.queried){content.append(sourceRow('Trenalia · horarios complementarios','Servicios por fecha, línea y estaciones; no implican circulación',timetable.available,timetable.available?String(timetable.records)+' horarios candidatos':'Sin respuesta; permanecen los horarios GTFS'));}
 if(mode!=='live'){content.append(el('p','subtle','Para fechas futuras se utilizan GTFS y, si están disponibles, horarios alternativos de Trenalia. No son observaciones de circulación.'));return;}
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
 const total=audit.lines.length,scheduled=cat.lines.filter(l=>l.present).length;
 const full=audit.lines.filter(l=>l.status==='controles_localizados').length;
 const partial=audit.lines.filter(l=>l.status==='pendiente_contraste').length;
 intro.textContent=`${total} líneas en la referencia de la Generalitat · ${scheduled} con horarios estructurados GTFS/PDF (cobertura parcial) · ${full} con puntos de control localizados · ${partial} pendientes de contraste. La comparación no certifica todas las estaciones.`;
 for(const l of audit.lines){
  const row=el('div','catalog-line-row'),left=el('div','catalog-line-name'),right=el('div','catalog-line-status');
  const a=el('a','',l.id);a.href=l.url;a.target='_blank';a.rel='noopener noreferrer';left.append(a);
  left.append(el('small','',l.corridor));
  if(l.timetable_pdf){const pdf=el('a','','Cuadro horario oficial (PDF)');pdf.href=l.timetable_pdf;pdf.target='_blank';pdf.rel='noopener noreferrer';left.append(pdf);}
  if(l.timetable_pdf_weekend){const pdf=el('a','','Cuadro vigente fines de semana y festivos');pdf.href=l.timetable_pdf_weekend;pdf.target='_blank';pdf.rel='noopener noreferrer';left.append(pdf);}
  if(l.timetable_note)left.append(el('small','','Aviso de vigencia: '+l.timetable_note));
  if(l.service_alteration_url){const link=el('a','','Modificaciones oficiales del servicio');link.href=l.service_alteration_url;link.target='_blank';link.rel='noopener noreferrer';left.append(link);}
  const networkCount=cat.network_reference?.line_station_counts?.[l.id];
  const inventory=Number.isInteger(networkCount)?networkCount+' estaciones del inventario · ':'';
  const entry=cat.lines.find(x=>x.id===l.id);
  let state=inventory+'sin horarios estructurados oficiales',type='warn';
  if(entry?.present&&l.status==='sin_horarios_publicados'){
   state=inventory+`${entry.scheduled_trips_in_period} instancias PDF programadas en el período; sin GTFS, cobertura parcial`;
  }
  if(l.status==='controles_localizados'){state=inventory+`${l.gtfs_station_count} estaciones con GTFS · controles principales localizados`;type='good';}
  else if(l.status==='pendiente_contraste'){state=inventory+`${l.gtfs_station_count} estaciones con GTFS · ${l.not_found_in_gtfs.length} puntos sin cotejar`;type='warn';}
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
 for(const obj of list){const x=el('div','alert',obj.text);if(obj.lines.length)x.append(el('div','subtle','Líneas: '+obj.lines.join(', ')));if(obj.source)x.append(el('div','subtle','Fuente: '+obj.source));elmt.append(x);}}
function buildWindow(dayTrains,range){const good=dayTrains.filter(t=>E.LINES.has(t.l)&&(selection.line==='ALL'||t.l===selection.line)&&Array.isArray(t.s)&&t.s.length>=2).map(t=>({...t,day:t.day||''}));
 const direct=E.direct(good,selection.from,selection.to,range.start,range.end);
 const trans=selection.line==='ALL'?E.transfers(good,selection.from,selection.to,range.start,range.end):[];
 const keys=new Set(direct.map(x=>x.key));return [...direct,...trans.filter(x=>!keys.has(x.key))].sort((a,b)=>a.depart-b.depart||a.arrive-b.arrive);
}
function timeFor(t){return fmtTime(t);}
function duration(start,end){const min=Math.round((end-start)/60);return min>=60?`${Math.floor(min/60)} h ${String(min%60).padStart(2,'0')} min`:`${min} min`;}
function stateName(st){return {scheduled:'Solo horario',estimated:'Hora estimada',live:'Posición reciente',cancelled:'Cancelado',conflict:'Datos contradictorios',transfer:'1 transbordo','at-risk':'Conexión en riesgo'}[st]||'Sin verificar';}
function displayEvidenceState(j){return j.state==='scheduled'&&j.estimated!==null?'estimated':j.state;}
function stationName(id){return stationMap.get(id)?.name||id;}
function renderResultList(){const root=$('results');root.replaceChildren();for(const j of results.slice(0,visible)){
 const evidenceState=displayEvidenceState(j);
 const panel=el('article','train-card '+evidenceState),top=el('div','train-top'),time=el('div'),right=el('span','train-status '+evidenceState,stateName(evidenceState));
 const selected=(j.cancelled||j.conflict)?j.depart:(j.estimated??j.depart);
 const hasEstimate=j.estimated!==null&&!j.cancelled&&!j.conflict;
 time.append(el('div','train-time',timeFor(selected)),el('div','train-time-label',hasEstimate?'Salida prevista · horario '+timeFor(j.depart):'Salida programada'));
 if(hasEstimate&&Math.abs(j.estimated-j.depart)>=30){const delta=Math.round((j.estimated-j.depart)/60);time.append(el('div','train-delta',delta>=0?'Retraso estimado: +'+delta+' min':'Adelanto estimado: '+Math.abs(delta)+' min'));}
 time.append(el('div','train-end','Llegada programada '+timeFor(j.arrive)+' · Duración programada '+duration(j.depart,j.arrive)));top.append(time,right);panel.append(top);
 if(j.kind==='direct'){
  const leg=j.legs[0],lineRow=el('div','train-line'),tag=el('span','line-pill '+(/^(R1[34567]|R11)/.test(leg.t.l)?'regional':''),leg.t.l);lineRow.append(tag,document.createTextNode((leg.t.n?'Tren '+leg.t.n:'Servicio sin número publicado')+' · '+stationName(leg.to)));panel.append(lineRow);
  panel.append(el('div','train-subline','Origen: '+stationName(leg.from)+' · destino: '+stationName(leg.to)));
 }else{
  panel.append(el('div','train-line','Conexión programada en '+stationName(j.transferAt)));
  const legs=el('div','trip-legs');for(const l of j.legs){const d=el('div','leg');d.append(el('span','small-line',l.t.l),el('span','',timeFor(l.depart)+' '+stationName(l.from)+' → '+timeFor(l.arrive)+' '+stationName(l.to)));legs.append(d);}panel.append(legs);
 }
 const proof=el('div','train-evidence');const alternative=j.legs.some(l=>l.t.src==='trenalia-schedule-only');
 const officialPdf=j.legs.some(l=>l.t.src==='official-r4-pdf');
 const officialR1=j.legs.some(l=>l.t.src==='official-r1-pdf');
 const officialRL3=j.legs.some(l=>l.t.src==='official-rl3-pdf');
 const officialExtra=j.legs.some(l=>l.t.src==='official-supplement-pdf');
 const officialRegional=j.legs.some(l=>l.t.src==='official-regional-pdf');
 let notes=[officialRegional?'Origen: cuadro oficial de Rodalies regionales. Únicamente horarios y paradas verificadas; los trayectos parciales no incluyen transbordos a autobús ni suponen circulación confirmada.':
   officialExtra?'Origen: cuadro oficial Rodalies 2026 con horas impresas por parada. Horario programado; no confirma circulación, incidencias ni festivos especiales.':
   officialRL3?'Origen: cuadro horario oficial RL3/RL4 de Rodalies (06/07/2026); tiempos impresos por estación, sin confirmar circulación real.':
   officialR1?'Origen: cuadro horario oficial R1 (PDF de Rodalies), 27 estaciones de L’Hospitalet a Maçanet. Solo horario programado sin ETA verificable.':
   officialPdf?'Origen: cuadro horario oficial R4 (PDF de Rodalies). Solo horario programado hasta que una fuente confirme una estimación para este servicio.':
   alternative?'Origen: Trenalia (horarios Renfe). Solo horario orientativo, sin número de tren ni horas de paradas intermedias confirmadas.':'Origen: Renfe GTFS oficial'];
 for(const l of j.legs){if(l.t.scope)notes.push('Ámbito documentado: '+l.t.scope);if(l.proof.length)notes.push(l.proof.join('; '));if(l.platform)notes.push('Vía publicada: '+l.platform);}
 if(j.kind==='transfer')notes.push(j.connectionRisk?'ATENCIÓN: conexión en riesgo por retraso observado del primer tren; llegada no estimada':'Conexión teórica con margen programado; llegada y enlace no confirmados');
 if(catalog&&Date.now()-Date.parse(catalog.generated_at||'')>48*3600000)notes.push('Catálogo GTFS antiguo: comprobar el horario vigente en Renfe');
 // Dynamic nodes instead of innerHTML from external providers (XSS-safe).
 proof.append(el('b','', 'Evidencias: '),document.createTextNode(notes.join(' · ')));if(alternative){const attribution=el('a','','Trenalia · datos de Renfe');attribution.href='https://trenalia.org/api';attribution.target='_blank';attribution.rel='noopener noreferrer';proof.append(document.createTextNode(' · '),attribution);}
 if(officialPdf){const ref=el('a','','Cuadro oficial R4');ref.href=catalog?.official_r4_pdf?.source||'https://rodalies.gencat.cat/web/.content/02_Horaris/horaris/R4.pdf';ref.target='_blank';ref.rel='noopener noreferrer';proof.append(document.createTextNode(' · '),ref);}
 if(officialRL3){const ref=el('a','','Cuadro oficial RL3/RL4');ref.href=catalog?.official_rl3_pdf?.source||'https://rodalies.gencat.cat/web/.content/02_Horaris/horaris/RL3RL4.pdf';ref.target='_blank';ref.rel='noopener noreferrer';proof.append(document.createTextNode(' · '),ref);}
 if(officialRegional){for(const line of [...new Set(j.legs.filter(l=>l.t.src==='official-regional-pdf').map(l=>l.t.l))]){const url=catalog?.regional_official_pdf?.sources?.[line];if(url){const ref=el('a','','Cuadro oficial '+line);ref.href=url;ref.target='_blank';ref.rel='noopener noreferrer';proof.append(document.createTextNode(' · '),ref);}}}
 if(officialExtra){for(const line of [...new Set(j.legs.filter(l=>l.t.src==='official-supplement-pdf').map(l=>l.t.l))]){const url=catalog?.additional_official_pdf?.sources?.[line];if(url){const ref=el('a','','Cuadro oficial '+line);ref.href=url;ref.target='_blank';ref.rel='noopener noreferrer';proof.append(document.createTextNode(' · '),ref);}}}
 if(officialR1){const ref=el('a','','Cuadro oficial R1');ref.href=catalog?.official_r1_pdf?.source||'https://rodalies.gencat.cat/web/.content/02_Horaris/horaris/R1.pdf';ref.target='_blank';ref.rel='noopener noreferrer';proof.append(document.createTextNode(' · '),ref);}
 panel.append(proof);root.append(panel);
 }
 $('load-more').hidden=results.length<=visible;
 $('load-more').textContent=`Mostrar más (${Math.max(0,results.length-visible)} restantes)`;
}
function updateSummary(range,scheduleCount,live){const direct=results.filter(x=>x.kind==='direct').length,transfer=results.filter(x=>x.kind==='transfer').length,cancel=results.filter(x=>x.cancelled).length,pos=results.filter(x=>x.live).length;
 $('results-title').textContent=(selection.line==='ALL'?'Red Rodalies':selection.line)+' · '+stationName(selection.from)+' → '+stationName(selection.to);
 $('results-subtitle').textContent=range.day+' · '+range.from+'–'+range.to+(range.extra?' (hasta mañana)':'');
 $('results-total').textContent=results.length+' '+(results.length===1?'opción':'opciones');
 const etaCount=results.filter(x=>x.estimated!==null&&!x.cancelled&&!x.conflict).length;
 const st=$('status');if(!results.length){st.className='notice warn';
  const outsidePublishedR1=selection.line==='R1'&&catalog?.official_r1_pdf?.exclusions?.length&&
   [selection.from,selection.to].some(code=>catalog.official_r1_pdf.exclusions.includes(stationName(code)));
  st.textContent=outsidePublishedR1?
   'La estación seleccionada no figura en el cuadro horario R1 actualmente publicado, que cubre L’Hospitalet–Maçanet. No se pueden mostrar trenes sin horarios verificados; consulta las modificaciones del servicio.':
   scheduleCount?'No se han encontrado servicios directos ni conexiones de un transbordo en esta franja. No implica que el servicio esté suspendido.':'No hay servicios GTFS verificables para esta combinación de estaciones, línea y fecha. El inventario no garantiza circulación.';
  const refPdf=catalog?.official_reference?.lines?.find(l=>l.id===selection.line)?.timetable_pdf;
  const a=el('a','','Consultar cuadro horario oficial de '+selection.line);a.href=refPdf||'https://rodalies.gencat.cat/es/horaris/tots-els-horaris/';a.target='_blank';a.rel='noopener noreferrer';st.append(document.createTextNode(' · '),a);}
 else{st.className='notice '+(cancel?'warn':pos?'good':'neutral');st.textContent=`${direct} directos · ${transfer} con un transbordo · ${etaCount} con hora estimada · ${pos} con posición reciente · ${cancel} cancelados. Sin observación válida se mantiene el horario programado.`;}
 const age=Date.now()-Date.parse(catalog?.generated_at||'');
 $('updated').textContent=`Consulta ${fmtTime(Date.now()/1000)} · Datos operativos: ${live?'consultados en este momento':'solo horarios programados para fecha futura'}. ${Number.isFinite(age)&&age>48*3600000?'ATENCIÓN: GTFS sin regenerar desde hace más de 48 horas. ':''}Esta aplicación es orientativa.`;
}
async function search(){if(!catalog){showToast('El catálogo todavía no está disponible');return;}
 let range;try{range=validateRange();}catch(err){const st=$('status');st.className='notice bad';st.textContent=err.message;showToast(err.message);return;}
 const id=++requestId;controller?.abort();controller=new AbortController();const signal=controller.signal;markBusy(true);setHealth('pending','Consultando');$('status').className='notice neutral';$('status').textContent='Buscando recorridos en el horario oficial…';$('results-total').textContent='…';
 try{
  // The source accepts GTFS times up to 47:59. A late previous-service-day
  // train can depart after 06:00. Always include the preceding service day.
  const days=[datePlus(range.day,-1),range.day];
  if(range.extra)days.push(datePlus(range.day,1));
  // A valid first service day has no preceding publication file.
  const availableDays=days.filter(d=>d>=catalog.coverage_start&&d<=catalog.coverage_end);
  // Start independent sources in parallel: a slow optional timetable endpoint
  // must not add its timeout on top of the GTFS and operational requests.
  // The Trenalia timetable endpoint also supports multi-line corridors.
  // In ALL mode retain the explicit commercial line of every validated row,
  // rather than silently hiding scheduled trains not present in Renfe GTFS.
  const canSupplement=!!selection.line&&
    /^\d{5}$/.test(selection.from)&&/^\d{5}$/.test(selection.to);
  const query=canSupplement?new URLSearchParams({from:selection.from,to:selection.to,
    date:range.day,limit:'400'}):null;
  const supplementalTask=canSupplement?
    loadJson('https://trenalia.org/api/v1/timetable?'+query,signal,CONFIG.timeoutMs)
      .then(data=>({data}),error=>({error})):Promise.resolve(null);
  const today=madridDate(),live=range.day===today&&/^\d{5}$/.test(selection.from);
  const jobs=live?sourceJobs(selection.from):[];
  const operationalTask=live?Promise.allSettled(jobs.map(j=>loadJson(j.url,signal))):Promise.resolve([]);
  const daily=await Promise.all(availableDays.map(d=>dayData(d,signal)));
  if(signal.aborted||id!==requestId)return;
  const trips=daily.flatMap(x=>x.trains.map(t=>({...t,day:x.day})));
  let scheduled=buildWindow(trips,range);
  // The optional timetable fallback has no reliable train number or individual
  // intermediate stop times. It MUST NOT replace an available GTFS itinerary.
  let fallback=[],fallbackAvailable=false,fallbackError=null;
  if(canSupplement){
   const candidate=await supplementalTask;
   if(signal.aborted||id!==requestId)return;
   if(candidate?.data){
    fallbackAvailable=true;
    fallback=E.normalizeTrenaliaTimetable(candidate.data,selection.from,
      selection.to,range.day,selection.line);
    const supplemental=E.direct(fallback,selection.from,selection.to,range.start,range.end);
    scheduled=E.mergeSupplementalJourneys(scheduled,supplemental);
   }else fallbackError=candidate?.error||new Error('Sin horario alternativo');
  }
  if(!scheduled.length&&daily.every(x=>x.trains.length===0))showToast('Sin horarios oficiales para esa fecha');
  $('status').textContent=`${scheduled.length} opciones programadas. Contrastando datos…`;
  // Do not send reference-only IDs to providers as verified ADIF station codes.
  const res=await operationalTask;
  if(signal.aborted||id!==requestId)return;
  const now=Math.floor(Date.now()/1000);
  const data=i=>res[i]?.status==='fulfilled'?res[i].value:null;
  const board=live?[...E.normalizeBoard(data(0),'Valfiguer',now,selection.from).map(x=>({...x,boardStop:selection.from})),...E.normalizeBoard(data(1),'ADIF/RadarDeTrenes',now,selection.from).map(x=>({...x,boardStop:selection.from}))]:[];
  const positions=live?[...E.normalizePositions(data(2),'Renfe/Valfiguer',now),...E.normalizePositions(data(3),'Renfe/ADIF',now)]:[];
  const cancellations=live?E.normalizeCancels(data(4)):[];
  // Match board destination text to one validated ADIF code. Ambiguous or
  // missing stations never establish direction for an anonymous PDF journey.
  const stationNames=new Map();
  for(const station of catalog.stations){
   if(!/^\d{5}$/.test(station.id))continue;
   for(const name of [station.name,station.gtfs_name,...(station.aliases||[])]){
    if(!name)continue;
    const key=E.norm(name);
    if(!key)continue;
    if(!stationNames.has(key))stationNames.set(key,station.id);
    else if(stationNames.get(key)!==station.id)stationNames.set(key,'');
   }
  }
  const correlatedBoard=E.correlateTimetableBoards(scheduled,board,trips,stationNames);
  results=scheduled.map(j=>E.enrichJourney(j,correlatedBoard,positions,cancellations,now));visible=12;latestSearch={range};
  renderResultList();updateSummary(range,trips.length+fallback.length,live);
  const lines=selection.line==='ALL'?new Set(E.LINES):new Set([selection.line]);
  // An incident can explain why no trips were found; do not use results to filter it.
  const alerts=live?[...E.alertsForLines(data(5),lines).map(a=>({...a,source:'Valfiguer'})),
    ...E.alertsForLines(data(7),lines,true).map(a=>({...a,source:'RadarDeTrenes'}))]:[];
  const uniqueAlerts=new Map();for(const a of alerts){const key=E.norm(a.text);if(!uniqueAlerts.has(key))uniqueAlerts.set(key,a);}
  renderAlerts([...uniqueAlerts.values()],live);
  renderSourceSummary(res,jobs,live?'live':'future',catalog,{queried:canSupplement,available:fallbackAvailable,records:fallback.length,error:fallbackError});
  const failures=res.filter(x=>x.status==='rejected').length;
  const operationalLinked=results.some(j=>j.estimated!==null&&!j.conflict&&!j.cancelled);
  const failedAllLive=live&&res.length>0&&res.every(x=>x.status==='rejected');
  setHealth(failedAllLive?'partial':operationalLinked?'good':fallback.length?'partial':!live?'good':failures?'partial':'partial',
    failedAllLive?'Sin datos actuales':operationalLinked?'Estimación disponible':fallback.length?'Horario orientativo':!live?'Horario programado':failures?'Datos parciales':'Sin ETA vinculada');
  $('search-feedback').textContent='';
 }catch(err){if(!signal.aborted&&id===requestId){const st=$('status');st.className='notice bad';st.textContent='No se ha podido consultar el horario: '+err.message;setHealth('bad','Sin horario');}}
 finally{if(id===requestId)markBusy(false);}
}
async function refreshRuntime(){
 if(document.hidden||isBusy||!catalog)return;
 const today=madridDate();
 // Rolling quick windows must advance while the app stays open.
 if(quickValue!==null){const next=Math.ceil((Date.now()+180000)/300000)*300000;
  if($('trip-date').value!==madridDate(next)||$('from-time').value!==timeInput(next))selectQuick(quickValue);
 }
 if(lastLocalDay!==today){
  const old=lastLocalDay;lastLocalDay=today;
  $('trip-date').min=today;$('trip-date').max=datePlus(today,CONFIG.nearDays-1);
  if($('trip-date').value<today){selectQuick(quickValue||2);}
  else if(old){invalidateResults();}
 }
 if(Date.now()-lastCatalogCheck>=5*60000){
  lastCatalogCheck=Date.now();
  try{
   const candidate=await loadCatalog(null);
   if(candidate.reference_only&&!catalog.reference_only){
    setHealth('partial','Sin revalidación de datos');
    $('catalog-message').textContent='No ha sido posible comprobar la última versión del GTFS. Se conserva el catálogo anterior, que podría estar desactualizado.';
   }else if(candidate.generated_at!==catalog.generated_at||candidate.batch_id!==catalog.batch_id){
    const previous={...selection};catalog=candidate;
    stationMap=new Map(candidate.stations.map(s=>[s.id,s]));loadedDay.clear();
    renderLineOptions();renderOfficialAudit(candidate);
    $('network-tag').textContent=candidate.reference_only?`Referencia: ${candidate.stations.length} puntos`:
      `${candidate.lines.length} líneas · ${candidate.stations.length} estaciones`;
    if(stationMap.has(previous.from)&&stationMap.has(previous.to))applyPair(previous.from,previous.to);
    else applyLine(candidate.lines.find(x=>x.present)?.id||'R4');
    showToast('Catálogo ferroviario actualizado');
   }
  }catch{setHealth('partial','Sin revalidación de datos');}
 }
 if(catalog&&!catalog.reference_only&&selection.from&&selection.to)void search();
}
async function init(){const d=madridDate();lastLocalDay=d;lastCatalogCheck=Date.now();$('trip-date').value=d;$('trip-date').min=d;$('trip-date').max=datePlus(d,CONFIG.nearDays-1);
 for(const b of document.querySelectorAll('[data-hours]'))b.addEventListener('click',()=>selectQuick(Number(b.dataset.hours)));
 for(const id of ['trip-date','from-time','to-time'])$(id).addEventListener('change',manualChanged);
 $('search').addEventListener('click',()=>void search());$('refresh').addEventListener('click',()=>void search());
 $('load-more').addEventListener('click',()=>{visible+=12;renderResultList();});
 $('swap').addEventListener('click',()=>{if(stationMap.has(selection.from)&&stationMap.has(selection.to))applyPair(selection.to,selection.from,true);else showToast('Elige dos estaciones primero');});
 $('fav-ida').addEventListener('click',()=>applyPair('78710','78805',true));
 $('fav-vuelta').addEventListener('click',()=>applyPair('71801','78710',true));
 selectQuick(2);
 try{
  const response=await loadCatalog(null);catalog=response;
  stationMap=new Map(response.stations.map(s=>[s.id,s]));wirePickers();renderLineOptions();renderOfficialAudit(response);
  const available=response.lines.filter(x=>x.present);
  $('network-tag').textContent=response.reference_only?`Referencia: ${response.stations.length} puntos`:`${response.lines.length} líneas · ${response.stations.length} estaciones`;
  const absent=response.lines.filter(x=>!x.present).map(x=>x.id);
  const generated=Date.parse(response.generated_at||'');
  const staleGTFS=!Number.isFinite(generated)||Date.now()-generated>48*3600*1000;
  const unchecked=response.official_reference?.lines?.filter(x=>x.status==='pendiente_contraste').length||0;
  if(response.reference_only){
   $('catalog-message').textContent='CATÁLOGO PROVISIONAL: puedes ver líneas y algunas estaciones verificadas, pero aún no hay horarios. Ejecuta el workflow de GitHub Actions para generar la red completa.';
   setHealth('partial','Sin horarios GTFS');
   $('status').className='notice warn';$('status').textContent='Todavía no se ha generado data/v2/catalog.json. Los desplegables solo incluyen estaciones verificadas de referencia; no están todas las paradas.';
  }else{
   $('catalog-message').textContent=(staleGTFS?'GTFS desactualizado. ':'')+
    `Red: ${response.lines.length} líneas · ${response.stations.length} estaciones · GTFS en ${available.length} líneas. El resto usa horarios complementarios cuando están disponibles. Consulta la cobertura detallada abajo.`;
   setHealth(staleGTFS||absent.length?'partial':'good',staleGTFS?'Horario desactualizado':absent.length?'Cobertura parcial':'Red disponible');
  }
  let pair=null;try{pair=JSON.parse(localStorage.getItem('mirodalies-v2-pair')||'null');}catch{}
  if(pair&&stationMap.has(pair.from)&&stationMap.has(pair.to))applyPair(pair.from,pair.to);
  else if(stationMap.has('78710')&&stationMap.has('78805'))applyPair('78710','78805');
  else applyLine('R4');
  if(response.reference_only){
   setHealth('partial','Sin horarios GTFS');
   $('status').className='notice warn';
   $('status').textContent='Catálogo provisional: faltan las paradas completas y los horarios. Ejecuta GitHub Actions para generar data/v2/catalog.json.';
  }
  if(!response.reference_only&&selection.from&&selection.to)await search();
 }catch(e){$('catalog-message').textContent='No se ha podido descargar ni el GTFS ni el catálogo provisional de referencia.';setHealth('bad','Sin catálogo');
  $('status').className='notice bad';$('status').textContent='No se pudo cargar el catálogo. Comprueba que data/reference/fallback_catalog.json esté publicado y ejecuta el workflow GTFS.';
  $('network-tag').textContent='Red no disponible';
 }
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refreshRuntime();});
 setInterval(()=>{if(!document.hidden&&!isBusy)void refreshRuntime();},CONFIG.refreshMs);
 if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
init();
