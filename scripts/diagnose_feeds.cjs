#!/usr/bin/env node
'use strict';
/**
 * Read-only, offline diagnostics of operational feed fixtures.
 *
 * Input JSON: {now, origin, destination, start, end, trains, feeds:
 * {valBoard, radarBoard, valPositions, radarPositions, cancellations}}
 *
 * No network requests. Do not commit real raw feed payloads containing personal
 * or sensitive fields. Output includes aggregate counts only.
 */
const fs=require('node:fs');
const E=require('../engine.js');

function stats(input){
 const now=Number(input.now);
 if(!Number.isFinite(now))throw new Error('now debe ser Unix seconds');
 const origin=String(input.origin||''),destination=String(input.destination||'');
 const start=Number(input.start),end=Number(input.end);
 if(!origin||!destination||!Number.isFinite(start)||!Number.isFinite(end)||end<=start)
  throw new Error('Origen, destino y franja temporal obligatorios');
 const trains=Array.isArray(input.trains)?input.trains:[];
 const feeds=input.feeds||{};
 const boardParts=[
  {key:'valBoard',name:'Valfiguer',obj:feeds.valBoard},
  {key:'radarBoard',name:'RadarDeTrenes',obj:feeds.radarBoard}
 ];
 const posParts=[
  {key:'valPositions',name:'Valfiguer',obj:feeds.valPositions},
  {key:'radarPositions',name:'RadarDeTrenes',obj:feeds.radarPositions}
 ];
 const boards=[],positions=[];
 const sources=[];
 for(const p of boardParts){
  const norm=E.normalizeBoard(p.obj,p.name,now,origin);
  boards.push(...norm);
  sources.push({feed:p.key,raw_rows:E.rows(p.obj).length,normalized_rows:norm.length,
                dropped_by_normalizer:E.rows(p.obj).length-norm.length});
 }
 for(const p of posParts){
  const norm=E.normalizePositions(p.obj,p.name,now);
  positions.push(...norm);
  sources.push({feed:p.key,raw_rows:E.rows(p.obj).length,normalized_rows:norm.length,
                note:'Un registro de posiciones puede incluir múltiples runs'});
 }
 const journey=E.direct(trains,origin,destination,start,end);
 const legs=journey.flatMap(j=>j.legs);
 const counts={};
 const matchedBoard=new Set(),matchedPosition=new Set();
 for(let i=0;i<boards.length;i++){
  const b=boards[i];
  const matches=legs.filter(l=>E.matchExact(l,b));
  if(matches.length)matchedBoard.add(i);
  let reason='sin_viaje_compatible';
  if(b.age===null||b.age<0||b.age>180)reason='sin_timestamp_reciente';
  else if(b.planned===null)reason='sin_hora_programada';
  else if(b.estimated===null)reason='sin_estimacion';
  else if(matches.length)reason='vinculado';
  counts[reason]=(counts[reason]||0)+1;
 }
 for(let i=0;i<positions.length;i++){
  const p=positions[i];
  if(legs.some(l=>E.matchPosition(l,p)))matchedPosition.add(i);
 }
 const usableBoard=boards.filter((b,i)=>matchedBoard.has(i)&&b.age!==null&&b.age>=0&&b.age<=180&&b.planned!==null&&b.estimated!==null);
 const cancellations=E.normalizeCancels(feeds.cancellations);
 const enriched=journey.map(j=>E.enrichJourney(j,boards,positions,cancellations,now));
 return {
  schema:1,mode:'diagnostico_offline',origin,destination,start,end,
  note:'Se evalúan únicamente trayectos DIRECTOS de la selección; no representa la red completa ni todas las llamadas de una estación. Una respuesta HTTP no implica observación válida.',
  scheduled_direct_journeys:journey.length,matched_board_rows:matchedBoard.size,
  candidate_board_rows:boards.length,usable_board_rows:usableBoard.length,
  matched_position_rows:matchedPosition.size,candidate_position_rows:positions.length,
  board_reasons:counts,sources,
  journey_states:enriched.reduce((a,j)=>(a[j.state]=(a[j.state]||0)+1,a),{}),
  journeys_with_estimate:enriched.filter(j=>j.estimated!==null).length,
  journeys_with_conflict:enriched.filter(j=>j.conflict).length,
  cancellation_rows:cancellations.length
 };
}

if(require.main===module){
 try{
  const file=process.argv[2];
  if(!file)throw new Error('Uso: node scripts/diagnose_feeds.cjs caso.json');
  const result=stats(JSON.parse(fs.readFileSync(file,'utf8')));
  console.log(JSON.stringify(result,null,2));
 }catch(err){console.error('ERROR DIAGNÓSTICO:',err.message);process.exitCode=1;}
}
module.exports={stats};
