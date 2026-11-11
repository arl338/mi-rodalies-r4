'use strict';
const assert=require('node:assert/strict'),E=require('../engine.js');
const now=Date.parse('2026-11-12T08:00:00Z')/1000,planned=now+600;
const trip='5115J77512R4', t={id:trip,n:'77512',l:'R4',day:'2026-11-12',
 s:[['78710',planned,planned],['78805',planned+2000,planned+2000]]};
const j=E.direct([t],'78710','78805',planned-120,planned+120)[0];
const row=(attrs={})=>({
 trip_id:trip,train_number:'77512',product:'C4',
 planned_ts:planned,estimated_ts:planned,age_s:12,state:'scheduled',
 delay_s:null,stale:false,...attrs});
function enrich(attrs){
 const parsed=E.normalizeBoard({station:{code:'78710'},trains:[row(attrs)]},
 'Valfiguer',now,'78710');
 return E.enrichJourney(j,parsed,[],[],now);
}
assert.equal(enrich({}).estimated,null,
 'Scheduled-only with estimated_ts cannot be promoted to real ETA');
assert.equal(enrich({estimated_ts:planned+300}).estimated,null,
 'Scheduled-only without operative delay cannot promote a future clock');
assert.equal(enrich({state:'upcoming',delay_s:180,estimated_ts:planned+180}).estimated,planned+180,
 'Up-to-date upcoming service with published delay is valid');
assert.equal(enrich({state:'scheduled',delay_s:180,estimated_ts:planned+180}).estimated,planned+180,
 'Explicit measured delay is still usable even if raw state says scheduled');
assert.equal(enrich({state:'upcoming',estimated_ts:planned+180,delay_s:null}).estimated,planned+180,
 'Active operational predicted arrival remains usable');
assert.equal(enrich({state:'upcoming',estimated_ts:planned+180,delay_s:180,stale:true}).estimated,null,
 'Stale source never promotes an ETA');
const radar=E.normalizeBoard({updatedAt:now*1000,departures:[
 {tripId:trip,trainCode:'77512',line:'R4',stationCode:'78710',
 plannedTime:planned*1000,estimatedTime:(planned+240)*1000,delayMinutes:4,
 timeType:'SCHEDULED',timestamp:now*1000}
]},'RadarDeTrenes',now,'78710');
assert.equal(radar.length,1);
assert.equal(radar[0].estimated,null,
 'timeType SCHEDULED should suppress an explicit estimatedTime as well');
console.log('OK: horario teórico no se presenta como ETA; retrasos y pronósticos válidos se conservan');
