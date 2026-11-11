'use strict';
const assert=require('node:assert/strict');
const {stats}=require('../scripts/diagnose_feeds.cjs');
const now=Date.parse('2026-11-12T08:00:00Z')/1000,dep=now+600;
const trip='5115J77512R4';
const train={id:trip,n:'77512',l:'R4',day:'2026-11-12',s:[
 ['78710',dep,dep],['78805',dep+1800,dep+1800]]};
const board={station:{code:'78710'},trains:[
 {trip_id:trip,train_number:'77512',line:'R4',planned_ts:dep,
  delay_s:120,age_s:20},
 {trip_id:'irrelevant',train_number:'99999',line:'R4',
  planned_ts:dep+60,delay_s:60,age_s:20},
 {train_number:'no_identifier',planned_ts:dep,delay_s:90,age_s:20}]};
const data=stats({now,origin:'78710',destination:'78805',start:dep-100,end:dep+100,
 trains:[train],feeds:{valBoard:board}});
assert.equal(data.scheduled_direct_journeys,1);
assert.equal(data.candidate_board_rows,2);
assert.equal(data.matched_board_rows,1);
assert.equal(data.journeys_with_estimate,1);
assert.equal(data.board_reasons.vinculado,1);
assert.equal(data.board_reasons.sin_viaje_compatible,1);
const noTrains=stats({now,origin:'78710',destination:'78805',
 start:dep-100,end:dep+100,trains:[],feeds:{valBoard:board}});
assert.equal(noTrains.scheduled_direct_journeys,0);
assert.equal(noTrains.matched_board_rows,0);
assert.equal(noTrains.candidate_board_rows,2);
console.log('OK: diagnóstico de normalización, descarte y vinculación de feeds');

const E=require('../engine.js');
const staleBoard=E.normalizeBoard({generated_at:new Date(now*1000).toISOString(),
 station:{code:'78710'},trains:[{trip_id:trip,train_number:'77512',
 product:'C4',planned_ts:dep,estimated_ts:dep+600,stale:true,
 cancelled:true}]},'Valfiguer',now,'78710');
assert.equal(staleBoard.length,1,'Keep stale metadata for diagnostics');
assert.equal(staleBoard[0].stale,true);
const leg=E.direct([train],'78710','78805',dep-100,dep+100)[0].legs[0];
const ignored=E.enrichLeg(leg,staleBoard,[],[],now);
assert.equal(ignored.estimated,null,'Stale board may not assign an estimated departure');
assert.equal(ignored.cancelled,false,'Stale board may not cancel a scheduled train');
const fresh=E.normalizeBoard({generated_at:new Date(now*1000).toISOString(),
 station:{code:'78710'},trains:[{trip_id:trip,train_number:'77512',
 product:'C4',planned_ts:dep,estimated_ts:dep+600,stale:false,
 age_s:12}]},'Valfiguer',now,'78710');
assert.equal(E.enrichLeg(leg,fresh,[],[],now).estimated,dep+600,
 'Fresh observation is still accepted');
console.log('OK: paneles stale no generan ETAs ni cancelaciones');
