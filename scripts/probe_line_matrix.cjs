'use strict';
/* Per-line source matrix: aggregate-only snapshot, explicitly NOT verified ETAs.
 * Uses official reference corridor names; station IDs must be exact ADIF codes.
 * Primary timetable sample: Thu 2026-11-12; weekend: Sun 2026-11-15.
 * Raw observations, personal information, train IDs and positions aren't saved.
 */
const fs=require('node:fs'),path=require('node:path');
const E=require('../engine.js');
const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data/v2/catalog.json'),'utf8'));
const lines=catalog.lines.map(x=>x.id);
const select={
 R1:[['Molins de Rei','Mataró'],['Mataró','Maçanet-Massanes']],
 R2:[['Castelldefels','Granollers Centre']],
 R2N:[['Barcelona-Sants','Granollers Centre'],['Granollers Centre','Sant Celoni']],
 R2S:[['Barcelona-Sants','Vilanova i la Geltrú'],['Vilanova i la Geltrú','Sant Vicenç de Calders']],
 R3:[['Barcelona-Fabra i Puig','Vic'],['Vic','Ripoll']],
 R4:[['Terrassa Est','Barcelona-Plaça de Catalunya'],['Barcelona-Sants','Terrassa Est']],
 R7:[['Barcelona-Fabra i Puig','Cerdanyola Universitat']],
 R8:[['Martorell Central','Granollers Centre']],
 RG1:[['Girona','Figueres'],['Blanes','Mataró']],
 RT1:[['Tarragona','Reus'],['Reus','La Plana-Picamoixons']],
 RT2:[['Tarragona','Salou - Port Aventura'],["L'Arboç",'Tarragona']],
 RL3:[['Lleida-Pirineus','Cervera'],['Cervera','Lleida-Pirineus']],
 RL4:[['Lleida-Pirineus','Manresa'],['Manresa','Terrassa Estació del Nord']],
 R11:[['Barcelona-Sants','Girona'],['Girona','Portbou']],
 R13:[['Barcelona-Estació de França','Valls'],['Valls','Lleida-Pirineus']],
 R14:[['Barcelona-Estació de França','Reus'],['Reus','Lleida-Pirineus']],
 R15:[['Barcelona-Estació de França','Reus'],['Reus','Riba-roja d’Ebre']],
 R16:[['Barcelona-Estació de França','Tortosa'],['Tarragona','Tortosa']],
 R17:[['Barcelona-Estació de França','Salou - Port Aventura'],['Tarragona','Salou - Port Aventura']]
};
function normalize(s){return E.norm(s).replace(/\bst\b/g,'sant').replace(/\bbcn\b/g,'barcelona');}
function originIndex(){const map=new Map();for(const s of catalog.stations){if(!/^[0-9]{5}$/.test(s.id))continue;
 for(const x of [s.name,s.gtfs_name,...(s.aliases||[])])if(x){const k=normalize(x);if(!map.has(k))map.set(k,new Set());map.get(k).add(s.id);}
 }return map;}
