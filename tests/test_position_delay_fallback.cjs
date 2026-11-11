'use strict';
const assert=require('node:assert/strict');
const E=require('../engine.js');
const now=Date.parse('2026-11-12T08:00:00Z')/1000,dep=now+600;
const trip='5115J77512R4';
const t={id:trip,n:'77512',l:'R4',day:'2026-11-12',s:[
 ['78710',dep,dep],['78805',dep+1800,dep+1800]]};
const j=E.direct([t],'78710','78805',dep-60,dep+900)[0];
const source=(row)=>E.normalizePositions({trains:[{tripId:trip,trainCode:'77512',line:'R4',
 timestamp:new Date((now-15)*1000).toISOString(),...row}]},'Radar',now);
let p=source({delayMinutes:5});assert.equal(p[0].delaySeconds,300);
let a=E.enrichJourney(j,[],p,[],now);
assert.equal(a.estimated,dep+300,'Unique trip position delay must improve schedule when station board has no ETA');
assert.equal(a.state,'live');assert.match(a.legs[0].proof.join(' '),/sin paso confirmado/);
assert.equal(E.enrichJourney(j,[],source({}),[],now).estimated,null,'No explicit delay -> no ETA');
assert.equal(E.enrichJourney(j,[],source({delayMinutes:200}),[],now).estimated,null,'Excessive delay rejected');
assert.equal(E.enrichJourney(j,[],source({delayMinutes:5,stale:true}),[],now).estimated,null,'Stale telemetry rejected');
assert.equal(E.enrichJourney(j,[],source({delayMinutes:5,tripId:'different'}),[],now).estimated,null,'Wrong trip rejected');
assert.equal(E.enrichJourney(j,[],source({delayMinutes:5,line:'R2'}),[],now).estimated,null,'Wrong line rejected');
assert.equal(E.enrichJourney(j,[],source({delayMinutes:5,timestamp:new Date((now-130)*1000).toISOString()}),[],now).estimated,null,'Old telemetry rejected');
const board=E.normalizeBoard({departures:[{trainCode:'77512',tripId:trip,line:'R4',stationCode:'78710',
 plannedTime:dep*1000,estimatedTime:(dep+180)*1000,timestamp:now*1000}]},'Radar station',now,'78710');
assert.equal(E.enrichJourney(j,board,p,[],now).estimated,dep+180,
 'Fresh station-board ETA takes priority over train-level delay');
const conflict=E.normalizeBoard({departures:[{trainCode:'77512',tripId:trip,line:'R4',stationCode:'78710',
 plannedTime:dep*1000,estimatedTime:(dep+1200)*1000,timestamp:now*1000}]},'Other station',now,'78710');
const combined=E.enrichJourney(j,[...board,...conflict],p,[],now);
assert.equal(combined.conflict,true);assert.equal(combined.estimated,null,
 'Conflicting station boards cannot be silently overridden by fleet delay');
const van=E.normalizePositions({features:[{properties:{
  product:'C4',trip_id:trip,train_number:'77512',delay_s:240,reported_at:new Date((now-12)*1000).toISOString(),
  nucleo:'Catalunya',category:'cercanias'}}]},'Valfiguer',now);
assert.equal(van[0].delaySeconds,240);
assert.equal(E.enrichJourney(j,[],van,[],now).estimated,dep+240);
console.log('OK: ETA desde posición identificada, prioridad del panel de estación, stale/conflicto/antigüedad');
