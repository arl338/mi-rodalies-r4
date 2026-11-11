'use strict';
const assert=require('node:assert/strict');
const E=require('../engine.js');
const now=Date.parse('2026-11-12T08:00:00Z')/1000;
const dep=now+600,trip='5115J77512R4';
const t={id:trip,n:'77512',l:'R4',day:'2026-11-12',s:[['78710',dep,dep],['78805',dep+1800,dep+1800]]};
const leg=E.direct([t],'78710','78805',dep-60,dep+900)[0].legs[0];
const boardRow={trip_id:trip,train_number:'77512',line:'R4',planned_ts:dep,
 estimated_ts:dep+360,age_s:10,stale:false,state:'upcoming'};
function val(obj){return E.normalizeBoard(obj,'Val',now,'78710');}
let b=val({generated_at:new Date((now-600)*1000).toISOString(),
 station:{code:'78710'},trains:[boardRow]});
assert.equal(b.length,1);
assert.equal(b[0].age,600,'Cached response older than embedded age_s cannot pretend fresh');
assert.equal(E.enrichLeg(leg,b,[],[],now).estimated,null);
b=val({generated_at:new Date((now-12)*1000).toISOString(),
 station:{code:'78710'},trains:[boardRow]});
assert.equal(b[0].age,12);
assert.equal(E.enrichLeg(leg,b,[],[],now).estimated,dep+360);
const geo={generated_at:new Date((now-500)*1000).toISOString(),
 features:[{properties:{trip_id:trip,train_number:'77512',line:'R4',
 delay_s:240,age_s:5,stale:false}}]};
const pos=E.normalizePositions(geo,'Val',now);
assert.equal(pos[0].age,500);
assert.equal(E.enrichLeg(leg,[],pos,[],now).estimated,null);
const geoFresh={...geo,generated_at:new Date((now-10)*1000).toISOString()};
const fresh=E.normalizePositions(geoFresh,'Val',now);
assert.equal(fresh[0].age,10);
assert.equal(E.enrichLeg(leg,[],fresh,[],now).estimated,dep+240);
console.log('OK: payload cache obsolete prevents false fresh ETA and train-position delay');
