'use strict';
const assert=require('node:assert/strict'),E=require('../engine.js');
const now=Date.parse('2026-11-12T08:00:00Z')/1000,from='78710',to='78805';
function train(id,source,dep,line='R4'){return {id,n:source?'':'77512',l:line,day:'2026-11-12',
 src:source?'trenalia-schedule-only':undefined,s:[[from,dep,dep],[to,dep+1600,dep+1600]]};}
const official=E.direct([train('official',false,now+600)],from,to,now,now+2400);
const supplemental=E.direct([train('alt-duplicate',true,now+600),
 train('alt-new',true,now+1200)],from,to,now,now+2400);
const merged=E.mergeSupplementalJourneys(official,supplemental);
assert.equal(merged.length,2);
assert.equal(merged[0].legs[0].t.id,'official','Official GTFS must win if departure and arrival match');
assert.equal(merged[1].legs[0].t.id,'alt-new');
assert.equal(E.mergeSupplementalJourneys(official,E.direct([
 train('alt-different-line',true,now+600,'R3')],from,to,now,now+2400)).length,2,
 'A service on another line must not be deduplicated');
assert.equal(E.mergeSupplementalJourneys(official,official).length,1,
 'Official services are not copied from supplemental input');
assert.equal(E.mergeSupplementalJourneys([],supplemental).length,2);
const adjacent=E.direct([train('nearby-real-train',true,now+660)],from,to,now,now+2400);
const together=E.mergeSupplementalJourneys(official,adjacent);
assert.equal(together.length,2,'A separate service one minute after GTFS must remain visible');
const differentArrival=E.direct([{...train('same-minute-different-arrival',true,now+600),
 s:[[from,now+600,now+600],[to,now+2400,now+2400]]}],from,to,now,now+2400);
assert.equal(E.mergeSupplementalJourneys(official,differentArrival).length,2,
 'Matching departure but distinct programmed arrival is not proof of duplicate');
console.log('OK: GTFS prioritario, fallback solo para viajes ausentes, sin duplicados ni cruces de línea');
