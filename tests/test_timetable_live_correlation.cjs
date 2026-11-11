'use strict';
const assert=require('node:assert/strict');
const E=require('../engine.js');
const now=Date.parse('2026-11-12T08:00:00Z')/1000;
const day='2026-11-12',from='71801',to='79100';
const dep=now+600;
const payload={date:day,total:2,trains:[{
  feed:'cercanias',operator:'Renfe Cercanías',product:'Cercanías R2N',
  train:null,stops:10,depMs:dep*1000,arrMs:(dep+3600)*1000
},{
  feed:'cercanias',operator:'Renfe Cercanías',product:'Cercanías R2N',
  train:null,stops:10,depMs:(dep+600)*1000,arrMs:(dep+4200)*1000
}]};
const trains=E.normalizeTrenaliaTimetable(payload,from,to,day,'R2N');
assert.equal(trains.length,2);
const journeys=E.direct(trains,from,to,dep-60,dep+900);
assert.equal(journeys.length,2);
const raw=(number,planned,delay=180,opts={})=>({
 trainCode:number,stationCode:from,line:'R2N',plannedTime:planned*1000,
 estimatedTime:(planned+delay)*1000,updatedAt:now*1000,
 timestamp:now*1000,...opts
});
const boards=E.normalizeBoard({updatedAt:now*1000,departures:[raw('12345',dep)]},'Radar',now,from);
assert.equal(boards.length,1);
assert.equal(E.enrichJourney(journeys[0],boards,[],[],now).estimated,null,'No inferred timetable join without correlation');
let result=E.correlateTimetableBoards(journeys,boards);
assert.equal(result[0].linkedByScheduleOnly,true);
let enriched=E.enrichJourney(journeys[0],result,[],[],now);
assert.equal(enriched.estimated,dep+180,'Reliable unique station+line+scheduled time join');
assert.equal(enriched.state,'scheduled','ETA does not establish a real position');
assert.match(enriched.legs[0].proof.join(' '),/identidad del tren no confirmada/);
assert.equal(E.enrichJourney(journeys[1],result,[],[],now).estimated,null,'No bleed to other train');
function matched(objects,js=journeys,nowOverride=now){
 const b=E.normalizeBoard({updatedAt:nowOverride*1000,departures:objects},'Radar',nowOverride,from);
 return E.correlateTimetableBoards(js,b);
}
assert.equal(E.enrichJourney(journeys[0],matched([raw('11111',dep,180),raw('22222',dep,360)]),[],[],now).estimated,null,
 'Two conflicting train numbers at same schedule must cause fallback to theoretical time');
assert.equal(E.enrichJourney(journeys[0],matched([raw('11111',dep,180),raw('11111',dep,240)]),[],[],now).estimated,dep+180,
 'Two sources with identical train number and compatible ETA can enrich');
assert.equal(E.enrichJourney(journeys[0],matched([raw('11111',dep,180),raw('11111',dep,600)]),[],[],now).conflict,true,
 'Conflicting ETA must remain flagged');
assert.equal(E.enrichJourney(journeys[0],matched([raw('11111',dep+120,180)]),[],[],now).estimated,null,
 'More than 60s departure discrepancy is not linkable');
assert.equal(E.enrichJourney(journeys[0],matched([raw('11111',dep,180,{line:'R2S'})]),[],[],now).estimated,null,
 'Must not cross to a wrong line');
assert.equal(E.enrichJourney(journeys[0],matched([raw('11111',dep,180,{stale:true})]),[],[],now).estimated,null,
 'Stale data cannot be used');
assert.equal(E.enrichJourney(journeys[0],matched([raw('11111',dep,180,{timestamp:(now-500)*1000})]),[],[],now).estimated,null,
 'Old source timestamp must not be used');
assert.equal(E.enrichJourney(journeys[0],matched([raw('11111',dep,180,{stationCode:'78710'})]),[],[],now).estimated,null,
 'Wrong station cannot be used');
assert.equal(E.enrichJourney(journeys[0],matched([raw('11111',dep,180,{trainCode:''})]),[],[],now).estimated,null,
 'No train number is not enough for schedule correlation');
const collision=E.direct([...trains,{...trains[0],id:'other'}],from,to,dep-60,dep+900);
assert.equal(E.enrichJourney(collision[0],E.correlateTimetableBoards(collision,boards),[],[],now).estimated,null,
 'Two scheduled services with the same departure time cannot share a board ETA');
assert.equal(E.normalizeBoard({generatedAt:new Date((now-15)*1000).toISOString(),departures:[raw('11111',dep,180,{timestamp:undefined,updatedAt:undefined})]},'Radar',now,from)[0].age,15,
 'generatedAt is valid as a fallback when individual row timestamps are absent');
const parentStale=E.normalizeBoard({stale:true,updatedAt:now*1000,departures:[raw('11111',dep)]},'Radar',now,from);
assert.equal(parentStale[0].stale,true,'Parent stale flag must propagate');
assert.equal(E.enrichJourney(journeys[0],E.correlateTimetableBoards(journeys,parentStale),[],[],now).estimated,null);
console.log('OK: enlace único a horarios anónimos, rechazo de colisiones, fuentes obsoletas, duplicados, hora, parada y línea');
