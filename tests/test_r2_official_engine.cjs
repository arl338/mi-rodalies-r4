'use strict';
const assert=require('node:assert/strict');
const E=require('../engine.js');
const source=require('../data/reference/r2_official_timetable.json');
assert.equal(source.schema,1);
assert.equal(source.services.length,423);
const day='2026-11-16';
const midnight=Date.parse(day+'T00:00:00+01:00')/1000;
const verified={};
for(const line of ['R2N','R2S']){
 for(const direction of ['forward','reverse']){
  const row=source.services.find(t=>t.line===line&&
             t.calendar==='weekday'&&t.direction===direction);
  assert.ok(row,`Missing official ${line} ${direction} source row`);
  const stops=row.stops.map(([code,min])=>[code,midnight+min*60,midnight+min*60]);
  const t={id:'official-'+row.id+'-'+day,n:'',l:line,
           src:'official-r2-pdf',day,s:stops};
  const [first,,last]=[stops[0],stops[1],stops[stops.length-1]];
  const journeys=E.direct([t],first[0],last[0],first[2]-60,first[2]+3600);
  assert.equal(journeys.length,1,`PWA lost official ${line} ${direction} service`);
  const journey=journeys[0];
  assert.equal(journey.depart,first[2]);
  assert.equal(journey.arrive,last[1]);
  assert.equal(journey.legs[0].t.src,'official-r2-pdf');
  const none=E.enrichJourney(journey,[],[],[],first[2]-60);
  assert.equal(none.estimated,null,
    'Official timetable by itself must not manufacture a real-time estimated departure');
  assert.equal(none.live,false,
    'Official timetable without observation must not assert confirmed train position');
  verified[line+'-'+direction]=stops.length;
 }
}
const r2n=source.services.find(t=>t.id==='r2-1-6046');
assert.deepEqual(r2n.stops[0],['79400',297]);
assert.deepEqual(r2n.stops.at(-1),['72400',330]);
const r2s=source.services.find(t=>t.id==='r2-1-6297');
assert.deepEqual(r2s.stops[0],['79400',328]);
assert.deepEqual(r2s.stops.at(-1),['71700',389]);
console.log('Verified official Rodalies R2 Nord/Sud both directions and no fabricated ETA',verified);