const ids=originIndex();
function extractStops(j){return Array.isArray(j)?j:Array.isArray(j?.stations)?j.stations:Array.isArray(j?.data)?j.data:Array.isArray(j?.data?.stations)?j.data.stations:[];}
function registerRadar(j){
 for(const s of extractStops(j)){
  const code=String(s.code??s.stationCode??s.id??'');
  if(!/^\d{5}$/.test(code))continue;
  for(const name of [s.name,s.stationName,s.displayName,s.label])if(typeof name==='string'){
   const k=normalize(name);if(!ids.has(k))ids.set(k,new Set());ids.get(k).add(code);
  }
 }
}
function getId(name){const x=[...(ids.get(normalize(name))||[])];return x.length===1?x[0]:null;}
const now=Math.floor(Date.now()/1000),timeout=10000;
async function getJson(url){
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),timeout);
 try{const r=await fetch(url,{headers:{Accept:'application/json',Origin:'https://arl338.github.io'},signal:ac.signal});
  if(!r.ok)throw Error('http_'+r.status);
  return await r.json();
 }finally{clearTimeout(timer);}
}
async function pool(actions,n=5){
 let next=0;const results=new Array(actions.length);
 await Promise.all(Array.from({length:Math.min(n,actions.length)},async()=>{while(next<actions.length){
  const i=next++;try{results[i]=await actions[i]();}catch(e){results[i]={error:e.name==='AbortError'?'timeout':String(e.message).slice(0,55)};}
 }}));return results;
}
function products(obj,lid){
 const rows=Array.isArray(obj?.trains)?obj.trains:[];
 const own=rows.filter(x=>String(x.product||'').toLowerCase()==='cercanías '+lid.toLowerCase()).length;
 const kinds={};for(const x of rows){const k=String(x.product||'Unknown');kinds[k]=(kinds[k]||0)+1;}
 return {raw:rows.length,explicit_line:own,products:kinds,missing_operator_count:(obj.missingOperators||[]).length};
}
async function main(){
 try{registerRadar(await getJson('https://radardetrenes.com/api/v1/stations'));}
 catch(e){console.log('Radar station directory unavailable',e.message);}
 const fleetResults=await Promise.allSettled([
  getJson('https://radardetrenes.com/api/v1/fleet?type=commuter'),
  getJson('https://trenes.valfiguer.com/api/v1/trains')]);
 const radarPositions=fleetResults[0].status==='fulfilled'?E.normalizePositions(fleetResults[0].value,'RadarDeTrenes',now):[];
 const valPositions=fleetResults[1].status==='fulfilled'?E.normalizePositions(fleetResults[1].value,'Valfiguer',now):[];
 const tasks=[];
 const contexts=lines.map(line=>{
  const trials=(select[line]||[]).map(names=>({names,from:getId(names[0]),to:getId(names[1])}));
  const refCount=catalog.stations.filter(s=>s.lines.includes(line)).length;
  const scheduleCount=catalog.stations.filter(s=>s.schedule_lines?.includes(line)).length;
  return {line,gtfs_trips:catalog.lines.find(x=>x.id===line)?.scheduled_trips_in_period,
   stations:refCount,stations_with_gtfs:scheduleCount,trials,
   radar_positions:radarPositions.filter(p=>p.line===line).length,
   valfiguer_positions:valPositions.filter(p=>p.line===line).length,
   probes:[]};
 });
 const active=new Map();
 for(const x of contexts)for(const trial of x.trials){if(!trial.from||!trial.to||trial.from===trial.to){
    x.probes.push({name:trial.names.join(' → '),status:'unknown_ADIF_code'});
    continue;}
  const p={name:trial.names.join(' → '),from:trial.from,to:trial.to,days:[]};x.probes.push(p);
  for(const day of ['2026-11-12','2026-11-15']){
   tasks.push({run:async()=>{
      const params=new URLSearchParams({from:trial.from,to:trial.to,date:day,limit:'400'});
      const response=await getJson('https://trenalia.org/api/v1/timetable?'+params);
      return products(response,x.line);
    },into:v=>p.days.push({date:day,...v})});
  }
  if(!active.has(trial.from))active.set(trial.from,{from:trial.from,lines:new Set()});
  active.get(trial.from).lines.add(x.line);
 }
 const raws=await pool(tasks.map(x=>x.run),5);raws.forEach((v,i)=>tasks[i].into(v));
 const boards=new Map();const boardTasks=[];
 for(const [from] of active){
  for(const [name,url] of [
    ['RadarDeTrenes','https://radardetrenes.com/api/v1/stations/'+from+'/board-renfe'],
    ['Valfiguer','https://trenes.valfiguer.com/api/v1/stations/'+from]]){
   boardTasks.push({from,name,run:async()=>getJson(url)});
  }
 }
 const boardResults=await pool(boardTasks.map(x=>x.run),5);
 for(let i=0;i<boardTasks.length;i++){
  const task=boardTasks[i],data=boardResults[i];
  const norm=data?.error?[]:E.normalizeBoard(data,task.name,now,task.from);
  const byLine={};
  for(const row of norm){
   if(!row.line)continue;
   const z=byLine[row.line]||{rows:0,fresh_estimate:0,has_train_number:0,has_trip_id:0,stale:0};
   z.rows++;if(row.stale)z.stale++;
   if(row.number)z.has_train_number++;if(row.trip)z.has_trip_id++;
   if(!row.stale&&row.age!==null&&row.age<=180&&row.planned!==null&&row.estimated!==null)z.fresh_estimate++;
   byLine[row.line]=z;
  }
  boards.set(task.from+'|'+task.name,{error:data?.error||null,total_norm:norm.length,byLine});
 }
 for(const x of contexts){
  const bySource={};
  for(const name of ['RadarDeTrenes','Valfiguer']){
   const origins=[...new Set(x.trials.map(q=>q.from).filter(Boolean))];
   const series=origins.map(o=>boards.get(o+'|'+name)).filter(Boolean);
   bySource[name]={sampled_origins:origins.length,parsed_rows:series.reduce((n,v)=>n+v.total_norm,0),
    matching_line:series.reduce((n,v)=>n+(v.byLine[x.line]?.rows||0),0),
    fresh_etas:series.reduce((n,v)=>n+(v.byLine[x.line]?.fresh_estimate||0),0),
    matching_trip_ids:series.reduce((n,v)=>n+(v.byLine[x.line]?.has_trip_id||0),0),
    errors:series.filter(v=>v.error).map(v=>v.error)};
  }
  x.live_board=bySource;
 }
 const out={schema:1,observed_at:new Date(now*1000).toISOString(),
  dates_tested:['2026-11-12','2026-11-15'],
  caveats:['Muestras de recorridos seleccionados, no exhaustividad por línea.',
           'Las etiquetas comerciales no prueban independencia del origen Renfe.',
           'Posiciones por línea no equivalen a hora real en una estación.',
           'Disponibilidad de ETA y correlación tren/GTFS requieren identificador y horario.',
           'Los PDFs oficiales deben verificarse por estación y calendario antes de usar datos de terceros como principal.'],
  live_position_sources:{radar_status:fleetResults[0].status,valfiguer_status:fleetResults[1].status},
  lines:contexts};
 fs.writeFileSync('line-source-matrix.json',JSON.stringify(out,null,2)+'\n');
 for(const x of contexts){
  const samples=x.probes.map(p=>p.name+':'+(p.days||[]).map(d=>d.error?'ERR':d.explicit_line).join('/')).join('; ');
  console.log(JSON.stringify({l:x.line,gtfs:x.gtfs_trips,stations:x.stations,gtfs_stations:x.stations_with_gtfs,
   trenalia:samples,radar_board:x.live_board.RadarDeTrenes.matching_line,
   radar_eta:x.live_board.RadarDeTrenes.fresh_etas,val_board:x.live_board.Valfiguer.matching_line,
   val_eta:x.live_board.Valfiguer.fresh_etas,radar_pos:x.radar_positions,val_pos:x.valfiguer_positions}));
 }
}
main().catch(e=>{console.error(e);process.exitCode=1});
